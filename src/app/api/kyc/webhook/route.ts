// POST /api/kyc/webhook — Stripe webhook for Identity verifications.
// Listens for:
//   - identity.verification_session.verified
//   - identity.verification_session.processing
//   - identity.verification_session.requires_input
//   - identity.verification_session.canceled
//
// Stripe assigns ONE signing secret per webhook endpoint. If KYC events
// are mounted on a separate Stripe endpoint than the share-purchase
// events, they have different `whsec_…` values and reusing the wrong
// one will 400 every event. We read STRIPE_KYC_WEBHOOK_SECRET first;
// it falls back to STRIPE_WEBHOOK_SECRET so a single-endpoint setup
// (one Stripe endpoint with both event groups, dispatched server-side)
// keeps working with one env var. See SETUP.md §3.2.

import { NextResponse, type NextRequest } from "next/server";
import { stripe, STRIPE_KYC_WEBHOOK_SECRET } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_KYC_WEBHOOK_SECRET) {
    return NextResponse.json({ received: true });
  }
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ received: true });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_KYC_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[kyc webhook] signature failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Filter to KYC events FIRST so we don't poison the dedup table
  // for non-KYC events that happened to hit this endpoint. Codex
  // round-3 catch.
  if (!event.type.startsWith("identity.verification_session.")) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  // Event-id dedup, scoped by endpoint (migration 0020). Without the
  // endpoint filter, a share-purchase event recorded with
  // endpoint='share-purchase' could dedup-poison this lookup.
  const seen = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .eq("endpoint", "kyc")
    .maybeSingle();
  if (seen.data) {
    return NextResponse.json({ received: true, deduped: true });
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const status =
    event.type === "identity.verification_session.verified"
      ? "verified"
      : event.type === "identity.verification_session.processing"
        ? "processing"
        : event.type === "identity.verification_session.canceled"
          ? "canceled"
          : event.type === "identity.verification_session.requires_input"
            ? "requires_action"
            : null;
  if (!status) return NextResponse.json({ received: true });

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "verified" && session.verified_outputs) {
    // Stripe redacts most fields by default; what comes through is
    // the address + DOB + name proofs the verification produced.
    update.verified_outputs = session.verified_outputs;
  }
  if (session.last_error) {
    update.failure_code = session.last_error.code ?? null;
    update.failure_reason = session.last_error.reason ?? null;
  }

  // CAS guard: don't allow a stale/late-delivered 'processing' or
  // 'requires_action' event to clobber a row already at 'verified'.
  // Stripe doesn't guarantee event order across retries, so an old
  // 'processing' event could land after the 'verified' event for the
  // same session. The terminal-state guard ensures verified stays
  // verified. We allow 'verified' to be set from any prior status,
  // and 'canceled' to land from any non-verified status. Claude
  // round-2 catch.
  let q = admin
    .from("kyc_verifications")
    .update(update)
    .eq("stripe_verification_id", session.id);
  if (status !== "verified" && status !== "canceled") {
    // Don't downgrade verified rows; only update if not already verified.
    q = q.neq("status", "verified");
  } else if (status === "canceled") {
    // Don't cancel a verified row (cancellation should only land
    // before/during processing, not after verification).
    q = q.neq("status", "verified");
  }
  const { error } = await q;

  if (error) {
    console.error("[kyc webhook] update failed", error);
    // Don't record the event so Stripe retries reach us.
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  // Record on success only.
  const recorded = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, endpoint: "kyc" });
  if (recorded.error) {
    const code = (recorded.error as { code?: string }).code;
    if (code !== "23505") {
      console.warn("[kyc webhook] event-record insert failed", recorded.error);
    }
  }

  return NextResponse.json({ received: true });
}
