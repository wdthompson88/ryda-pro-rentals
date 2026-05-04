// POST /api/share-transfer/[id]/cancel
//
// Sender-initiated cancellation of an open transfer request. Only
// the from_user_id can call. Only flips 'requested' → 'rejected'
// (with a 'canceled by sender' note). Other statuses 409.
//
// We use 'rejected' as the terminal status (instead of adding a
// distinct 'canceled') to keep the share_transfers status enum
// small. The ryda_review_note distinguishes "recipient declined"
// from "sender canceled" for ops.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";

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
    !isAllowed(
      `xfer-cancel:${user.id}:${clientIp(req)}`,
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
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }
  const { id: transferId } = await params;

  // Lookup + ownership check.
  const { data: xfer } = await admin
    .from("share_transfers")
    .select("id, from_user_id, status")
    .eq("id", transferId)
    .maybeSingle();
  if (!xfer || xfer.from_user_id !== user.id) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (xfer.status !== "requested") {
    return NextResponse.json(
      { error: `Transfer is already ${xfer.status}; can't cancel.` },
      { status: 409 },
    );
  }

  // Atomic CAS: only flip if still 'requested' — recipient might
  // have just accepted in another tab.
  const claim = await admin
    .from("share_transfers")
    .update({
      status: "rejected",
      ryda_review_note: "Canceled by sender",
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

  return NextResponse.json({ ok: true });
}
