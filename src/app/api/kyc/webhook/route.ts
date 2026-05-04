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

  // Event-id dedup (same pattern as the share-purchase webhook).
  const dedup = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, endpoint: "kyc" });
  if (dedup.error) {
    const code = (dedup.error as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.warn("[kyc webhook] dedup insert failed (non-fatal)", dedup.error);
  }

  // Only Identity events are interesting here.
  if (!event.type.startsWith("identity.verification_session.")) {
    return NextResponse.json({ received: true });
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

  const { error } = await admin
    .from("kyc_verifications")
    .update(update)
    .eq("stripe_verification_id", session.id);

  if (error) {
    console.error("[kyc webhook] update failed", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
