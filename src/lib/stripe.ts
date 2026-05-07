// Stripe server client. Server-only — never import from a client
// component. The publishable key is browser-safe and lives in env
// directly, but we mostly use redirect-based Checkout so the
// publishable key isn't strictly needed yet (Checkout sessions are
// opened by URL).
//
// The webhook handler at /api/share-purchase/webhook verifies signatures
// against STRIPE_WEBHOOK_SECRET, so don't expose that key client-side.
// The `server-only` import enforces this at build time.

import "server-only";
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

// Stripe assigns ONE signing secret per webhook endpoint. If you have a
// separate Stripe dashboard endpoint for the KYC events vs. the share-
// purchase events (see SETUP.md §3.2), each has its own `whsec_…` and
// reusing the wrong one will 400 every event ("invalid signature"). The
// canonical setup:
//   - STRIPE_WEBHOOK_SECRET      → /api/share-purchase/webhook
//   - STRIPE_KYC_WEBHOOK_SECRET  → /api/kyc/webhook
// If you mount BOTH event groups on the same Stripe endpoint pointing at
// a single internal handler, you'd only need one secret. The per-route
// constant `KYC_WEBHOOK_SECRET` falls back to STRIPE_WEBHOOK_SECRET so
// the unified-endpoint setup keeps working with one env var.
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
export const STRIPE_KYC_WEBHOOK_SECRET =
  process.env.STRIPE_KYC_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";
