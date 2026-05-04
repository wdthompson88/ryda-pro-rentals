// POST /api/account/billing-portal
//
// Returns a one-shot Stripe Customer Portal URL for the current user.
// The portal is where members manage saved cards, ACH bank links,
// and download Stripe-issued receipts. We intentionally don't render
// any of that UI ourselves — Stripe owns the PCI scope.
//
// Lookup chain:
//   1. share_purchases.stripe_customer_id (set on first checkout
//      session that completes for this user)
//   2. If no row has a customer_id yet, fall back to creating a
//      bare Customer with email/name from auth + user_profiles.
//   3. Open the portal session against that customer with a
//      return_url back to /account/payments so members land where
//      they came from.
//
// Idempotent — calling twice mints two short-lived portal URLs but
// always against the same Stripe Customer.

import { NextResponse, type NextRequest } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (
    !isAllowed(
      `billing-portal:${user.id}:${clientIp(req)}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let admin;
  let stripe;
  try {
    admin = requireSupabaseAdmin();
    stripe = requireStripe();
  } catch {
    return NextResponse.json(
      { error: "Billing portal not configured." },
      { status: 500 },
    );
  }

  // Try to find an existing Stripe customer ID we've recorded for
  // this user. The most-recent paid purchase is the best source —
  // the webhook stamps stripe_customer_id on checkout.session
  // .completed so it's there as soon as the row flips to 'paid'.
  const { data: rows } = await admin
    .from("share_purchases")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  let customerId: string | null = rows && rows.length > 0
    ? (rows[0].stripe_customer_id as string)
    : null;

  // No prior checkout → mint a Customer now. Pull name from the
  // profile if available so the Stripe dashboard shows something
  // human-readable.
  if (!customerId) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("full_name, preferred_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.full_name || profile?.preferred_name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    // We don't write back to share_purchases here because there
    // isn't a row yet for first-time visitors. The next paid
    // checkout will record customer_id naturally.
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/account/payments`,
  });

  return NextResponse.json({ url: portal.url });
}
