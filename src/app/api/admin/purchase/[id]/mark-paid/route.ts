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

  // ORDER: holdings FIRST, then status flip + paid_at + fulfilled_at
  // in one update. Previous order (status→paid first, then upsert)
  // could leave a row at status='paid', paid_at=now, fulfilled_at=null,
  // holdings=missing if the upsert errored — exactly the drift the
  // PDF Sentry rule warns about. Now: if holdings fails we never
  // flip status, so retries are clean and ops never sees the orphan.
  //
  // Repair path: any row stuck at status='paid' AND fulfilled_at=null
  // (legacy from BEFORE this fix order, or from a future bug) can be
  // re-run through this route. We accept either pending or partially-
  // fulfilled paid rows on lookup, then no-op the status flip if it's
  // already paid (only the holdings + fulfilled_at stamp run).
  const lookup = await admin
    .from("share_purchases")
    .select(
      "id, user_id, vehicle_symbol, boat_slug, shares, funding_method, status, fulfilled_at, paid_at",
    )
    .eq("id", purchaseId)
    .maybeSingle();
  if (!lookup.data) {
    return NextResponse.json(
      { error: "Purchase not found." },
      { status: 404 },
    );
  }
  const isPending = lookup.data.status === "pending";
  const isStuckPaid =
    lookup.data.status === "paid" && lookup.data.fulfilled_at === null;
  if (!isPending && !isStuckPaid) {
    return NextResponse.json(
      { error: `Purchase status is ${lookup.data.status}; nothing to do.` },
      { status: 409 },
    );
  }
  const purchase = lookup.data;

  // 1. Mint share_holdings rows FIRST (idempotent on
  // (purchase_id, share_index) so a retry after a partial flip is
  // safe). Cap at 10 defensively — schema check enforces ≤10 too.
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
    return NextResponse.json(
      {
        error:
          "Holdings upsert failed; purchase status unchanged. Re-run this endpoint to retry.",
      },
      { status: 500 },
    );
  }

  // 2. Stamp the right fields based on whether this was a fresh
  // pending row or a stuck-paid repair.
  const nowIso = new Date().toISOString();
  if (isPending) {
    // Fresh pending → paid: stamp status, paid_at, fulfilled_at, in
    // one CAS update. Guards against a parallel mark-paid advancing
    // the row between our lookup and write.
    const claim = await admin
      .from("share_purchases")
      .update({
        status: "paid",
        paid_at: nowIso,
        fulfilled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", purchase.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claim.data) {
      // Lost the race — another path already flipped status. We
      // already minted holdings (step 1) speculatively; if the
      // status flipped to paid, holdings being there is correct
      // (the other path also wanted them). If status flipped to
      // canceled / failed, holdings are now ORPHANED on an unpaid
      // purchase. Roll back the holdings we just inserted so the
      // ledger doesn't show ownership for canceled work.
      //
      // Re-read to find out which case we're in.
      const reread = await admin
        .from("share_purchases")
        .select("status")
        .eq("id", purchase.id)
        .maybeSingle();
      if (reread.data?.status !== "paid") {
        // Not paid — clean up the holdings we minted. Idempotent
        // delete scoped tightly to (purchase_id, share_index range)
        // so we only touch what we just inserted.
        const cleanup = await admin
          .from("share_holdings")
          .delete()
          .eq("purchase_id", purchase.id);
        if (cleanup.error) {
          console.error(
            "[admin · mark-paid · holdings rollback]",
            cleanup.error,
          );
        }
      }
      return NextResponse.json(
        { error: "Purchase status changed by another process." },
        { status: 409 },
      );
    }
  } else {
    // Stuck-paid repair: holdings just upserted (idempotent), now
    // stamp fulfilled_at if missing. CAS on fulfilled_at IS NULL so
    // a parallel repair doesn't double-stamp.
    await admin
      .from("share_purchases")
      .update({ fulfilled_at: nowIso, updated_at: nowIso })
      .eq("id", purchase.id)
      .eq("status", "paid")
      .is("fulfilled_at", null);
  }

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
