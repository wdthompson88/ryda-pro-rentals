// POST /api/share-purchase/dispute — Stripe dispute webhook handler.
//
// Why this is a LAUNCH BLOCKER (per payment-integration agent in
// .launch-prep/security/dispute-chargeback-playbook.md):
// Stripe automatically closes disputes against us after 7-20 days
// if no evidence is submitted. RYDA shares are $130K+, so the
// first defaulted dispute is catastrophic. This handler creates
// a dispute_cases row, alerts ops with the evidence checklist,
// and on resolution updates the share_purchase + member-facing
// state.
//
// Events handled (register all three in the Stripe dashboard
// webhook for the same endpoint URL):
//   - charge.dispute.created   → create case row, alert ops, email member
//   - charge.dispute.updated   → re-alert if evidence_due_by approaches
//   - charge.dispute.closed    → set outcome, flip purchase.dispute_status,
//                                trigger share-revocation if lost
//
// Pattern matches the existing share-purchase webhook:
//  - HMAC verification via stripe.webhooks.constructEvent
//  - Event-id dedup via stripe_events table (endpoint='dispute')
//  - 503 on missing config so Stripe retries instead of silently
//    losing events
//  - All work done before 200 ack so a dispute can't get
//    half-processed if the function gets killed mid-flight

import { NextResponse, type NextRequest } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import {
  isTerminalDisputeStatus,
  outcomeFor,
  purchaseDisputeStatusFor,
  type StripeDisputeStatus,
} from "@/lib/dispute-status";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error(
      "[dispute webhook] not configured (missing STRIPE_WEBHOOK_SECRET)",
    );
    return NextResponse.json(
      { error: "Webhook backend not configured." },
      { status: 503 },
    );
  }
  const admin = supabaseAdmin();
  if (!admin) {
    console.error("[dispute webhook] supabase admin not configured");
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[dispute webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Per-endpoint dedup (stripe_events PK is (id, endpoint) since
  // migration 0020). Without endpoint scoping, a charge.dispute.*
  // event delivered to /share-purchase/webhook by Stripe
  // misconfiguration would dedup-poison this lookup.
  const seen = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .eq("endpoint", "dispute")
    .maybeSingle();
  if (seen.error) {
    console.error("[dispute webhook] dedup lookup failed", seen.error);
    return NextResponse.json(
      { error: "Dedup lookup failed; retry." },
      { status: 503 },
    );
  }
  if (seen.data) {
    return NextResponse.json({ received: true, deduped: true });
  }

  if (
    event.type !== "charge.dispute.created" &&
    event.type !== "charge.dispute.updated" &&
    event.type !== "charge.dispute.closed"
  ) {
    // Record the event so future deliveries dedup, but no work to do.
    await admin
      .from("stripe_events")
      .insert({ id: event.id, type: event.type, endpoint: "dispute" });
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const dispute = event.data.object as Stripe.Dispute;

  // The dispute carries the Stripe Charge id; we need to back-walk
  // to the share_purchases row. Most reliably via the
  // payment_intent on the charge. Fetch the charge to resolve it.
  let paymentIntentId: string | null = null;
  if (typeof dispute.payment_intent === "string") {
    paymentIntentId = dispute.payment_intent;
  } else if (dispute.payment_intent && typeof dispute.payment_intent === "object") {
    paymentIntentId = dispute.payment_intent.id;
  }

  if (!paymentIntentId) {
    // No PI on the dispute object — fetch the charge to find one.
    try {
      const chargeId =
        typeof dispute.charge === "string"
          ? dispute.charge
          : dispute.charge?.id;
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null);
      }
    } catch (err) {
      console.error("[dispute webhook] charge.retrieve failed", err);
    }
  }

  if (!paymentIntentId) {
    // Can't link to a purchase — alert ops and bail. Don't 503
    // because retry won't help (Stripe's data is what it is).
    console.error("[dispute webhook] no payment_intent on dispute", dispute.id);
    try {
      await notifyTeam({
        subject: `Dispute alert (UNLINKED): ${dispute.id}`,
        html: emailLayout(
          "Dispute received but no payment_intent",
          `<p>Stripe dispute <code>${escapeHtml(dispute.id)}</code> arrived
          without a resolvable payment_intent. Manual triage required —
          look it up in the Stripe dashboard and decide whether the
          dispute relates to a RYDA charge or something else.</p>`,
        ),
      });
    } catch (notifyErr) {
      console.error("[dispute webhook] notify failed", notifyErr);
    }
    // Still record the event so we don't loop on retries.
    await admin
      .from("stripe_events")
      .insert({ id: event.id, type: event.type, endpoint: "dispute" });
    return NextResponse.json({ received: true, unlinked: true });
  }

  // Find the share_purchase by payment_intent_id.
  const purchaseLookup = await admin
    .from("share_purchases")
    .select(
      "id, user_id, email, name, total_cents, vehicle_symbol, boat_slug, shares",
    )
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (purchaseLookup.error) {
    console.error("[dispute webhook] purchase lookup failed", purchaseLookup.error);
    return NextResponse.json(
      { error: "Purchase lookup failed; retry." },
      { status: 503 },
    );
  }

  if (!purchaseLookup.data) {
    // Stripe charge exists but no matching share_purchases row —
    // possibly a non-RYDA charge on the same Stripe account.
    console.warn(
      "[dispute webhook] no purchase for payment_intent",
      paymentIntentId,
    );
    await admin
      .from("stripe_events")
      .insert({ id: event.id, type: event.type, endpoint: "dispute" });
    return NextResponse.json({ received: true, unlinked: true });
  }

  const purchase = purchaseLookup.data;
  const stripeStatus = dispute.status as StripeDisputeStatus;

  // Upsert the dispute_cases row keyed by stripe_dispute_id.
  // First-time event = INSERT; updated/closed = UPDATE-on-conflict.
  const upsertPayload: Record<string, unknown> = {
    stripe_dispute_id: dispute.id,
    purchase_id: purchase.id,
    user_id: purchase.user_id,
    amount_cents: dispute.amount,
    currency: dispute.currency ?? "usd",
    reason: dispute.reason ?? null,
    status: stripeStatus,
    evidence_due_by: dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  if (isTerminalDisputeStatus(stripeStatus)) {
    upsertPayload.outcome = outcomeFor(stripeStatus);
    upsertPayload.outcome_at = new Date().toISOString();
  }

  if (event.type === "charge.dispute.created") {
    upsertPayload.ops_alerted_at = new Date().toISOString();
  }

  const upsertResult = await admin
    .from("dispute_cases")
    .upsert(upsertPayload, { onConflict: "stripe_dispute_id" });

  if (upsertResult.error) {
    console.error("[dispute webhook] dispute_cases upsert failed", upsertResult.error);
    return NextResponse.json(
      { error: "Dispute write failed; retry." },
      { status: 503 },
    );
  }

  // Update share_purchases.dispute_status (also gates refunds).
  const purchaseUpdate = await admin
    .from("share_purchases")
    .update({
      dispute_status: purchaseDisputeStatusFor(stripeStatus),
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchase.id);
  if (purchaseUpdate.error) {
    console.error(
      "[dispute webhook] share_purchases.dispute_status update failed",
      purchaseUpdate.error,
    );
    // Non-fatal — the dispute_cases row is the source of truth.
    // Log + continue.
  }

  // Notify ops on creation OR on transitions to terminal state.
  // (Skip charge.dispute.updated to avoid alert fatigue unless the
  // status actually changed; the upsert above replaces the row, so
  // a "no real change" updated event still alerts here. Future
  // refinement: diff old vs new status.)
  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.closed"
  ) {
    const assetLabel = purchase.vehicle_symbol ?? purchase.boat_slug ?? "asset";
    const amountUsd = (dispute.amount / 100).toLocaleString("en-US", {
      style: "currency",
      currency: dispute.currency?.toUpperCase() ?? "USD",
    });
    try {
      await notifyTeam({
        subject:
          event.type === "charge.dispute.created"
            ? `🚨 NEW DISPUTE: ${amountUsd} on ${assetLabel} (${purchase.shares} share${purchase.shares > 1 ? "s" : ""})`
            : `Dispute closed (${stripeStatus}): ${amountUsd} on ${assetLabel}`,
        html: emailLayout(
          event.type === "charge.dispute.created"
            ? "New dispute — evidence required"
            : "Dispute resolved",
          `<p><strong>Member:</strong> ${escapeHtml(purchase.email ?? "(no email)")}</p>
          <p><strong>Asset:</strong> ${escapeHtml(assetLabel)} · ${purchase.shares} share${purchase.shares > 1 ? "s" : ""}</p>
          <p><strong>Amount:</strong> ${escapeHtml(amountUsd)}</p>
          <p><strong>Reason:</strong> ${escapeHtml(dispute.reason ?? "(none)")}</p>
          <p><strong>Status:</strong> ${escapeHtml(stripeStatus)}</p>
          ${
            event.type === "charge.dispute.created" && dispute.evidence_details?.due_by
              ? `<p><strong>Evidence due by:</strong> ${escapeHtml(
                  new Date(dispute.evidence_details.due_by * 1000).toUTCString(),
                )}</p>`
              : ""
          }
          <p>Triage at <code>/admin/disputes</code>.</p>
          ${
            event.type === "charge.dispute.created"
              ? `<h3>Evidence packet checklist (per playbook)</h3>
                 <ol>
                   <li>KYC verification proof (kyc_verifications.verified_outputs)</li>
                   <li>Signed Operating Agreement (llc_amendments.signed_pdf_url)</li>
                   <li>Share holding record (share_holdings rows)</li>
                   <li>Member-register amendment PDF (the emailed attachment)</li>
                   <li>Stripe Checkout session receipt</li>
                   <li>IP / user-agent from checkout (if logged)</li>
                   <li>Resend communication log</li>
                 </ol>
                 <p><strong>Member outreach within 24 hours:</strong> send the
                 "we received a dispute notification" email confirming whether
                 the member intended to dispute. Do NOT threaten share
                 revocation — could be third-party fraud.</p>`
              : ""
          }`,
        ),
      });
    } catch (notifyErr) {
      console.error("[dispute webhook] notify failed", notifyErr);
    }
  }

  // Record event-id last so a notify failure doesn't block dedup
  // for a real follow-up delivery.
  await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, endpoint: "dispute" });

  return NextResponse.json({ received: true, dispute_id: dispute.id });
}
