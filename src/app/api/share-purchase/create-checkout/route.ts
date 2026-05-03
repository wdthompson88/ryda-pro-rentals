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
const ACQUISITION_FEE_PCT = 5;

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

    const buyIn = pricePerShare * shares;
    const acquisitionFee = Math.round(buyIn * (ACQUISITION_FEE_PCT / 100));
    const total = buyIn + acquisitionFee;
    const totalCents = total * 100;

    const admin = requireSupabaseAdmin();
    const stripe = requireStripe();

    // Insert pending row first so we have an ID to thread through the
    // Stripe metadata. If checkout creation fails after this, the row
    // stays in 'pending' and a janitor (or the user retrying) can clean
    // it up.
    const insert = await admin
      .from("share_purchases")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
        name,
        vehicle_symbol: vehicleSymbol,
        boat_slug: boatSlug,
        shares,
        price_per_share: pricePerShare,
        acquisition_fee: acquisitionFee,
        total_cents: totalCents,
        status: "pending",
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      customer_email: user.email ?? undefined,
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
        ? `${origin}/markets/${vehicleSymbol.toLowerCase()}?canceled=1`
        : `${origin}/boats/portfolio/${boatSlug}?canceled=1`,
      metadata: {
        purchaseId,
        userId: user.id,
        vehicleSymbol: vehicleSymbol ?? "",
        boatSlug: boatSlug ?? "",
        shares: String(shares),
      },
    });

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
