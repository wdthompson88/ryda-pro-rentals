// POST /api/kyc/webhook — Stripe webhook for Identity verifications.
// Listens for:
//   - identity.verification_session.verified
//   - identity.verification_session.processing
//   - identity.verification_session.requires_input
//   - identity.verification_session.canceled
//
// Same secret as the share-purchase webhook (single STRIPE_WEBHOOK_SECRET
// works for both endpoints if you mount both in the Stripe dashboard;
// or use a separate secret per endpoint and we'd need a separate env
// var). For now we reuse STRIPE_WEBHOOK_SECRET.

import { NextResponse, type NextRequest } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
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
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[kyc webhook] signature failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
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
