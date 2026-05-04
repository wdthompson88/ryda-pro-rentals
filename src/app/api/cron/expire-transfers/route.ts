// GET /api/cron/expire-transfers
//
// Flips share_transfers rows from 'requested' to 'expired' when
// their expires_at has passed. The respond route also lazy-flips
// on read, but lazy-flip only fires when someone visits the
// recipient page; rows that nobody loads sit in 'requested'
// forever without this cron.
//
// Idempotent: runs the same UPDATE every time; rows already
// non-'requested' don't match the WHERE clause and are skipped.
//
// Auth: protected by CRON_SECRET (Vercel cron sets this header
// automatically when the route is wired in vercel.json). Manual
// invocation requires the same secret.
//
// Schedule: hourly is plenty (transfers expire after 14 days; an
// hour of latency between expiry and status flip is fine).

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Auth — Vercel cron passes a Bearer token from CRON_SECRET.
  // For manual invocation, set the header by hand.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  const got = req.headers.get("authorization") ?? "";
  if (got !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("share_transfers")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "requested")
    .lt("expires_at", nowIso)
    .select("id");
  if (error) {
    console.error("[cron · expire-transfers]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  const count = data?.length ?? 0;
  console.log(`[cron · expire-transfers] expired ${count} row(s)`);
  return NextResponse.json({ ok: true, expired: count });
}
