// POST /api/share-purchase/create-checkout
// Body: { vehicleSymbol?: string, boatSlug?: string, shares: number, name: string }
// Returns: { sessionId: string, url: string, purchaseId: string }
//
// Creates a pending share_purchases row, opens a Stripe Checkout session
// in payment mode, and returns the redirect URL. The webhook at
// /api/share-purchase/webhook flips the row to 'paid' and creates the
// share_holdings entry once the session completes.

import { NextResponse, type NextRequest } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

// 5% of buy-in. Mirrors the "$2,834 acquisition fee" on the previously
// hardcoded /share-purchase tracker (which showed 5% of $56,667).
// Re-exported via @/lib/fees so the client buy flows compute the
// SAME total as Stripe charges. Don't duplicate this constant.
import { ACQUISITION_FEE_PCT, computeFees } from "@/lib/fees";
import { requireMinAge } from "@/lib/age";

export async function POST(req: NextRequest) {
  try {
    if (!isAllowed(`share-purchase:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to claim a share." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const vehicleSymbol = typeof body.vehicleSymbol === "string" ? body.vehicleSymbol.toUpperCase() : null;
    const boatSlug = typeof body.boatSlug === "string" ? body.boatSlug.toLowerCase() : null;
    const shares = Number.parseInt(String(body.shares ?? "0"), 10);
    const name = String(body.name ?? "").trim().slice(0, 200);
    // Optional: caller can request a specific Stripe payment method
    // ("card" or "ach"). When unset we offer both at checkout.
    const requestedMethod = String(body.paymentMethod ?? "").toLowerCase();
    const paymentMethodTypes: ("card" | "us_bank_account")[] =
      requestedMethod === "card"
        ? ["card"]
        : requestedMethod === "ach"
          ? ["us_bank_account"]
          : ["card", "us_bank_account"];

    // Validation: exactly one of vehicleSymbol / boatSlug, sane share count, name present.
    if ((!vehicleSymbol && !boatSlug) || (vehicleSymbol && boatSlug)) {
      return NextResponse.json(
        { error: "Provide exactly one of vehicleSymbol or boatSlug." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(shares) || shares < 2 || shares > 10) {
      return NextResponse.json(
        { error: "Shares must be between 2 and 10 (2-share minimum per person)." },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json({ error: "Name required." }, { status: 400 });
    }

    // KYC gate. The BuyFlow's VerifyStep walks the user through
    // Stripe Identity in the UI, but the UI is bypassable — anyone
    // could POST here directly. Per LLC member-register law and the
    // operating agreement, we cannot record a member without an
    // identity check. Re-verify here against the kyc_verifications
    // table.
    const admin = requireSupabaseAdmin();
    const kycCheck = await admin
      .from("kyc_verifications")
      .select("id, status, updated_at, verified_outputs")
      .eq("user_id", user.id)
      .eq("status", "verified")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (kycCheck.error) {
      console.error("[create-checkout · kyc lookup]", kycCheck.error);
      return NextResponse.json(
        { error: "Could not verify identity status." },
        { status: 500 },
      );
    }
    if (!kycCheck.data || kycCheck.data.length === 0) {
      return NextResponse.json(
        {
          error:
            "Identity verification required. Complete KYC before claiming a share.",
          code: "kyc_required",
        },
        { status: 409 },
      );
    }

    // Prefer the KYC-verified legal name on the LLC member register
    // when Stripe Identity returned one. Falls back to the body
    // `name` (which the BuyFlow collects as a polite default but
    // shouldn't override a verified legal identity).
    const verifiedOutputs = kycCheck.data[0].verified_outputs as
      | {
          first_name?: string;
          last_name?: string;
          dob?: { day?: number; month?: number; year?: number };
        }
      | null
      | undefined;
    const verifiedName =
      verifiedOutputs?.first_name && verifiedOutputs?.last_name
        ? `${verifiedOutputs.first_name} ${verifiedOutputs.last_name}`
        : null;
    const memberName = verifiedName ?? name;

    // Age gate. CODEX-CHALLENGE caught this: /legal/terms requires age
    // 28 but no code path enforced it before this commit. A 22-year-old
    // who passed Stripe Identity could buy LLC interests, putting RYDA
    // in breach of its own ToS before its first member. Compute age
    // from `verified_outputs.dob` and reject under-28 with a clear 409.
    // Helper + 18 unit tests live in `lib/age.ts` + `lib/__tests__/age.test.ts`.
    const ageGate = requireMinAge(verifiedOutputs?.dob);
    if (!ageGate.ok) {
      return NextResponse.json(
        { error: ageGate.message, code: ageGate.code },
        { status: 409 },
      );
    }

    // Look up the asset to get the price snapshot. We never trust a
    // client-supplied price; the catalog is authoritative.
    let pricePerShare = 0;
    let displayName = "";
    let imageUrl: string | null = null;
    if (vehicleSymbol) {
      const v = VEHICLES.find((x) => x.symbol === vehicleSymbol);
      if (!v) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
      if (v.sharesAvailable < shares) {
        return NextResponse.json(
          { error: `Only ${v.sharesAvailable} shares available.` },
          { status: 409 },
        );
      }
      pricePerShare = v.pricePerShare;
      displayName = `${v.year} ${v.name}`;
      imageUrl = v.hero;
    } else if (boatSlug) {
      const b = BOATS.find((x) => x.slug === boatSlug);
      if (!b) return NextResponse.json({ error: "Boat not found." }, { status: 404 });
      if (b.sharesAvailable < shares) {
        return NextResponse.json(
          { error: `Only ${b.sharesAvailable} shares available.` },
          { status: 409 },
        );
      }
      pricePerShare = b.pricePerShare;
      displayName = `${b.year} ${b.name}`;
      imageUrl = b.hero;
    }

    const { buyIn, acquisitionFee, total } = computeFees(pricePerShare, shares);
    const totalCents = total * 100;

    const stripe = requireStripe();

    // Double-click / app-retry guard: if this user already has a
    // pending purchase for the EXACT SAME (asset, shares, funding)
    // within 5 minutes, return its Stripe URL instead of minting a
    // duplicate row + session. The dedup match must include shares
    // + funding so a user who changes from "buy 2" to "buy 10" — or
    // from card to ACH — doesn't get the previous quote's session.
    // Codex round-2 catch.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const fundingMethodForDedup = requestedMethod === "ach" ? "ach" : "card";
    const existingPending = await admin
      .from("share_purchases")
      .select("id, stripe_session_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("shares", shares)
      .eq("funding_method", fundingMethodForDedup)
      .eq(vehicleSymbol ? "vehicle_symbol" : "boat_slug", vehicleSymbol ?? boatSlug)
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(1);
    if (
      existingPending.data &&
      existingPending.data.length > 0 &&
      existingPending.data[0].stripe_session_id
    ) {
      const existingSession = await stripe.checkout.sessions.retrieve(
        existingPending.data[0].stripe_session_id,
      );
      if (existingSession.url && existingSession.status === "open") {
        return NextResponse.json({
          purchaseId: existingPending.data[0].id,
          sessionId: existingSession.id,
          url: existingSession.url,
          deduped: true,
        });
      }
    }

    // Insert pending row first so we have an ID to thread through the
    // Stripe metadata. If checkout creation fails after this, the row
    // stays in 'pending' and a janitor (or the user retrying) can clean
    // it up.
    const insert = await admin
      .from("share_purchases")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
        name: memberName,
        vehicle_symbol: vehicleSymbol,
        boat_slug: boatSlug,
        shares,
        price_per_share: pricePerShare,
        acquisition_fee: acquisitionFee,
        total_cents: totalCents,
        status: "pending",
        // Stripe-handled paths: card or ach. Non-Stripe paths
        // (wire/crypto/liquidity/finance) go through /intent and
        // don't reach this insert.
        funding_method: requestedMethod === "ach" ? "ach" : "card",
      })
      .select("id")
      .single();

    if (insert.error || !insert.data) {
      console.error("[share-purchase · insert]", insert.error);
      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 500 },
      );
    }

    const purchaseId = insert.data.id as string;
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

    // Resolve to the user's canonical Stripe Customer so saved
    // payment methods accumulate on ONE customer across purchases.
    // Without this, each Checkout creates a fresh anonymous
    // customer keyed by email, fragmenting saved cards across rows
    // and breaking the billing portal's "most recent customer"
    // lookup.
    const customerId = await resolveStripeCustomerId(
      admin,
      stripe,
      user.id,
      user.email ?? null,
    );

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: paymentMethodTypes,
        // Pass `customer` when we have one; fall back to email-only
        // for the rare case where customer minting failed (the
        // billing portal will repair on next visit).
        customer: customerId ?? undefined,
        customer_email: customerId ? undefined : (user.email ?? undefined),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: totalCents,
              product_data: {
                name: `${shares} share${shares > 1 ? "s" : ""} · ${displayName}`,
                description: `RYDA co-ownership share. Includes ${ACQUISITION_FEE_PCT}% acquisition fee. Member-managed LLC.`,
                images: imageUrl ? [imageUrl] : undefined,
              },
            },
          },
        ],
        // Returning to /share-purchase/[id] lets the tracker page fetch
        // the row and render real status. The cancel path drops back to
        // the listing without confusing copy.
        success_url: `${origin}/share-purchase/${purchaseId}?ok=1`,
        cancel_url: vehicleSymbol
          ? `${origin}/portfolio/${vehicleSymbol.toLowerCase()}?canceled=1`
          : `${origin}/boats/portfolio/${boatSlug}?canceled=1`,
        metadata: {
          purchaseId,
          userId: user.id,
          vehicleSymbol: vehicleSymbol ?? "",
          boatSlug: boatSlug ?? "",
          shares: String(shares),
        },
      },
      // Idempotency: a network retry between Stripe creating the
      // session and the lambda returning would otherwise mint a
      // second session. Keyed on purchaseId (which we just inserted),
      // so a retry returns the SAME session URL without a duplicate
      // backend session.
      { idempotencyKey: `checkout-session:${purchaseId}` },
    );

    // Stash the Stripe session id on the row so the webhook can
    // reconcile by either id (event payload contains both).
    await admin
      .from("share_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchaseId);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      purchaseId,
    });
  } catch (err) {
    console.error("[share-purchase · create-checkout]", err);
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 },
    );
  }
}

// Look up or mint a single canonical Stripe Customer for this user.
// Lookup chain:
//   1. user_profiles.stripe_customer_id (canonical home — set by
//      the billing portal route or by this function on first call)
//   2. share_purchases.stripe_customer_id (legacy fallback)
//   3. None → mint with idempotency key keyed on user.id, persist
//      to user_profiles, return.
//
// Idempotency key + persistence makes parallel calls safe: both
// requests get the SAME Stripe customer back, the upsert's unique
// constraint on user_id means the second insert overwrites with
// the same value.
async function resolveStripeCustomerId(
  admin: ReturnType<typeof requireSupabaseAdmin>,
  stripe: ReturnType<typeof requireStripe>,
  userId: string,
  email: string | null,
): Promise<string | null> {
  try {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("stripe_customer_id, full_name, preferred_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id as string;
    }

    const { data: spRows } = await admin
      .from("share_purchases")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .not("stripe_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (spRows && spRows.length > 0 && spRows[0].stripe_customer_id) {
      const cached = spRows[0].stripe_customer_id as string;
      // Persist forward for next time. Non-fatal if it fails;
      // we'll just resolve from share_purchases again next call.
      const fwd = await admin
        .from("user_profiles")
        .upsert(
          { user_id: userId, stripe_customer_id: cached },
          { onConflict: "user_id" },
        );
      if (fwd.error) {
        console.warn("[create-checkout · forward-persist failed]", fwd.error);
      }
      return cached;
    }

    const customer = await stripe.customers.create(
      {
        email: email ?? undefined,
        name:
          profile?.full_name || profile?.preferred_name || undefined,
        metadata: { userId },
      },
      { idempotencyKey: `customer-create:${userId}` },
    );
    const persist = await admin
      .from("user_profiles")
      .upsert(
        { user_id: userId, stripe_customer_id: customer.id },
        { onConflict: "user_id" },
      );
    if (persist.error) {
      console.warn("[create-checkout · customer persist failed]", persist.error);
    }
    return customer.id;
  } catch (err) {
    // Don't block checkout on a customer-resolution hiccup. Stripe
    // will create a fresh one keyed by customer_email; the billing
    // portal will reconcile on next visit.
    console.warn("[create-checkout · customer resolve]", err);
    return null;
  }
}
