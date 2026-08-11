// Stripe server client. Server-only — never import from a client
// component. The publishable key is browser-safe and lives in env
// directly, but we mostly use redirect-based Checkout so the
// publishable key isn't strictly needed yet (Checkout sessions are
// opened by URL).
//
// The webhook handlers verify signatures against their `whsec_…`
// secrets, so don't expose those keys client-side. The `server-only`
// import enforces this at build time.
//
// This module is shared by both money rails and needs no split: it is a
// client factory, and the co-ownership share rail's usage disappeared
// with its callers. What remains is the rental Connect rail
// (api/stripe/connect-webhook, api/admin/inquiries/[id]/payment-link,
// api/admin/partners and its onboarding-link) plus Stripe Identity.

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

// Stripe assigns ONE signing secret per webhook endpoint, each its own
// `whsec_…`; reusing the wrong one will 400 every event ("invalid
// signature"). Two endpoints remain:
//   - STRIPE_KYC_WEBHOOK_SECRET      → /api/kyc/webhook
//   - STRIPE_CONNECT_WEBHOOK_SECRET  → /api/stripe/connect-webhook
//
// There is deliberately no exported STRIPE_WEBHOOK_SECRET any more. It
// belonged to the platform endpoint at /api/share-purchase/webhook,
// which the rentals-first strip removed. The ENV VAR is still read
// below as a fallback, because an existing deployment may have mounted
// the Identity events on the generic endpoint and set only that one
// name — dropping the fallback would silently 400 every KYC event on
// such a setup. New deployments should set STRIPE_KYC_WEBHOOK_SECRET.
export const STRIPE_KYC_WEBHOOK_SECRET =
  process.env.STRIPE_KYC_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";
// The Connect endpoint is created in the dashboard with "Listen to
// events on connected accounts" — that toggle makes it a DIFFERENT
// endpoint type from the one above (rental checkouts are direct
// charges on the operators' Express accounts, so their events only
// ever arrive there). It can never share an endpoint with a
// platform-account handler, so unlike KYC there is deliberately NO
// fallback to STRIPE_WEBHOOK_SECRET — a fallback would just turn a
// missing env var into a silent "invalid signature" 400 loop.
export const STRIPE_CONNECT_WEBHOOK_SECRET =
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "";
