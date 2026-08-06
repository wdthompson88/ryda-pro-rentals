// POST /api/admin/partners/[id]/onboarding-link — mint a Stripe
// Express onboarding link for an operator.
//
// First call creates the Express connected account (idempotency-keyed
// on the partner id, so a network retry can't mint two accounts) and
// persists the acct_… id with a null-guarded CAS; later calls reuse
// the stored id. Safe to hit repeatedly — Stripe account links are
// single-use and expire after minutes, so minting a fresh one IS the
// resend flow. GET /api/admin/partners stamps stripe_onboarded_at
// once charges_enabled flips on the account.
//
// The Express account is what makes the fee-only model work: rental
// Checkout Sessions are created ON this account (direct charges), so
// the money settles with the operator and RYDA only ever touches the
// application fee. See /api/admin/inquiries/[id]/payment-link.

import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/site-url";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid partner id." }, { status: 400 });
  }

  // Degrade cleanly without env (dev preview): clear 503s, no crash.
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured. Set STRIPE_SECRET_KEY to onboard operators." },
      { status: 503 },
    );
  }
  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }

  const partnerRes = await db
    .from("partners")
    .select("id, name, stripe_account_id")
    .eq("id", id)
    .maybeSingle();
  if (partnerRes.error) {
    return NextResponse.json(
      {
        error: `Database error: ${partnerRes.error.message}. If the partners table does not exist, apply migration 0041 (operator approval required).`,
      },
      { status: 500 },
    );
  }
  const partner = partnerRes.data;
  if (!partner) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  let accountId = partner.stripe_account_id as string | null;
  if (!accountId) {
    let account;
    try {
      account = await stripe.accounts.create(
        {
          type: "express",
          country: "US",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "company",
          metadata: { partner_id: partner.id },
        },
        // A retry between Stripe creating the account and this lambda
        // returning must resolve to the SAME acct_…, not a duplicate.
        { idempotencyKey: `express-account:${partner.id}` },
      );
    } catch (err) {
      console.error("[onboarding-link · account create]", err);
      return NextResponse.json(
        { error: "Stripe could not create the operator's Express account." },
        { status: 500 },
      );
    }

    // Null-guarded CAS: two admins clicking at once both reach here,
    // but only one id lands; the loser adopts whichever account won so
    // the onboarding link always matches the persisted account.
    const persist = await db
      .from("partners")
      .update({ stripe_account_id: account.id })
      .eq("id", partner.id)
      .is("stripe_account_id", null)
      .select("id")
      .maybeSingle();
    if (persist.error) {
      console.error("[onboarding-link · persist]", persist.error);
      return NextResponse.json(
        {
          error:
            "Created the Stripe account but could not persist it — retry (the idempotency key returns the same account).",
        },
        { status: 500 },
      );
    }
    if (persist.data) {
      accountId = account.id;
    } else {
      const reread = await db
        .from("partners")
        .select("stripe_account_id")
        .eq("id", partner.id)
        .single();
      accountId = (reread.data?.stripe_account_id as string | null) ?? account.id;
    }
  }

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      // Expired/abandoned link drops the operator back on the roster;
      // completion returns with the partner flagged so the page can
      // trigger its onboarded-state refresh.
      refresh_url: `${SITE_URL}/admin/partners`,
      return_url: `${SITE_URL}/admin/partners?onboarded=${partner.id}`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("[onboarding-link · account link]", err);
    return NextResponse.json(
      { error: "Stripe could not create the onboarding link. Retry in a moment." },
      { status: 500 },
    );
  }
}
