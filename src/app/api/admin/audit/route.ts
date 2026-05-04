// GET /api/admin/audit
//
// Returns paginated admin_audit_log rows. Used by /admin/audit to
// surface "who did what" for ops and post-mortem investigations.
//
// Query params (all optional):
//   limit       — page size, default 50, max 200
//   offset      — pagination offset, default 0
//   admin       — filter by admin_user_id (uuid)
//   target_type — filter by target_type ('share_purchase', etc.)
//   target_id   — filter by target_id (typically a uuid)
//   action      — filter by action enum
//
// Auth: requireAdmin (app_metadata.role='admin'). Non-admins 403.
// Rate-limited at admin caller scope.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const url = new URL(req.url);
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const rawOffset = Number.parseInt(url.searchParams.get("offset") ?? "", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, rawLimit))
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  const adminFilter = url.searchParams.get("admin");
  const targetType = url.searchParams.get("target_type");
  const targetId = url.searchParams.get("target_id");
  const action = url.searchParams.get("action");

  let q = admin
    .from("admin_audit_log")
    .select(
      "id, admin_user_id, action, target_type, target_id, details, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (adminFilter) q = q.eq("admin_user_id", adminFilter);
  if (targetType) q = q.eq("target_type", targetType);
  if (targetId) q = q.eq("target_id", targetId);
  if (action) q = q.eq("action", action);

  const { data, count, error } = await q;
  if (error) {
    console.error("[admin/audit · query]", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
