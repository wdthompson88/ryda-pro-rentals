// /api/admin/partners — Fleet Partner Program review surface.
//
// GET  → { partners: PartnerAccount[] }   (newest application first)
// POST → { userId, status: "approved" | "suspended", note? }
//   Status transitions are validated by canTransitionPartnerStatus
//   (never back to 'pending', no same-state writes). Approving stamps
//   approved_at; every change is audit-logged with prior + new status.
//
// Auth: requireAdmin (app_metadata.role === 'admin') — the only path
// that can change partner status anywhere in the app.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import {
  canTransitionPartnerStatus,
  PARTNER_STATUSES,
  type PartnerAccount,
  type PartnerStatus,
} from "@/lib/partner";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const { data, error } = await db
    .from("partner_accounts")
    .select(
      "user_id, company_name, contact_name, contact_email, phone, website, fleet_size, market, status, status_note, approved_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false });
  if (error) {
    // Surface the raw message so the page can distinguish "run
    // migration 0038" from a real failure.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ partners: (data ?? []) as PartnerAccount[] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { userId?: string; status?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const nextStatus = body.status;
  const note = (body.note ?? "").toString().slice(0, 1000);

  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: "userId must be a UUID." },
      { status: 400 },
    );
  }
  if (!(PARTNER_STATUSES as readonly string[]).includes(nextStatus ?? "")) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'suspended'." },
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

  const { data: row, error: getErr } = await db
    .from("partner_accounts")
    .select("user_id, status, company_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (getErr) {
    return NextResponse.json({ error: getErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json(
      { error: "Partner account not found." },
      { status: 404 },
    );
  }

  const from = row.status as PartnerStatus;
  const to = nextStatus as PartnerStatus;
  if (!canTransitionPartnerStatus(from, to)) {
    return NextResponse.json(
      { error: `Cannot change status ${from} → ${to}.` },
      { status: 400 },
    );
  }

  // status_note is partner-visible (returned by /api/partner/me and
  // readable under the row's own-select RLS policy), so it only holds
  // the suspension notice. Approve notes stay in the audit log below —
  // never on a row the subject of the review can read.
  const update: Record<string, unknown> = {
    status: to,
    status_note: to === "suspended" ? note || null : null,
  };
  if (to === "approved") update.approved_at = new Date().toISOString();

  // Compare-and-swap on the status we validated against: if another
  // admin's change landed between our read and this write, zero rows
  // match and we 409 instead of silently overwriting their decision.
  const { data: updated, error: updErr } = await db
    .from("partner_accounts")
    .update(update)
    .eq("user_id", userId)
    .eq("status", from)
    .select("user_id");
  if (updErr) {
    console.error("[admin/partners · update]", updErr);
    return NextResponse.json(
      { error: "Failed to update partner status." },
      { status: 500 },
    );
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: "Status changed concurrently — reload and retry." },
      { status: 409 },
    );
  }

  await recordAdminAction(db, {
    adminUserId: admin.id,
    action: "partner_status_changed",
    targetType: "partner_account",
    targetId: userId,
    details: {
      company_name: row.company_name,
      prior_status: from,
      new_status: to,
      note: note || undefined,
    },
  });

  return NextResponse.json({ ok: true, userId, status: to });
}
