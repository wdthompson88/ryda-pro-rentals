// POST /api/share-transfer/request
//
// Initiator path: a current shareholder requests a peer-to-peer
// transfer of one or more shares to another verified RYDA member,
// identified by email. Per the Operating Agreement:
//   - 12-month minimum hold from acquired_at before any transfer
//   - Recipient must KYC-verify before acceptance lands
//   - RYDA legal acknowledges the move (final review)
//
// Body:
//   { holdingId: string, toEmail: string, note?: string }
//
// Returns:
//   { ok: true, transferId: string, expiresAt: string }
//
// Side effects: inserts a share_transfers row with status='requested';
// emails the recipient (best-effort) with a magic link to /account
// /transfers/<id> where they can accept or reject. (Recipient UI
// not implemented yet — the row exists in the DB and can be acted
// on via /admin once that ships.)

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { Resend } from "resend";

export const runtime = "nodejs";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

// Per OA — minimum hold before transfer.
const MIN_HOLD_DAYS = 365;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (
    !(await isAllowed(
      `xfer-req:${user.id}:${clientIp(req)}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    ))
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
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const holdingId = typeof body.holdingId === "string" ? body.holdingId : null;
  const toEmail =
    typeof body.toEmail === "string" ? body.toEmail.trim().toLowerCase() : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  if (!holdingId) {
    return NextResponse.json({ error: "holdingId is required." }, { status: 400 });
  }
  if (!toEmail || !toEmail.includes("@")) {
    return NextResponse.json(
      { error: "toEmail must be a valid email." },
      { status: 400 },
    );
  }
  if (toEmail === (user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      { error: "Can't transfer to yourself." },
      { status: 400 },
    );
  }

  // Verify the holding belongs to this user, is active, and has
  // cleared the minimum-hold window.
  const { data: holding, error: holdingErr } = await admin
    .from("share_holdings")
    .select(
      "id, user_id, vehicle_symbol, boat_slug, shares, acquired_at, transferred_at",
    )
    .eq("id", holdingId)
    .eq("user_id", user.id)
    .is("transferred_at", null)
    .maybeSingle();
  if (holdingErr || !holding) {
    return NextResponse.json(
      { error: "Holding not found or already transferred." },
      { status: 404 },
    );
  }

  const acquiredMs = holding.acquired_at
    ? new Date(holding.acquired_at).getTime()
    : 0;
  const ageDays = (Date.now() - acquiredMs) / (1000 * 60 * 60 * 24);
  if (ageDays < MIN_HOLD_DAYS) {
    const remainingDays = Math.ceil(MIN_HOLD_DAYS - ageDays);
    return NextResponse.json(
      {
        error: `Minimum hold is ${MIN_HOLD_DAYS} days. ${remainingDays} day${remainingDays === 1 ? "" : "s"} to go before this share can be transferred.`,
      },
      { status: 409 },
    );
  }

  // Check there's no other open transfer for this holding (one at
  // a time — racing two requests to the same share is bad ops).
  const { data: openXfer } = await admin
    .from("share_transfers")
    .select("id")
    .eq("holding_id", holding.id)
    .in("status", ["requested", "accepted", "pending_ryda_review"])
    .limit(1);
  if (openXfer && openXfer.length > 0) {
    return NextResponse.json(
      {
        error:
          "There's already an open transfer request for this share. Cancel that one first.",
      },
      { status: 409 },
    );
  }

  // Insert the transfer row. A partial unique index on
  // (holding_id) WHERE status IN open-statuses means a parallel
  // request will hit unique-violation 23505 — surface as the same
  // 409 the read-then-check above produces, so concurrent
  // duplicates can't slip past.
  const { data: xfer, error: xferErr } = await admin
    .from("share_transfers")
    .insert({
      holding_id: holding.id,
      vehicle_symbol: holding.vehicle_symbol,
      boat_slug: holding.boat_slug,
      shares: holding.shares,
      from_user_id: user.id,
      to_user_email: toEmail,
      member_note: note || null,
      status: "requested",
    })
    .select("id, expires_at")
    .single();
  if (xferErr || !xfer) {
    const code = (xferErr as { code?: string } | null)?.code;
    if (code === "23505") {
      return NextResponse.json(
        {
          error:
            "There's already an open transfer request for this share. Cancel that one first.",
        },
        { status: 409 },
      );
    }
    console.error("[xfer-req · insert]", xferErr);
    return NextResponse.json(
      { error: "Could not record transfer request." },
      { status: 500 },
    );
  }

  // Notify the recipient (best-effort) and the RYDA team.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const acceptUrl = `${origin}/account/transfers/${xfer.id}`;
  const assetLabel = holding.vehicle_symbol ?? holding.boat_slug ?? "RYDA share";

  try {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RYDA_NOTIFY_FROM;
    if (resendKey && from) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from,
        to: toEmail,
        subject: `${user.email ?? "A RYDA member"} wants to transfer a share to you`,
        html: emailLayout(
          "Pending share transfer",
          `
            <p>${escapeHtml(user.email ?? "A RYDA member")} just initiated
            a transfer of <strong>${holding.shares} share${holding.shares > 1 ? "s" : ""}</strong>
            of <strong>${escapeHtml(String(assetLabel))}</strong> to your
            email.</p>
            ${note ? `<p>From them: ${escapeHtml(note)}</p>` : ""}
            <p>Sign in (or create an account at this email) and visit
            <a href="${escapeHtml(acceptUrl)}">${escapeHtml(acceptUrl)}</a>
            to accept or decline. The request expires in 14 days.</p>
            <p>RYDA legal acknowledges every transfer before it
            completes.</p>
          `,
        ),
      });
    }
  } catch (err) {
    console.error("[xfer-req · email]", err);
  }

  await notifyTeam({
    subject: `Share-transfer requested · ${user.email ?? user.id} → ${toEmail}`,
    html: emailLayout(
      "Share transfer initiated",
      `
        <p>From: <strong>${escapeHtml(user.email ?? user.id)}</strong></p>
        <p>To (email): <strong>${escapeHtml(toEmail)}</strong></p>
        <p>Asset: ${escapeHtml(String(assetLabel))} · ${holding.shares} share${holding.shares > 1 ? "s" : ""}</p>
        <p>Transfer ID: <code>${escapeHtml(xfer.id)}</code></p>
        ${note ? `<p>Note: ${escapeHtml(note)}</p>` : ""}
        <p>Acknowledge in /admin once the recipient accepts.</p>
      `,
    ),
  });

  return NextResponse.json({
    ok: true,
    transferId: xfer.id,
    expiresAt: xfer.expires_at,
  });
}
