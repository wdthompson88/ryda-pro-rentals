// POST /api/admin/kyc/override
// Body: { userId: string, status: 'verified' | 'requires_action' | 'canceled', note?: string }
//
// Manually flip a member's KYC verification status. Used when
// Stripe Identity rejects a legitimate identity (rare but happens
// on edge cases like recent legal name changes). Inserts an audit
// row + updates the kyc_verifications row in one go.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const ALLOWED = ["verified", "requires_action", "canceled"] as const;

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : null;
  const status = typeof body.status === "string" ? body.status : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
  if (!userId) {
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  }
  if (!status || !(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED.join(", ")}.` },
      { status: 400 },
    );
  }

  // Most-recent row for this user — manual override applies to the
  // latest verification attempt. If none exists, insert a minimal
  // row so future flows see the verified status.
  const { data: latest } = await admin
    .from("kyc_verifications")
    .select("id, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let targetRowId: string;
  let priorStatus: string | null;
  if (latest) {
    targetRowId = latest.id;
    priorStatus = latest.status;
    const update = await admin
      .from("kyc_verifications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", latest.id);
    if (update.error) {
      console.error("[admin · kyc override · update]", update.error);
      return NextResponse.json({ error: "Update failed." }, { status: 500 });
    }
  } else {
    const insert = await admin
      .from("kyc_verifications")
      .insert({
        user_id: userId,
        stripe_verification_id: `manual_${Date.now()}`,
        status,
      })
      .select("id")
      .single();
    if (insert.error || !insert.data) {
      console.error("[admin · kyc override · insert]", insert.error);
      return NextResponse.json({ error: "Insert failed." }, { status: 500 });
    }
    targetRowId = insert.data.id;
    priorStatus = null;
  }

  await recordAdminAction(admin, {
    adminUserId: adminUser.id,
    action: "kyc_override",
    targetType: "kyc_verification",
    targetId: targetRowId,
    details: {
      userId,
      priorStatus,
      newStatus: status,
      note: note || null,
    },
  });

  return NextResponse.json({ ok: true, kycRowId: targetRowId, status });
}
