// POST /api/share-purchase/intent
//
// Creates a 'pending' share_purchases row for non-Stripe funding
// paths (wire, crypto, liquidity, finance) and notifies the team
// so ops can deliver wire instructions, schedule the lender intro,
// or coordinate the crypto-exchange handoff.
//
// Stripe paths (card, ach) go through /api/share-purchase/create-
// checkout instead — the intent route would duplicate the row.
//
// Pre-fix: the buy flow's wire/crypto/liquidity/finance buttons
// called onContinue() with no API call, so the user reached the
// confirm step thinking something was happening when nothing was.
// Now every funding path lands a row + ops ticket.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { Resend } from "resend";
import { computeFees } from "@/lib/fees";
import { requireMinAge } from "@/lib/age";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import {
  FUNDING_PATHS,
  isFundingMethodEnabled,
  type FundingMethod,
} from "@/lib/funding-paths";

export const runtime = "nodejs";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

// Funding methods this route handles. Stripe-handled methods
// (card / ach) belong in /create-checkout and are rejected here so
// callers can't accidentally double-mint a row.
//
// Each method here is ALSO gated by FUNDING_PATHS in lib/funding-paths
// (the launch-time feature flag). Currently disabled pre-launch:
// crypto (no partner), finance (lending-license exposure). The API
// rejects 400 if the requested method is disabled — defense-in-
// depth alongside the buy-flow UI gating.
const NON_STRIPE_METHODS = ["wire", "crypto", "liquidity", "finance"] as const;
type NonStripeMethod = (typeof NON_STRIPE_METHODS)[number];

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (
    !isAllowed(
      `share-intent:${user.id}:${clientIp(req)}`,
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
  try {
    admin = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const vehicleSymbol =
    typeof body.vehicleSymbol === "string"
      ? body.vehicleSymbol.toUpperCase()
      : null;
  const boatSlug =
    typeof body.boatSlug === "string" ? body.boatSlug.toLowerCase() : null;
  const shares = Number(body.shares);
  const memberName = String(body.name ?? "").trim().slice(0, 200);
  const fundingMethod = String(body.fundingMethod ?? "") as NonStripeMethod;

  // Validation mirrors create-checkout (asset XOR, share range, KYC
  // gate) so the two paths agree on what's a valid purchase.
  if ((!vehicleSymbol && !boatSlug) || (vehicleSymbol && boatSlug)) {
    return NextResponse.json(
      { error: "Provide exactly one of vehicleSymbol or boatSlug." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(shares) || shares < 2 || shares > 10) {
    return NextResponse.json(
      { error: "shares must be an integer between 2 and 10." },
      { status: 400 },
    );
  }
  if (
    !(NON_STRIPE_METHODS as readonly string[]).includes(fundingMethod)
  ) {
    return NextResponse.json(
      {
        error:
          "fundingMethod must be one of: wire, crypto, liquidity, finance. Use create-checkout for card / ach.",
      },
      { status: 400 },
    );
  }

  // Pre-launch gate: even if the requested method is structurally
  // valid (in NON_STRIPE_METHODS), reject if it's currently disabled
  // by FUNDING_PATHS. This is the server-side defense alongside the
  // buy-flow UI hiding the option — a determined caller bypassing
  // the UI still hits a 400 here. Currently disabled: crypto (no
  // regulated exchange partner identified), finance (lending-license
  // exposure pending Florida counsel sign-off). See lib/funding-
  // paths.ts for the gate definition + re-enable instructions.
  if (!isFundingMethodEnabled(fundingMethod)) {
    return NextResponse.json(
      {
        error: `Funding method '${fundingMethod}' is temporarily unavailable.`,
        comingSoonNote:
          FUNDING_PATHS[fundingMethod as FundingMethod].comingSoonNote ?? null,
      },
      { status: 400 },
    );
  }

  // KYC + age gate. Same gate as create-checkout — every share-purchase
  // path must pass both. Codex caught that this route bypassed the
  // age gate for non-Stripe funding (wire/crypto/liquidity/finance).
  const kyc = await admin
    .from("kyc_verifications")
    .select("id, verified_outputs")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(1);
  if (!kyc.data || kyc.data.length === 0) {
    return NextResponse.json(
      { error: "Identity verification required before reserving a share." },
      { status: 409 },
    );
  }
  const kycVerifiedOutputs = kyc.data[0].verified_outputs as
    | { dob?: { day?: number; month?: number; year?: number } }
    | null
    | undefined;
  const ageGate = requireMinAge(kycVerifiedOutputs?.dob);
  if (!ageGate.ok) {
    return NextResponse.json(
      { error: ageGate.message, code: ageGate.code },
      { status: 409 },
    );
  }

  // Catalog price lookup (server-authoritative — never trust the
  // client to compute the total).
  let pricePerShare: number;
  let assetDisplay: string;
  if (vehicleSymbol) {
    const v = VEHICLES.find((x) => x.symbol === vehicleSymbol);
    if (!v) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }
    pricePerShare = v.pricePerShare;
    assetDisplay = `${v.year} ${v.name}`;
  } else {
    const b = BOATS.find((x) => x.slug === boatSlug);
    if (!b) {
      return NextResponse.json({ error: "Boat not found." }, { status: 404 });
    }
    pricePerShare = b.pricePerShare;
    assetDisplay = `${b.year} ${b.name}`;
  }

  const { acquisitionFee, total } = computeFees(pricePerShare, shares);
  const totalCents = total * 100;

  // Dedup: if this user already has a recent (≤5 min) pending row for
  // the SAME asset + funding method + shares + total_cents, surface
  // that one instead of minting a duplicate. Matches the create-
  // checkout dedup pattern; protects against double-click and
  // network retries creating two ops tickets. Including shares +
  // total_cents in the match ensures a buyer who changed quantity
  // gets a fresh row rather than the previous quote.
  // Codex round-2 catch.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const existing = await admin
    .from("share_purchases")
    .select("id, funding_method")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .eq("funding_method", fundingMethod)
    .eq("shares", shares)
    .eq("total_cents", totalCents)
    .eq(vehicleSymbol ? "vehicle_symbol" : "boat_slug", vehicleSymbol ?? boatSlug)
    .gte("created_at", fiveMinAgo)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existing.data && existing.data.length > 0) {
    return NextResponse.json({
      purchaseId: existing.data[0].id,
      status: "pending",
      fundingMethod,
      deduped: true,
    });
  }

  const { data: row, error: insertErr } = await admin
    .from("share_purchases")
    .insert({
      user_id: user.id,
      email: user.email ?? "",
      name: memberName || user.email || "RYDA member",
      vehicle_symbol: vehicleSymbol,
      boat_slug: boatSlug,
      shares,
      price_per_share: pricePerShare,
      acquisition_fee: acquisitionFee,
      total_cents: totalCents,
      status: "pending",
      funding_method: fundingMethod,
    })
    .select("id")
    .single();
  if (insertErr || !row) {
    console.error("[share-intent · insert]", insertErr);
    return NextResponse.json(
      { error: "Could not record reservation." },
      { status: 500 },
    );
  }

  // Notify team (best-effort — durable row above is the contract).
  const methodLabel: Record<NonStripeMethod, string> = {
    wire: "wire transfer",
    crypto: "crypto via partner exchange",
    liquidity: "liquidity / SBLOC line",
    finance: "lender financing",
  };

  try {
    await notifyTeam({
      subject: `Share reservation · ${methodLabel[fundingMethod]} · ${assetDisplay}`,
      html: emailLayout(
        "Share reservation pending non-Stripe funding",
        `
          <p>Member: <strong>${escapeHtml(user.email ?? "(no email)")}</strong></p>
          <p>Asset: ${escapeHtml(assetDisplay)} · ${shares} share${shares > 1 ? "s" : ""}</p>
          <p>Total: $${total.toLocaleString()}</p>
          <p>Funding path: <strong>${escapeHtml(methodLabel[fundingMethod])}</strong></p>
          <p>Purchase id: <code>${escapeHtml(row.id)}</code></p>
          <p>Action: ${
            fundingMethod === "wire"
              ? "Send wire instructions to the member; flip status to 'paid' when funds clear and run the standard fulfillment via the manual webhook replay."
              : fundingMethod === "crypto"
                ? "Hand off to the regulated exchange partner; settle to the LLC bank account; mark paid when on-chain settles + USD lands."
                : fundingMethod === "liquidity"
                  ? "Confirm the member's line is in place; treat as a wire from their disbursement account."
                  : "Introduce the member to the lender partner; the loan settles to the LLC bank account on close."
          }</p>
        `,
      ),
    });
  } catch (err) {
    console.error("[share-intent · notify]", err);
  }

  // Send the member a confirmation email with the wire instructions
  // for the wire/liquidity paths (crypto + finance are handled by
  // human handoff and don't need wire details).
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RYDA_NOTIFY_FROM;
    if (resendKey && from && (fundingMethod === "wire" || fundingMethod === "liquidity")) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from,
        to: user.email ?? "",
        subject: `Wire instructions for your ${assetDisplay} share`,
        html: emailLayout(
          "Reservation received — wire instructions",
          `
            <p>${escapeHtml(memberName || "RYDA member")},</p>
            <p>We've reserved <strong>${shares} share${shares > 1 ? "s" : ""}</strong>
            of <strong>${escapeHtml(assetDisplay)}</strong> for you, total
            $${total.toLocaleString()}.</p>
            <p>RYDA's ops team will reply to this thread within one business
            day with the LLC's escrow wire details. Funds clear typically in
            1–3 business days; once they land we record your share in the
            LLC's member register and email the member-register amendment.</p>
            <p>Reference: <code>${escapeHtml(row.id)}</code></p>
            <p>Questions? Reply to this email and ops will pick it up.</p>
          `,
        ),
      });
    }
  } catch (err) {
    console.error("[share-intent · member email]", err);
  }

  return NextResponse.json({
    purchaseId: row.id,
    status: "pending",
    fundingMethod,
  });
}
