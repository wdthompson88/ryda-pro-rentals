// POST /api/share-purchase/webhook — Stripe webhook handler.
//
// Verifies the signature against STRIPE_WEBHOOK_SECRET, then handles:
//   - checkout.session.completed: flip share_purchases.status to 'paid'
//     and create a share_holdings row so member pages immediately reflect
//     the purchase. Email the team + the buyer.
//   - checkout.session.expired:   flip status to 'canceled'.
//   - payment_intent.payment_failed: flip status to 'failed' (for the
//     rare card-decline + retry case).
//
// Concurrency-idempotent (see migration 0013):
//   1. Atomic compare-and-set claims the right to fulfill: the row is
//      flipped pending→paid in a single statement; only one concurrent
//      delivery gets a non-empty result.
//   2. Holdings + amendments are upserted with ignoreDuplicates against
//      unique indexes on (purchase_id, share_index) and (purchase_id,
//      document_type), so even if the atomic gate is bypassed (manual
//      status change, etc.) we can't double-insert.
//   3. fulfilled_at stamps the purchase at the end of the success path.
//      A redelivery that finds status='paid' AND fulfilled_at IS NULL
//      repairs partial fulfillment by re-running the side-effects.

import { NextResponse, type NextRequest } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { renderAmendmentPdf } from "@/lib/llc-amendment-pdf";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import { Resend } from "resend";
import type Stripe from "stripe";

