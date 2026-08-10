// POST /api/stripe/connect-webhook — Stripe Connect webhook handler.
//
// Receives events from the operators' Express connected accounts: the
// dashboard endpoint is created with "Listen to events on connected
// accounts" and carries its own signing secret
// (STRIPE_CONNECT_WEBHOOK_SECRET — see src/lib/stripe.ts). Rental
// checkouts are DIRECT charges on those accounts (fee-only model, see
// /api/admin/inquiries/[id]/payment-link), so their events land HERE
// with `event.account` set to the operator's acct_… id — never on the
// platform endpoint at /api/share-purchase/webhook.
//
// Handles:
//   - checkout.session.completed (+ async_payment_succeeded): verify
//     event.account matches the partner the link was minted for, flip
//     rental_payments pending→paid, flip the inquiry sent→booked (the
//     commission event, per the 0039/0040 transition graph), email
//     customer + operator (team-alert instead when the inquiry was
//     already closed — money on a dead lead is an ops incident, not a
//     booking).
//   - checkout.session.expired: flip rental_payments pending→expired
//     so the admin can mint a fresh link.
//   - checkout.session.async_payment_failed: flip pending→canceled —
//     the session is spent and can never be paid, so leaving the row
//     pending would wedge the admin's re-link path for 24h.
//   - anything else: 200 ack, unrecorded — mirrors the share-purchase
//     default branch so the dedup table isn't poisoned.
//
// Concurrency-idempotent, same shape as the share-purchase webhook:
// stripe_events dedup scoped to endpoint='connect' (migration 0020),
// CHECK first → process → RECORD on success, with status-guarded
// compare-and-sets absorbing concurrent deliveries. Money-state
// writes throw on failure (→ 500, Stripe retries, event unrecorded);
// emails are best-effort by design — there is no fulfilled_at repair
// loop here because unlike share purchases nothing downstream (LLC
// docs, holdings) depends on the emails landing.

import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import type Stripe from "stripe";
import { stripe, STRIPE_CONNECT_WEBHOOK_SECRET } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { partnerInquiryEmail } from "@/lib/partner-contacts";
import {
  partnerFetchers,
  resolveInquiryOperator,
  type InquiryOperatorRef,
} from "@/lib/partner-resolution";
import type { SupabaseClient } from "@supabase/supabase-js";

// Stripe needs the raw body for signature verification. Next.js App
// Router gives us a Request whose .text() returns the raw body
// pre-parse, which is what we want.
export const runtime = "nodejs";

// Local best-effort sender, same pattern as /api/rental-inquiry:
// notifyTeam pins the recipient to the team inbox; confirmations here
// go to the customer and the operator. Never throws.
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM = process.env.RYDA_NOTIFY_FROM ?? "";

async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!resend || !FROM || !args.to) {
    console.log("[connect webhook · email skipped, missing config]", {
      subject: args.subject,
    });
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo || undefined,
    });
    if (error) {
      console.error("[connect webhook · resend]", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[connect webhook · email throw]", e);
    return false;
  }
}

// "No such table" detection — rental_payments arrives with migration
// 0041 (operator-approved). Mirrors /api/rental-inquiry's schema-cache
// fallback.
function isTableMissing(
  error: { message?: string } | null,
  table: string,
): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes(table) &&
    (msg.includes("schema cache") || msg.includes("does not exist"))
  );
}

function fmtUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// Operator inbox for the paid notification: the partners row's
// contact_email when set, else the code-level partner-contacts map
// (which itself falls back to the team inbox — a booking notification
// landing on our own desk beats one sent to an unconfirmed address).
//
// Which operator to read that from is NOT decided here: it goes through
// the one resolver (src/lib/partner-resolution.ts), so a renamed
// operator still gets their own booking notification. The name is only
// consulted for the code-level map, which is still keyed by brand string
// (partner-contacts.ts) — the last name coupling left, and a routing
// fallback rather than an identity lookup.
async function partnerContactEmail(
  admin: SupabaseClient,
  ref: InquiryOperatorRef,
): Promise<string> {
  const resolved = await resolveInquiryOperator<{ contact_email: string | null }>(
    ref,
    partnerFetchers(admin, "contact_email"),
  );
  if (resolved.ok && resolved.partner.contact_email) {
    return resolved.partner.contact_email;
  }
  return partnerInquiryEmail(ref.partner_name ?? null);
}

