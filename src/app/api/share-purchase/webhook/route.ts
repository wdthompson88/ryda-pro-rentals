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
// Idempotent: re-delivery of a completed event finds the row already
// 'paid' and short-circuits without double-inserting holdings.

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const purchaseId = session.metadata?.purchaseId;
        if (!purchaseId) {
          console.warn("[stripe webhook] no purchaseId in metadata", session.id);
          break;
        }

        // Idempotency: if already paid, no-op.
        const existing = await admin
          .from("share_purchases")
          .select("id, status, user_id, vehicle_symbol, boat_slug, shares, email, name")
          .eq("id", purchaseId)
          .single();
        if (existing.error || !existing.data) {
          console.error("[stripe webhook] purchase not found", purchaseId);
          break;
        }
        if (existing.data.status === "paid" || existing.data.status === "closed") {
          break;
        }

        await admin
          .from("share_purchases")
          .update({
            status: "paid",
            stripe_payment_intent_id: typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", purchaseId);

        // Create the holdings row(s). Each share is one row so transfers
        // can target individual shares later. Cap at 10 just in case.
        const sharesToCreate = Math.min(10, Math.max(1, existing.data.shares));
        const rows = Array.from({ length: sharesToCreate }, () => ({
          user_id: existing.data.user_id,
          vehicle_symbol: existing.data.vehicle_symbol,
          boat_slug: existing.data.boat_slug,
          shares: 1,
          purchase_id: existing.data.id,
        }));
        const { error: holdingsErr } = await admin.from("share_holdings").insert(rows);
        if (holdingsErr) {
          console.error("[stripe webhook] failed to insert holdings", holdingsErr);
        }

        // Notify the team. Resend no-ops cleanly if the env isn't
        // wired so this is safe in preview deploys.
        const assetLabel = existing.data.vehicle_symbol ?? existing.data.boat_slug;
        await notifyTeam({
          subject: `New share purchase · ${assetLabel}`,
          html: emailLayout(
            "Share purchase confirmed",
            `
              <p>${escapeHtml(existing.data.name)} (${escapeHtml(existing.data.email)}) just claimed
              <strong>${existing.data.shares} share${existing.data.shares > 1 ? "s" : ""}</strong>
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
        // PDF / email failure can't break the main webhook flow.
        try {
          const v = existing.data.vehicle_symbol
            ? VEHICLES.find((x) => x.symbol === existing.data.vehicle_symbol)
            : null;
          const b = existing.data.boat_slug
            ? BOATS.find((x) => x.slug === existing.data.boat_slug)
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

          const pdfBuffer = await renderAmendmentPdf({
            purchaseId,
            memberName: existing.data.name,
            memberEmail: existing.data.email,
            shares: existing.data.shares,
            assetLabel: assetDisplay,
            llcName,
            effectiveDate: new Date().toISOString().slice(0, 10),
            totalAmount,
          });

          // Persist the amendment record before email so we can audit
          // even if the email send itself fails.
          const { data: amendmentRow } = await admin
            .from("llc_amendments")
            .insert({
              purchase_id: purchaseId,
              user_id: existing.data.user_id,
              document_type: "member_register_amendment",
              vehicle_symbol: existing.data.vehicle_symbol,
              boat_slug: existing.data.boat_slug,
              shares: existing.data.shares,
              member_name: existing.data.name,
              member_email: existing.data.email,
              email_attempted_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          // Send to the buyer with the PDF attached. Resend supports
          // attachments natively. From + to are validated on the
          // RYDA notify config.
          const resendKey = process.env.RESEND_API_KEY;
          const from = process.env.RYDA_NOTIFY_FROM;
          if (resendKey && from) {
            const resend = new Resend(resendKey);
            const { error: emailError } = await resend.emails.send({
              from,
              to: existing.data.email,
              subject: `Welcome to ${llcName} — your share is recorded`,
              html: emailLayout(
                "Your co-ownership is confirmed",
                `
                  <p>${escapeHtml(existing.data.name)},</p>
                  <p>Your ${existing.data.shares} share${existing.data.shares > 1 ? "s" : ""} of
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
            } else if (emailError) {
              console.error("[stripe webhook] amendment email failed", emailError);
            }
          } else {
            console.log("[stripe webhook] resend not configured, amendment email skipped");
          }
        } catch (pdfErr) {
          console.error("[stripe webhook] amendment PDF / email failed", pdfErr);
          // Don't propagate — purchase already paid, team will follow up.
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
        await admin
          .from("share_purchases")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", intent.id);
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
