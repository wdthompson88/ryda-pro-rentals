// GET /api/admin/disputes
//
// Admin-only read endpoint feeding the /admin/disputes triage
// queue. Returns dispute_cases rows with their attached purchase
// + user metadata, ordered by:
//   1. evidence_due_by ASC (most-urgent first)
//   2. created_at DESC (newest first if no due date)
//
// Filter ?status=open  → exclude terminal outcomes (won/lost/withdrawn)
// Filter ?status=all   → everything (default)
// Filter ?status=closed → only terminal
//
// Pagination: limit 50, offset query param.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const url = new URL(req.url);
  const filter = url.searchParams.get("status") ?? "all";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = 50;

  let query = db
    .from("dispute_cases")
    .select(
      `id, stripe_dispute_id, purchase_id, user_id,
       amount_cents, currency, reason, status,
       evidence_due_by, evidence_submitted_at, evidence_notes,
       outcome, outcome_at, ops_alerted_at, member_contacted_at,
       created_at, updated_at,
       share_purchases(email, name, shares, vehicle_symbol, boat_slug, total_cents)`,
    )
    .order("evidence_due_by", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter === "open") {
    query = query.is("outcome", null);
  } else if (filter === "closed") {
    query = query.not("outcome", "is", null);
  }

  const result = await query;
  if (result.error) {
    console.error("[admin/disputes] query failed", result.error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  return NextResponse.json({
    rows: result.data ?? [],
    offset,
    limit,
    filter,
  });
}
