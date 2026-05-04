// POST /api/admin/purchase/[id]/mark-paid
// Body: { note?: string }
//
// Manually flip a share_purchases row from 'pending' (typically a
// non-Stripe funding path: wire / liquidity / crypto / finance)
// to 'paid'. Used by ops once external funds clear. The webhook
// fulfillment path can't be reused here because no Stripe event
// fires for non-Stripe payments — this route does the same work
// inline (compare-and-set, holdings upsert, fulfilled_at stamp).
//
// Audit-logged. Rate-limit not applied (admin-only, low volume).

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id: purchaseId } = await params;
  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  // Atomic CAS pending → paid + stamp paid_at exactly once.
  const claim = await admin
    .from("share_purchases")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseId)
    .eq("status", "pending")
    .select(
      "id, user_id, vehicle_symbol, boat_slug, shares, funding_method",
    )
    .maybeSingle();
  if (!claim.data) {
    return NextResponse.json(
      { error: "Purchase not found or not in pending status." },
      { status: 409 },
    );
  }
  const purchase = claim.data;

  // Mint share_holdings rows (same pattern as the webhook). Cap
  // at 10 defensively — schema check enforces ≤10 too.
  const sharesToCreate = Math.min(10, Math.max(1, purchase.shares));
  const rows = Array.from({ length: sharesToCreate }, (_, i) => ({
    user_id: purchase.user_id,
    vehicle_symbol: purchase.vehicle_symbol,
    boat_slug: purchase.boat_slug,
    shares: 1,
    purchase_id: purchase.id,
    share_index: i + 1,
  }));
  const upsert = await admin
    .from("share_holdings")
    .upsert(rows, {
      onConflict: "purchase_id,share_index",
      ignoreDuplicates: true,
    });
  if (upsert.error) {
    console.error("[admin · mark-paid · holdings]", upsert.error);
    // Don't roll back the status flip — ops can re-run this route
    // (idempotent on holdings) once they fix whatever broke.
    return NextResponse.json(
      {
        error:
          "Status set to paid but holdings upsert failed. Re-run this endpoint to retry.",
      },
      { status: 500 },
    );
  }

  // Stamp fulfilled_at last.
  await admin
    .from("share_purchases")
    .update({ fulfilled_at: new Date().toISOString() })
    .eq("id", purchase.id)
    .is("fulfilled_at", null);

  await recordAdminAction(admin, {
    adminUserId: adminUser.id,
    action: "purchase_marked_paid",
    targetType: "share_purchase",
    targetId: purchase.id,
    details: {
      user_id: purchase.user_id,
      shares: purchase.shares,
      funding_method: purchase.funding_method,
      note: note || null,
    },
  });

  return NextResponse.json({ ok: true, status: "paid" });
}
