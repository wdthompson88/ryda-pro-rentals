// GET /api/admin/bookings/calendar
//
// Returns all bookings overlapping a date range, optionally filtered
// by vehicle_symbol or boat_slug. Powers /admin/calendar — the visual
// month grid that surfaces "what's actually scheduled on each hull"
// at a glance.
//
// Query params:
//   from    — YYYY-MM-DD inclusive (required)
//   to      — YYYY-MM-DD inclusive (required)
//   asset   — optional, prefixed: "car:296gtb" or "boat:wajer-55s".
//             Bare strings are treated as either column equal-match.
//
// Returns: { bookings: [...], total: N }
//
// Auth: requireAdmin.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 92; // ~3 months, plenty for a calendar view

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();
  const assetRaw = (url.searchParams.get("asset") ?? "").trim();

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "from and to must be YYYY-MM-DD." },
      { status: 400 },
    );
  }
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
    return NextResponse.json(
      { error: "Invalid date range." },
      { status: 400 },
    );
  }
  if ((toMs - fromMs) / (1000 * 60 * 60 * 24) > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Range too large (max ${MAX_RANGE_DAYS} days).` },
      { status: 400 },
    );
  }

  let db;
  try {
    db = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  // A booking [start, end] overlaps the requested window [from, to]
  // iff start <= to AND end >= from.
  let q = db
    .from("bookings")
    .select(
      "id, user_id, vehicle_symbol, boat_slug, mode, start_date, end_date, status, created_at",
    )
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: true })
    .limit(500);

  if (assetRaw) {
    if (assetRaw.startsWith("car:")) {
      q = q.eq("vehicle_symbol", assetRaw.slice(4));
    } else if (assetRaw.startsWith("boat:")) {
      q = q.eq("boat_slug", assetRaw.slice(5));
    } else {
      // Bare identifier — try both columns (Supabase doesn't support
      // OR on .eq in this fluent builder cleanly; use the .or() syntax).
      q = q.or(`vehicle_symbol.eq.${assetRaw},boat_slug.eq.${assetRaw}`);
    }
  }

  const { data, error } = await q;
  if (error) {
    console.error("[admin/bookings/calendar · query]", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  return NextResponse.json({
    bookings: data ?? [],
    total: data?.length ?? 0,
    range: { from, to },
  });
}
