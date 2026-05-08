// POST /api/share-transfer/[id]/respond
//
// Recipient action: accept or reject an incoming share-transfer
// request. The recipient must be:
//   - Signed in to a RYDA account
//   - The named recipient (their auth email matches to_user_email)
//
// Body: { action: 'accept' | 'reject', note?: string }
//
// On accept:
//   - Status flips to 'pending_ryda_review'
//   - to_user_id is filled in with the recipient's auth.uid()
//   - Recipient KYC must be 'verified' or accept is rejected with 409
//
// On reject:
//   - Status flips to 'rejected'
//
// Final move (status → 'completed') happens via /admin acknowledge,
// which actually updates share_holdings — it's intentionally not
// in this route so legal review is enforced before the share moves.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { requireMinAge } from "@/lib/age";
import { readVerifiedOutputs } from "@/lib/kyc-verified-outputs";

export const runtime = "nodejs";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (
    !(await isAllowed(
      `xfer-resp:${user.id}:${clientIp(req)}`,
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

  const { id: transferId } = await params;
  const body = await req.json().catch(() => ({}));
  const action =
    body.action === "accept" ? "accept" : body.action === "reject" ? "reject" : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
  if (!action) {
    return NextResponse.json(
      { error: "action must be 'accept' or 'reject'." },
      { status: 400 },
    );
  }

  // Look up the transfer + verify the caller is the named recipient.
  const { data: xfer, error: xferErr } = await admin
    .from("share_transfers")
    .select(
      "id, holding_id, vehicle_symbol, boat_slug, shares, from_user_id, to_user_email, to_user_id, status, expires_at, member_note",
    )
    .eq("id", transferId)
    .maybeSingle();
  if (xferErr || !xfer) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }
  // Compare both sides lowercased. The request route stores
  // toEmail lowercase, but defending against future writers that
  // might insert mixed-case rows costs us nothing.
  if (
    (user.email ?? "").toLowerCase() !==
    (xfer.to_user_email ?? "").toLowerCase()
  ) {
    // Don't reveal that the transfer exists for someone else.
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (xfer.status !== "requested") {
    return NextResponse.json(
      { error: `Transfer is already ${xfer.status}.` },
      { status: 409 },
    );
  }
  if (new Date(xfer.expires_at).getTime() < Date.now()) {
    // Auto-expire on read so the row reflects reality going forward.
    // CAS-guarded so a parallel cron's flip doesn't get clobbered.
    const expClaim = await admin
      .from("share_transfers")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", xfer.id)
      .eq("status", "requested")
      .select("id")
      .maybeSingle();
    // Only ping ops if WE were the one who flipped it (recipient
    // visited a stale link — interesting signal vs cron-bulk-expire).
    if (expClaim.data) {
      try {
        await notifyTeam({
          subject: `Share-transfer expired on recipient visit · ${xfer.id}`,
          html: emailLayout(
            "Transfer expired (recipient-triggered)",
            `<p>Transfer <code>${escapeHtml(xfer.id)}</code> expired
            when recipient ${escapeHtml(user.email ?? "(no email)")} opened
            the link. Sender may want to know.</p>`,
          ),
        });
      } catch (err) {
        // Non-fatal — the flip happened.
        console.error("[xfer-respond · expired notify]", err);
      }
    }
    return NextResponse.json(
      { error: "Transfer expired. Ask the sender to start a new one." },
      { status: 410 },
    );
  }

  if (action === "reject") {
    // CAS-guarded reject (mirrors the accept path below). If a
    // sender's cancel beat us here, the predicate fails and we
    // surface 409 instead of silently overwriting the cancel state.
    const claim = await admin
      .from("share_transfers")
      .update({
        status: "rejected",
        to_user_id: user.id,
        ryda_review_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", xfer.id)
      .eq("status", "requested")
      .select("id")
      .maybeSingle();
    if (!claim.data) {
      return NextResponse.json(
        { error: "Transfer state changed; refresh and try again." },
        { status: 409 },
      );
    }

    await notifyTeam({
      subject: `Share-transfer rejected · ${xfer.id}`,
      html: emailLayout(
        "Transfer rejected",
        `<p>Transfer <code>${escapeHtml(xfer.id)}</code> rejected by recipient
        ${escapeHtml(user.email ?? "(no email)")}.</p>
        ${note ? `<p>Reason: ${escapeHtml(note)}</p>` : ""}`,
      ),
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Accept path: re-verify the SENDER still owns the holding (it
  // could have been refunded, separately transferred, or otherwise
  // mutated between request and accept — windows are up to 14 days).
  const { data: holding } = await admin
    .from("share_holdings")
    .select("id, user_id, transferred_at")
    .eq("id", xfer.holding_id)
    .maybeSingle();
  if (!holding || holding.user_id !== xfer.from_user_id || holding.transferred_at) {
    // Sender no longer owns the share. Mark transfer rejected so
    // both parties see the right state.
    await admin
      .from("share_transfers")
      .update({
        status: "rejected",
        ryda_review_note:
          "Sender no longer holds the share at acceptance time.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", xfer.id)
      .eq("status", "requested");
    return NextResponse.json(
      {
        error:
          "The sender no longer owns this share. Ask them to start a new transfer.",
      },
      { status: 410 },
    );
  }

  // KYC + age gate must both pass before we'll progress to RYDA review.
  // Codex caught that this route only checked KYC status — a recipient
  // under 28 who passed Stripe Identity could still accept a share
  // transfer, putting RYDA in the same ToS breach as the create-checkout
  // bypass. Same `requireMinAge()` helper as create-checkout/intent.
  // readVerifiedOutputs handles the encrypted-vs-plaintext column
  // dual during the migration period.
  const { data: kyc } = await admin
    .from("kyc_verifications")
    .select("status, verified_outputs, verified_outputs_encrypted")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(1);
  if (!kyc || kyc.length === 0) {
    return NextResponse.json(
      {
        error:
          "Complete identity verification before accepting a share transfer.",
        kycRequired: true,
      },
      { status: 409 },
    );
  }
  const recipientVerifiedOutputs = readVerifiedOutputs(kyc[0]);
  const ageGate = requireMinAge(recipientVerifiedOutputs?.dob);
  if (!ageGate.ok) {
    return NextResponse.json(
      { error: ageGate.message, code: ageGate.code },
      { status: 409 },
    );
  }

  // Atomic compare-and-set: only flip 'requested' → 'pending_ryda_review'.
  const claim = await admin
    .from("share_transfers")
    .update({
      status: "pending_ryda_review",
      to_user_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", xfer.id)
    .eq("status", "requested")
    .select("id")
    .maybeSingle();

  if (!claim.data) {
    // Lost a race — someone else (the sender canceling? another
    // tab clicking accept twice?) flipped it before us.
    return NextResponse.json(
      { error: "Transfer state changed; refresh and try again." },
      { status: 409 },
    );
  }

  await notifyTeam({
    subject: `Share-transfer accepted · awaiting RYDA acknowledgment · ${xfer.id}`,
    html: emailLayout(
      "Transfer accepted, RYDA review needed",
      `<p>Transfer <code>${escapeHtml(xfer.id)}</code> accepted by
      ${escapeHtml(user.email ?? "(no email)")}. RYDA legal needs to
      acknowledge before the share_holdings row moves. Open
      /admin/transfers/${escapeHtml(xfer.id)} to act.</p>`,
    ),
  });

  return NextResponse.json({ ok: true, status: "pending_ryda_review" });
}