// Stripe needs the raw body for signature verification. Next.js App
// Router gives us a Request whose .text() returns the raw body
// pre-parse, which is what we want.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.warn("[stripe webhook] not configured, ignoring");
    return NextResponse.json({ received: true }, { status: 200 });
  }
  const admin = supabaseAdmin();
  if (!admin) {
    console.warn("[stripe webhook] supabase admin not configured");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Event-id dedup. The PRIMARY KEY conflict on stripe_events is the
  // dedup signal: insert succeeds → first time seeing this event,
  // proceed; insert fails with unique-violation → already processed,
  // ack quietly. This is belt-and-suspenders alongside the status-
  // guarded compare-and-sets below — Stripe's recommended pattern.
  const dedup = await admin
    .from("stripe_events")
    .insert({
      id: event.id,
      type: event.type,
      endpoint: "share-purchase",
    });
  if (dedup.error) {
    // 23505 = unique_violation. Anything else is unexpected; log and
    // continue rather than fail the webhook (a bad write here
    // shouldn't cause Stripe to retry forever).
    const code = (dedup.error as { code?: string }).code;
    if (code === "23505") {
      console.log("[stripe webhook] duplicate event, skipping", event.id, event.type);
      return NextResponse.json({ received: true, deduped: true });
    }
    console.warn("[stripe webhook] dedup insert failed (non-fatal)", dedup.error);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const purchaseId = session.metadata?.purchaseId;
        if (!purchaseId) {
          console.warn("[stripe webhook] no purchaseId in metadata", session.id);
          break;
        }

        // ACH (us_bank_account) Checkout sessions emit
        // checkout.session.completed BEFORE the bank actually settles
        // — payment_status is 'unpaid' until settlement, then a
        // separate checkout.session.async_payment_succeeded fires.
        // Card payments emit completed with payment_status='paid' in
        // the same event. Defer fulfillment until payment_status is
        // 'paid' so we don't mint shares + send the LLC amendment
        // email on an ACH that may still bounce.
        if (session.payment_status !== "paid") {
          console.log("[stripe webhook] checkout completed but payment not settled", {
            session: session.id,
            status: session.payment_status,
            event: event.type,
          });
          break;
        }

        const intentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

        // Atomic compare-and-set: flip status to 'paid' in a single
        // statement. Only one concurrent delivery wins this update;
        // the others get an empty result and fall through to the
        // partial-fulfillment repair check below.
        // We accept the transition from BOTH 'pending' AND 'failed'
        // as eligible. The 'failed' path is the self-heal for
        // out-of-order Stripe events: if async_payment_failed raced
        // ahead and stamped the row as failed, but a successful
        // settlement event then arrives, we want to recover the
        // member's purchase rather than leave them stuck. (Stripe
        // doesn't formally guarantee event ordering across retries.)
        // Capture the Stripe Customer id from the session so the
        // billing portal route can mint a portal URL against the same
        // customer later. Field is optional on the session.
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const claim = await admin
          .from("share_purchases")
          .update({
            status: "paid",
            stripe_payment_intent_id: intentId,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", purchaseId)
          .in("status", ["pending", "failed"])
          .select(
            "id, status, user_id, vehicle_symbol, boat_slug, shares, email, name, fulfilled_at",
          )
          .maybeSingle();

        // If we lost the race, re-read so we can decide between
        // "already fulfilled, no-op" and "partial fulfillment, repair."
        let purchase = claim.data;
        if (!purchase) {
          const reread = await admin
            .from("share_purchases")
            .select(
              "id, status, user_id, vehicle_symbol, boat_slug, shares, email, name, fulfilled_at",
            )
            .eq("id", purchaseId)
            .single();
          if (reread.error || !reread.data) {
            console.error("[stripe webhook] purchase not found", purchaseId);
            break;
          }
          purchase = reread.data;
          // If we didn't claim AND the row is still pending, something
          // else updated it (operator?) but to a non-paid status —
          // surface the warning and skip side-effects.
          if (purchase.status !== "paid") {
            console.warn(
              "[stripe webhook] checkout.completed but purchase not paid",
              { purchaseId, status: purchase.status },
            );
            break;
          }
        }

        // Already fulfilled (this redelivery has nothing to do).
        if (purchase.fulfilled_at) {
          break;
        }

        // From here we are the canonical fulfiller for this purchase.
        // Either we won the atomic claim (fresh paid), or we're
        // repairing a previous delivery that flipped status='paid' but
        // failed before finishing side-effects. Both paths use the
        // same idempotent upserts.

        // Holdings: one row per share, indexed 1..N. Unique index on
        // (purchase_id, share_index) makes upsert with ignoreDuplicates
        // a true no-op on redelivery.
        const sharesToCreate = Math.min(10, Math.max(1, purchase.shares));
        const rows = Array.from({ length: sharesToCreate }, (_, i) => ({
          user_id: purchase!.user_id,
          vehicle_symbol: purchase!.vehicle_symbol,
          boat_slug: purchase!.boat_slug,
          shares: 1,
          purchase_id: purchase!.id,
          share_index: i + 1,
        }));
        const { error: holdingsErr } = await admin
          .from("share_holdings")
          .upsert(rows, {
            onConflict: "purchase_id,share_index",
            ignoreDuplicates: true,
          });
        if (holdingsErr) {
          console.error("[stripe webhook] failed to upsert holdings", holdingsErr);
          // Don't stamp fulfilled_at; this delivery will retry on
          // redrive. Bail out of fulfillment for now.
          break;
        }

        // Notify the team. Resend no-ops cleanly if the env isn't
        // wired so this is safe in preview deploys.
        const assetLabel = purchase.vehicle_symbol ?? purchase.boat_slug;
        await notifyTeam({
          subject: `New share purchase · ${assetLabel}`,
          html: emailLayout(
            "Share purchase confirmed",
            `
              <p>${escapeHtml(purchase.name)} (${escapeHtml(purchase.email)}) just claimed
              <strong>${purchase.shares} share${purchase.shares > 1 ? "s" : ""}</strong>
              of <strong>${escapeHtml(String(assetLabel))}</strong>.</p>
              <p>Purchase ID: <code>${escapeHtml(purchaseId)}</code></p>
              <p>Stripe session: <code>${escapeHtml(session.id)}</code></p>
            `,
          ),
        });

        // Generate + email the LLC member-register amendment PDF to
        // the buyer. Best-effort: a failure here doesn't roll back
        // the purchase; the team gets a follow-up notification and
        // can resend manually. Whole block is wrapped in a try so a
        // PDF / email failure can't break the main webhook flow. We
        // only stamp fulfilled_at when the inner block succeeds —
        // a redelivery will repair an email-only failure.
        let amendmentSent = false;
        try {
          const v = purchase.vehicle_symbol
            ? VEHICLES.find((x) => x.symbol === purchase!.vehicle_symbol)
            : null;
          const b = purchase.boat_slug
            ? BOATS.find((x) => x.slug === purchase!.boat_slug)
            : null;
          const assetDisplay = v
            ? `${v.year} ${v.name}`
            : b
              ? `${b.year} ${b.name}`
              : String(assetLabel ?? "");
          const llcName = v
            ? `RYDA ${v.symbol} LLC`
            : b
              ? `RYDA ${b.slug.toUpperCase()} LLC`
              : "RYDA LLC";
          const totalAmount = Number(session.amount_total ?? 0) / 100;

          // Idempotent amendment row: unique on (purchase_id,
          // document_type). Upsert with returning so we get the row
          // whether it existed already or we just created it.
          const { data: amendmentRow, error: amendmentErr } = await admin
            .from("llc_amendments")
            .upsert(
              {
                purchase_id: purchaseId,
                user_id: purchase.user_id,
                document_type: "member_register_amendment",
                vehicle_symbol: purchase.vehicle_symbol,
                boat_slug: purchase.boat_slug,
                shares: purchase.shares,
                member_name: purchase.name,
                member_email: purchase.email,
                email_attempted_at: new Date().toISOString(),
              },
              {
                onConflict: "purchase_id,document_type",
                ignoreDuplicates: false,
              },
            )
            .select("id, emailed")
            .single();
          if (amendmentErr) {
            console.error("[stripe webhook] amendment upsert failed", amendmentErr);
            throw amendmentErr;
          }

          // If a prior delivery already marked emailed=true, skip the
          // PDF render + send and treat fulfillment as complete.
          if (amendmentRow?.emailed) {
            amendmentSent = true;
          } else {
            const pdfBuffer = await renderAmendmentPdf({
              purchaseId,
              memberName: purchase.name,
              memberEmail: purchase.email,
              shares: purchase.shares,
              assetLabel: assetDisplay,
              llcName,
              effectiveDate: new Date().toISOString().slice(0, 10),
              totalAmount,
            });

            // Send to the buyer with the PDF attached. Resend supports
            // attachments natively. From + to are validated on the
            // RYDA notify config.
            const resendKey = process.env.RESEND_API_KEY;
            const from = process.env.RYDA_NOTIFY_FROM;
            if (resendKey && from) {
              const resend = new Resend(resendKey);
              const { error: emailError } = await resend.emails.send({
                from,
                to: purchase.email,
                subject: `Welcome to ${llcName} — your share is recorded`,
                html: emailLayout(
                  "Your co-ownership is confirmed",
                  `
                    <p>${escapeHtml(purchase.name)},</p>
                    <p>Your ${purchase.shares} share${purchase.shares > 1 ? "s" : ""} of
                    <strong>${escapeHtml(assetDisplay)}</strong> are recorded
                    in <strong>${escapeHtml(llcName)}</strong>'s member register.
                    The amendment to the LLC's Operating Agreement is attached
                    to this email for your records.</p>
                    <p>What happens next:</p>
                    <ul>
                      <li>Your member-area dashboard now shows the asset.</li>
                      <li>You can book your first session immediately.</li>
                      <li>The team will be in touch within 1 business day to walk
                      through onboarding.</li>
                    </ul>
                    <p>Reference: <code>${escapeHtml(purchaseId)}</code></p>
                  `,
                ),
                attachments: [
                  {
                    filename: `${llcName.replace(/\s+/g, "-")}-amendment.pdf`,
                    content: pdfBuffer,
                  },
                ],
              });
              if (!emailError && amendmentRow) {
                await admin
                  .from("llc_amendments")
                  .update({ emailed: true })
                  .eq("id", amendmentRow.id);
                amendmentSent = true;
              } else if (emailError) {
                console.error("[stripe webhook] amendment email failed", emailError);
              }
            } else {
              console.log("[stripe webhook] resend not configured, amendment email skipped");
              // Treat as fulfilled — no email backend means the team
              // will manually send the amendment. Don't loop forever.
              amendmentSent = true;
            }
          }
        } catch (pdfErr) {
          console.error("[stripe webhook] amendment PDF / email failed", pdfErr);
          // Don't propagate — purchase already paid, team will follow up.
          // amendmentSent stays false; we won't stamp fulfilled_at, so
          // a redelivery (or manual replay) repairs.
        }

        // Stamp fulfilled_at only when holdings + amendment succeeded.
        if (amendmentSent) {
          await admin
            .from("share_purchases")
            .update({ fulfilled_at: new Date().toISOString() })
            .eq("id", purchaseId)
            .is("fulfilled_at", null);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const purchaseId = session.metadata?.purchaseId;
        if (!purchaseId) break;
        await admin
          .from("share_purchases")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", purchaseId)
          .eq("status", "pending");
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        // Look up by payment_intent_id rather than metadata, since
        // Stripe doesn't always copy session metadata onto the intent.
        // Status guard: only flip pending→failed. Without this, an
        // out-of-order replay arriving after a successful settlement
        // would stomp a paid+fulfilled row back to failed (Stripe
        // doesn't guarantee event ordering across retries).
        await admin
          .from("share_purchases")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", intent.id)
          .eq("status", "pending");
        break;
      }

      case "checkout.session.async_payment_failed": {
        // ACH Checkout flow — bank refused the debit (insufficient
        // funds, account closed). Mark purchase as failed so the
        // member sees the right state on the tracker page; team
        // can reach out via the notify pipe if needed.
        // Status guard same reasoning as above — never stomp a row
        // that's already paid (Stripe ordering is best-effort).
        const session = event.data.object as Stripe.Checkout.Session;
        const purchaseId = session.metadata?.purchaseId;
        if (!purchaseId) break;
        await admin
          .from("share_purchases")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", purchaseId)
          .eq("status", "pending");
        break;
      }

      default:
        // We don't subscribe to other events; ignore quietly.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook handler]", err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
