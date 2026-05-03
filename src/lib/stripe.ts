// Stripe server client. Server-only — never import from a client
// component. The publishable key is browser-safe and lives in env
// directly, but we mostly use redirect-based Checkout so the
// publishable key isn't strictly needed yet (Checkout sessions are
// opened by URL).
//
// The webhook handler at /api/share-purchase/webhook verifies signatures
// against STRIPE_WEBHOOK_SECRET, so don't expose that key client-side.

import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;

// Lazy-init so a missing key doesn't crash boot — instead, the API
// routes that need Stripe surface a 500 with a clear "not configured"
// message. The marketing site keeps demoing without a key.
export const stripe = apiKey
  ? new Stripe(apiKey, {
      // Pin the API version so a Stripe-side update doesn't silently
      // change behavior for our webhook payload shapes. Bump this in
      // lockstep with `stripe` package upgrades.
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    })
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
    );
  }
  return stripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
