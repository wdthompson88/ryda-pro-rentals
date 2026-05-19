// POST /api/admin/users/role
//
// Grant or revoke the admin role on a user by mutating
// auth.users.app_metadata.role via service-role. This is the same
// mechanism the scripts/grant-admin.ts CLI tool uses; surfacing it
// through an admin-gated endpoint lets ops grant access from the
// console instead of dropping to a terminal.
//
// Body: { userId: uuid, action: "grant" | "revoke", note?: string }
//
// Auth: requireAdmin (app_metadata.role === 'admin').
//
// Guardrails:
//   - You cannot revoke your own admin role (avoid lock-out). If you
//     need to demote yourself, ask another admin or run the SQL
//     directly.
//   - Both grant + revoke are audit-logged with the prior + new role.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { userId?: string; action?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const action = body.action;
  const note = (body.note ?? "").toString().slice(0, 1000);

  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: "userId must be a UUID." },
      { status: 400 },
    );
  }
  if (action !== "grant" && action !== "revoke") {
    return NextResponse.json(
      { error: "action must be 'grant' or 'revoke'." },
      { status: 400 },
    );
  }
  if (userId === adminUser.id && action === "revoke") {
    return NextResponse.json(
      {
        error:
          "You cannot revoke your own admin role from this endpoint. Ask another admin.",
      },
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

  // Pull the target user's current metadata so we (a) merge non-role
  // keys instead of clobbering them, and (b) record the prior role
  // in the audit log.
  const { data: getRes, error: getErr } = await db.auth.admin.getUserById(
    userId,
  );
  if (getErr || !getRes?.user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  const existingMeta =
    (getRes.user.app_metadata as Record<string, unknown> | undefined) ?? {};
  const priorRole = existingMeta.role ?? null;

  const nextMeta = { ...existingMeta };
  if (action === "grant") {
    nextMeta.role = "admin";
  } else {
    delete nextMeta.role;
  }

  const { error: updErr } = await db.auth.admin.updateUserById(userId, {
    app_metadata: nextMeta,
  });
  if (updErr) {
    console.error("[admin/users/role · update]", updErr);
    return NextResponse.json(
      { error: "Failed to update user role." },
      { status: 500 },
    );
  }

  await recordAdminAction(db, {
    adminUserId: adminUser.id,
    action: action === "grant" ? "role_granted" : "role_revoked",
    targetType: "auth_user",
    targetId: userId,
    details: {
      target_email: getRes.user.email ?? null,
      prior_role: priorRole,
      new_role: action === "grant" ? "admin" : null,
      note: note || undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    userId,
    role: action === "grant" ? "admin" : null,
  });
}