export async function POST(req: NextRequest) {
  // Same reasoning as the share-purchase webhook (security audit C-4):
  // a 200 with the secret unset would silently swallow every delivery
  // — payments would never flip pending→paid. 503 keeps Stripe
  // retrying AND puts the misconfiguration in our 5xx alerts.
  if (!stripe || !STRIPE_CONNECT_WEBHOOK_SECRET) {
    console.error(
      "[connect webhook] not configured (missing STRIPE_CONNECT_WEBHOOK_SECRET)",
    );
    return NextResponse.json(
      { error: "Webhook backend not configured." },
      { status: 503 },
    );
  }
  const admin = supabaseAdmin();
  if (!admin) {
    console.error("[connect webhook] supabase admin not configured");
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      STRIPE_CONNECT_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[connect webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Event-id dedup, scoped by endpoint (migration 0020): CHECK first,
  // PROCESS, then RECORD on success — recording up-front would lock
  // out Stripe retries when processing 500s. The endpoint filter keeps
  // a misrouted event recorded here from dedup-poisoning the
  // share-purchase or KYC endpoints (and vice versa).
  const seen = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .eq("endpoint", "connect")
    .maybeSingle();
  if (seen.data) {
    console.log("[connect webhook] duplicate event, skipping", event.id, event.type);
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Which operator's account the event came from — set on every
        // Connect delivery. Cross-checked below against the partner
        // the payment link was actually minted for.
        const connectedAccount = event.account ?? null;

        // Defer until the money actually settled (async methods emit
        // `completed` with payment_status 'unpaid' first) — same guard
        // as the share-purchase webhook.
        if (session.payment_status !== "paid") {
          console.log("[connect webhook] checkout completed but payment not settled", {
            session: session.id,
            status: session.payment_status,
            event: event.type,
          });
          break;
        }

        const intentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        // Read the payment row BEFORE any money-state write so the
        // connected-account cross-check can veto a mismatched event.
        const rowRes = await admin
          .from("rental_payments")
          .select("id, inquiry_id, partner_id, status")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();
        if (rowRes.error) {
          if (isTableMissing(rowRes.error, "rental_payments")) {
            // Pre-0041 window: no link could have been minted, so the
            // event can't be ours — but 503 (retry) beats dropping a
            // real payment if the schema is mid-rollout.
            console.error("[connect webhook] rental_payments missing (migration 0041)");
            return NextResponse.json(
              { error: "Payments schema not ready." },
              { status: 503 },
            );
          }
          throw new Error(
            `rental_payments read failed for session ${session.id}: ${rowRes.error.message}`,
          );
        }
        if (!rowRes.data) {
          // Money settled on a session we have no row for. Throw (→
          // 500, unrecorded) rather than ack: recording this event
          // would dedup-poison the retry that could succeed once the
          // row becomes visible, and a payment with no tracking row is
          // exactly what our 5xx alerts should be screaming about.
          throw new Error(
            `no rental_payments row for paid session ${session.id} (event from ${connectedAccount ?? "platform"})`,
          );
        }

        // Defense in depth: this endpoint receives events from EVERY
        // connected account on the platform, but the row's partner
        // pins which account the link was minted on. An event whose
        // account doesn't match must never flip money state — throw
        // (→ 500, unrecorded) so it stays loud and inspectable.
        const partnerAcctRes = await admin
          .from("partners")
          .select("stripe_account_id")
          .eq("id", rowRes.data.partner_id)
          .maybeSingle();
        if (partnerAcctRes.error) {
          throw new Error(
            `partner read failed for payment ${rowRes.data.id}: ${partnerAcctRes.error.message}`,
          );
        }
        const expectedAccount =
          (partnerAcctRes.data?.stripe_account_id as string | null) ?? null;
        if (!connectedAccount || !expectedAccount || connectedAccount !== expectedAccount) {
          throw new Error(
            `connected-account mismatch for session ${session.id}: event from ${
              connectedAccount ?? "platform"
            }, payment ${rowRes.data.id} belongs to ${
              expectedAccount ?? "an account not yet onboarded"
            } — refusing to mark paid`,
          );
        }

        // Atomic compare-and-set: pending→paid in one statement. Only
        // one concurrent delivery wins; the rest fall through to the
        // re-read below. (Session ids are globally unique, and the
        // 0041 trigger makes 'paid' terminal at the DB layer too.)
        const claim = await admin
          .from("rental_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: intentId,
          })
          .eq("stripe_checkout_session_id", session.id)
          .eq("status", "pending")
          .select("id, inquiry_id, partner_id, amount_cents, application_fee_cents")
          .maybeSingle();
        if (claim.error) {
          throw new Error(
            `rental_payments claim failed for session ${session.id}: ${claim.error.message}`,
          );
        }

        // If we lost the race (or this is a redelivery), re-read to
        // decide between "already paid — repair the inquiry flip if a
        // previous delivery died between the two writes" and "not ours".
        let payment = claim.data;
        const freshlyPaid = !!payment;
        if (!payment) {
          const reread = await admin
            .from("rental_payments")
            .select(
              "id, inquiry_id, partner_id, status, amount_cents, application_fee_cents",
            )
            .eq("stripe_checkout_session_id", session.id)
            .maybeSingle();
          if (reread.error) {
            throw new Error(
              `rental_payments reread failed for session ${session.id}: ${reread.error.message}`,
            );
          }
          if (!reread.data) {
            // The pre-claim read saw this row — it cannot vanish.
            throw new Error(
              `rental_payments row disappeared mid-flight for session ${session.id}`,
            );
          }
          if (reread.data.status !== "paid") {
            console.warn("[connect webhook] completed session but payment not paid", {
              session: session.id,
              status: reread.data.status,
            });
            break;
          }
          payment = reread.data;
        }

        const inquiryRes = await admin
          .from("rental_inquiries")
          .select(
            "id, status, name, email, phone, vehicle_label, start_date, end_date, partner_name",
          )
          .eq("id", payment.inquiry_id)
          .maybeSingle();
        if (inquiryRes.error) {
          throw new Error(
            `inquiry read failed for payment ${payment.id}: ${inquiryRes.error.message}`,
          );
        }
        const inquiry = inquiryRes.data;
        if (!inquiry) {
          console.warn("[connect webhook] payment without inquiry", payment.id);
          break;
        }

        // Flip the inquiry sent→booked — the commission event. Status
        // guard respects the 0040-era transition graph: booked/lost
        // are terminal, and a webhook must never rewind a terminal
        // state. Runs on both the fresh-claim and the repair path
        // (CAS makes it a no-op when already booked).
        if (inquiry.status === "sent") {
          const flip = await admin
            .from("rental_inquiries")
            .update({ status: "booked" })
            .eq("id", inquiry.id)
            .eq("status", "sent");
          if (flip.error) {
            // Throw, don't break — the payment row is paid but the
            // pipeline isn't; a 500 keeps Stripe retrying until the
            // repair path above can finish the flip.
            throw new Error(
              `inquiry flip failed for ${inquiry.id}: ${flip.error.message}`,
            );
          }
        } else if (inquiry.status !== "booked") {
          // Money arrived for a lead someone marked lost (or a rewound
          // row). Never overwrite a terminal state from a webhook —
          // flag it for ops instead.
          console.warn("[connect webhook] paid inquiry in unexpected status", {
            inquiry: inquiry.id,
            status: inquiry.status,
          });
        }

        // Emails only on the winning delivery so a Stripe redelivery
        // can't double-send. All best-effort from here down.
        //
        // The "you're booked" emails are ALSO gated on the pipeline
        // agreeing this is a live deal ('sent' — we just flipped it —
        // or already 'booked'). Money landing on a lost/rewound lead
        // must alert the team, not congratulate a customer on a
        // booking nobody intends to honor.
        const pipelineAgrees =
          inquiry.status === "sent" || inquiry.status === "booked";
        if (freshlyPaid && !pipelineAgrees) {
          await notifyTeam({
            subject: `ALERT — payment received on a '${inquiry.status}' lead · ${inquiry.vehicle_label}`,
            html: emailLayout("Payment on a closed lead — action needed", `
              <p>${escapeHtml(inquiry.name)} (${escapeHtml(inquiry.email)}${
                inquiry.phone ? `, ${escapeHtml(inquiry.phone)}` : ""
              }) paid <strong>${escapeHtml(fmtUsd(payment.amount_cents))}</strong> for
              <strong>${escapeHtml(inquiry.vehicle_label)}</strong>,
              ${escapeHtml(inquiry.start_date)} → ${escapeHtml(inquiry.end_date)} —
              but the inquiry is marked <strong>${escapeHtml(inquiry.status)}</strong>.</p>
              <p>No booking-confirmation emails were sent to the customer or the
              operator. The charge settled on the operator's connected account
              (<code>${escapeHtml(connectedAccount ?? "unknown")}</code>, session
              <code>${escapeHtml(session.id)}</code>). If this booking will not be
              honored, arrange a refund from the operator's Stripe dashboard and
              contact the customer.</p>
              <p>Operator: ${escapeHtml(inquiry.partner_name ?? "unknown")}</p>
            `),
          });
        }
        if (freshlyPaid && pipelineAgrees) {
          const amount = fmtUsd(payment.amount_cents);
          const feeAmount = fmtUsd(payment.application_fee_cents);

          await sendEmail({
            to: inquiry.email,
            subject: `Booking confirmed — ${inquiry.vehicle_label}`,
            // Customer replies go to the team inbox, never the operator.
            replyTo: partnerInquiryEmail(null) || undefined,
            html: emailLayout("You're booked", `
              <p style="margin:0 0 12px;">Hi ${escapeHtml(inquiry.name)},</p>
              <p style="margin:0 0 12px;">
                Your payment of <strong>${escapeHtml(amount)}</strong> for the
                <strong>${escapeHtml(inquiry.vehicle_label)}</strong>,
                ${escapeHtml(inquiry.start_date)} to ${escapeHtml(inquiry.end_date)},
                went through. The booking is confirmed.
              </p>
              <p style="margin:0 0 12px;">
                Your operator will reach out directly to coordinate handover
                and delivery details.
              </p>
              <p style="margin:0;">
                Questions before then? Just reply to this email.
              </p>
            `, "Sent by RYDA. Reply to this email to reach the RYDA team."),
          });

          // The payment row's partner_id is the authoritative link (it is
          // the account the charge actually settled on, cross-checked
          // against event.account above); the inquiry's snapshotted name
          // is the legacy fallback.
          const operatorInbox = await partnerContactEmail(admin, {
            partner_id: payment.partner_id ?? null,
            partner_name: inquiry.partner_name ?? null,
          });
          await sendEmail({
            to: operatorInbox,
            subject: `Booking paid · ${inquiry.vehicle_label} · ${inquiry.start_date} → ${inquiry.end_date}`,
            // Operator replies go straight to the customer.
            replyTo: inquiry.email,
            html: emailLayout("Booking paid — coordinate handover", `
              <p style="margin:0 0 12px;">
                <strong>${escapeHtml(inquiry.name)}</strong>
                (<a href="mailto:${escapeHtml(inquiry.email)}" style="color:#DC4747;text-decoration:none;">${escapeHtml(inquiry.email)}</a>${
                  inquiry.phone ? `, ${escapeHtml(inquiry.phone)}` : ""
                }) has paid <strong>${escapeHtml(amount)}</strong> for the
                <strong>${escapeHtml(inquiry.vehicle_label)}</strong>,
                ${escapeHtml(inquiry.start_date)} to ${escapeHtml(inquiry.end_date)}.
              </p>
              <p style="margin:0 0 12px;">
                The payment settled directly to your Stripe account. RYDA's
                referral commission of ${escapeHtml(feeAmount)} was deducted
                automatically as the application fee.
              </p>
              <p style="margin:0;">
                Please reach out to the customer to coordinate handover —
                <strong>hit reply</strong> and it goes straight to them.
              </p>
            `, "Sent by RYDA. Reply to this email to reach your customer directly."),
          });

          await notifyTeam({
            subject: `Rental booked · ${inquiry.vehicle_label} · ${feeAmount} commission`,
            html: emailLayout("Rental booking paid", `
              <p>${escapeHtml(inquiry.name)} (${escapeHtml(inquiry.email)}) paid
              <strong>${escapeHtml(amount)}</strong> for
              <strong>${escapeHtml(inquiry.vehicle_label)}</strong>,
              ${escapeHtml(inquiry.start_date)} → ${escapeHtml(inquiry.end_date)}.</p>
              <p>RYDA commission (application fee): <strong>${escapeHtml(feeAmount)}</strong></p>
              <p>Operator: ${escapeHtml(inquiry.partner_name ?? "unknown")}</p>
              <p>Stripe session: <code>${escapeHtml(session.id)}</code>
              ${connectedAccount ? ` on <code>${escapeHtml(connectedAccount)}</code>` : ""}</p>
            `),
          });
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Status guard: only a pending link can expire — the 0041
        // trigger would reject un-paying a paid row anyway, and the
        // guard keeps an out-of-order replay from even trying.
        const expire = await admin
          .from("rental_payments")
          .update({ status: "expired" })
          .eq("stripe_checkout_session_id", session.id)
          .eq("status", "pending");
        if (expire.error && !isTableMissing(expire.error, "rental_payments")) {
          throw new Error(
            `rental_payments expire failed for session ${session.id}: ${expire.error.message}`,
          );
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // An async payment (ACH debit etc.) completed Checkout but
        // then failed to settle. The session is spent — it can never
        // be paid again — so a row left 'pending' would wedge: the
        // payment-link route's idempotency window would keep handing
        // out the dead link until the 24h cutoff lapsed. Flip
        // pending→canceled (a legal transition under the 0041
        // trigger) so the admin can mint a fresh link immediately.
        const cancel = await admin
          .from("rental_payments")
          .update({ status: "canceled" })
          .eq("stripe_checkout_session_id", session.id)
          .eq("status", "pending");
        if (cancel.error && !isTableMissing(cancel.error, "rental_payments")) {
          throw new Error(
            `rental_payments cancel failed for session ${session.id}: ${cancel.error.message}`,
          );
        }
        break;
      }

      default:
        // Not an event we subscribe to; ack quietly AND skip recording
        // so we don't poison the per-endpoint dedup table for an event
        // that doesn't belong here (mirrors the share-purchase branch).
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    console.error("[connect webhook handler]", err);
    // Don't record the event — we want Stripe to retry. The seen-check
    // above will let the retry through.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  // Record so retries dedup. For 23505 (parallel-delivery race) we
  // still return 200 — the other delivery already succeeded.
  const recorded = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, endpoint: "connect" });
  if (recorded.error) {
    const code = (recorded.error as { code?: string }).code;
    if (code !== "23505") {
      console.warn("[connect webhook] event-record insert failed", recorded.error);
    }
  }
  return NextResponse.json({ received: true });
}
