// POST /api/account/billing-portal
//
// Returns a one-shot Stripe Customer Portal URL for the current user.
// The portal is where members manage saved cards, ACH bank links,
// and download Stripe-issued receipts. We intentionally don't render
// any of that UI ourselves — Stripe owns the PCI scope.
//
// Lookup chain:
//   1. user_profiles.stripe_customer_id (canonical home — set
//      here on first call OR by the share-purchase webhook on a
//      paid checkout when no prior row existed)
//   2. share_purchases.stripe_customer_id (legacy fallback — older
//      purchases predating the canonical-home wiring may have it
//      here only)
//   3. None → mint a Customer with idempotency key keyed on
//      user.id so parallel calls don't fragment, persist to
//      user_profiles via upsert.
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

  // Look-up chain for this user's Stripe Customer:
  //   1. user_profiles.stripe_customer_id (canonical home — set by
  //      this route on first call OR by the webhook on checkout.
  //      session.completed when no prior row existed)
  //   2. share_purchases.stripe_customer_id (set by the webhook on
  //      paid sessions; older purchases predating this fix may not
  //      have the user_profiles row yet)
  //   3. None → mint a new Stripe Customer + persist to user_profiles
  //      via upsert (race-safe: two parallel calls see a unique-
  //      violation on the second insert; we re-read instead of
  //      minting again).
  let customerId: string | null = null;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("stripe_customer_id, full_name, preferred_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.stripe_customer_id) {
    customerId = profile.stripe_customer_id as string;
  } else {
    const { data: spRows } = await admin
      .from("share_purchases")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (spRows && spRows.length > 0 && spRows[0].stripe_customer_id) {
      customerId = spRows[0].stripe_customer_id as string;
    }
  }

  if (!customerId) {
    // Idempotency-keyed create so a retry on a network hiccup
    // doesn't mint two customers for one user.
    const customer = await stripe.customers.create(
      {
        email: user.email ?? undefined,
        name: profile?.full_name || profile?.preferred_name || undefined,
        metadata: { userId: user.id },
      },
      { idempotencyKey: `customer-create:${user.id}` },
    );

    // Persist to user_profiles. If a parallel request beat us to it,
    // the upsert overwrites with our newer customer id — but both
    // requests stamp the SAME idempotency key so both get the same
    // Stripe customer back. Stripe is the source of truth.
    const upsert = await admin
      .from("user_profiles")
      .upsert(
        { user_id: user.id, stripe_customer_id: customer.id },
        { onConflict: "user_id" },
      )
      .select("stripe_customer_id")
      .single();
    if (upsert.error) {
      // Non-fatal — Stripe has the customer, we just couldn't
      // cache the id. Next call will mint again with the same
      // idempotency key (Stripe returns the same customer for 24h)
      // and try to persist again. Log so it's visible if it keeps
      // happening.
      console.warn("[billing-portal] customer-id persist failed", upsert.error);
    }
    customerId = (upsert.data?.stripe_customer_id as string | undefined) ?? customer.id;
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/account/payments`,
  });

  return NextResponse.json({ url: portal.url });
}
