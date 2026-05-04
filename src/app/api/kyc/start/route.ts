// POST /api/kyc/start — opens a Stripe Identity verification session
// in redirect mode. Returns the URL the BuyFlow redirects the user to.
//
// Flow:
//   1. User clicks "Start identity check" in the BuyFlow's VerifyStep.
//   2. We check for an existing 'verified' row for this user; if one
//      exists, return early with kycVerified: true.
//   3. Otherwise create a new Stripe verification session, insert a
//      'requires_input' row, and return the redirect URL.
//   4. User uploads ID at Stripe, returns to /share-purchase or the
//      buy flow with the session id in URL params.
//   5. The webhook at /api/kyc/webhook flips the row to 'verified'
//      out-of-band.

import { NextResponse, type NextRequest } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequestWithDiag } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  if (!isAllowed(`kyc-start:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const { user, diag } = await getUserFromRequestWithDiag(req);
  if (!user) {
    // Log + surface the diagnostic so production 401s are debuggable.
    // Categories: no_token_present (no header + no cookie), getuser_error
    // (token but Supabase rejected it — usually expired), cookie_parse_failed,
    // no_admin_client (env misconfig).
    console.warn("[kyc-start · 401]", { diag });
    return NextResponse.json(
      { error: "Sign in required.", diag },
      { status: 401 },
    );
  }

  let admin;
  let stripe;
  try {
    admin = requireSupabaseAdmin();
    stripe = requireStripe();
  } catch {
    return NextResponse.json(
      { error: "KYC backend not configured." },
      { status: 500 },
    );
  }

  // Short-circuit: if the user has a recent 'verified' row we don't
  // need to send them through Stripe again. The BuyFlow's VerifyStep
  // can advance straight to the next step.
  const existing = await admin
    .from("kyc_verifications")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing.data && existing.data.length > 0) {
    return NextResponse.json({
      kycVerified: true,
      verificationId: existing.data[0].id,
    });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const body = await req.json().catch(() => ({}));
  // Validate returnUrl through the same allow-list used by sign-in
  // redirect flow. Naive `startsWith("/")` lets `/foo?x=1`,
  // `/\evil.com`, or `/?...&injection=…` through — each value would
  // mint a new Stripe Identity session due to the idempotency key
  // including the returnUrl. safeNext canonicalizes the path and
  // rejects anything that would create a bypass. Claude round-2 catch.
  const rawReturnUrl =
    typeof body.returnUrl === "string" ? body.returnUrl : null;
  const returnUrl = safeNext(rawReturnUrl, "/account");

  // Idempotency key keyed on userId + returnUrl: a double-click /
  // network retry returns the SAME session instead of minting a
  // second live verification (which would charge us twice and
  // create two placeholder rows in kyc_verifications).
  const session = await stripe.identity.verificationSessions.create(
    {
      type: "document",
      metadata: {
        userId: user.id,
        returnUrl,
      },
      options: {
        document: {
          // Require live capture (anti-spoofing) and ID document type
          // detection so the user can upload license, passport, etc.
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: appendKycOk(`${origin}${returnUrl}`),
    },
    { idempotencyKey: `kyc-start:${user.id}:${returnUrl}` },
  );

  // Upsert the placeholder row, keyed on stripe_verification_id.
  // Why upsert: the idempotencyKey on the Stripe call returns the
  // SAME session.id on retry, so a plain INSERT would 23505 on the
  // unique stripe_verification_id constraint. With upsert, a retry
  // is a no-op and we still return the same URL. The webhook
  // updates status later. Codex round-2 catch.
  const { error } = await admin
    .from("kyc_verifications")
    .upsert(
      {
        user_id: user.id,
        stripe_verification_id: session.id,
        status: "requires_input",
      },
      { onConflict: "stripe_verification_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[kyc-start · upsert]", error);
    return NextResponse.json(
      { error: "Could not start verification." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    kycVerified: false,
    verificationId: session.id,
    url: session.url,
    clientSecret: session.client_secret,
  });
}

// Append `?kyc=ok` to a URL safely. If the URL already has a query
// string, append with `&` instead. Avoids the malformed `…?x=1?kyc=ok`
// pattern that arises from naive concat. Claude round-2 catch.
function appendKycOk(url: string): string {
  return url.includes("?") ? `${url}&kyc=ok` : `${url}?kyc=ok`;
}
