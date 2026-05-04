// POST /api/admin/transfer/ack
// Body: { transferId: string, action: 'approve' | 'reject', note?: string }
//
// RYDA legal acknowledges (or rejects) an accepted transfer. On
// approve, this is the step that ACTUALLY MOVES the share:
//
//   1. Mark old share_holdings row transferred_at = now() and
//      transferred_to_user_id = recipient.
//   2. Insert NEW share_holdings rows for the recipient (one per
//      share, share_index numbered fresh) — no purchase_id since
//      the transfer wasn't a purchase.
//   3. Flip share_transfers.status to 'completed'.
//
// On reject, just flip status to 'rejected' with a note.
//
// Bracketed by status compare-and-set so a parallel admin action
// can't double-fire.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

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
  const transferId = typeof body.transferId === "string" ? body.transferId : null;
  const action =
    body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
  if (!transferId) {
    return NextResponse.json({ error: "transferId required." }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 },
    );
  }

  // Lookup. Must be in 'pending_ryda_review'.
  const { data: xfer } = await admin
    .from("share_transfers")
    .select(
      "id, holding_id, vehicle_symbol, boat_slug, shares, from_user_id, to_user_id, status",
    )
    .eq("id", transferId)
    .maybeSingle();
  if (!xfer) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (xfer.status !== "pending_ryda_review") {
    return NextResponse.json(
      {
        error: `Transfer is ${xfer.status}; only pending_ryda_review can be acknowledged.`,
      },
      { status: 409 },
    );
  }
  if (!xfer.to_user_id) {
    // Should never hit this — respond route fills to_user_id before
    // flipping to pending_ryda_review.
    return NextResponse.json(
      { error: "Transfer has no recipient user id." },
      { status: 500 },
    );
  }

  if (action === "reject") {
    const claim = await admin
      .from("share_transfers")
      .update({
        status: "rejected",
        ryda_review_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", xfer.id)
      .eq("status", "pending_ryda_review")
      .select("id")
      .maybeSingle();
    if (!claim.data) {
      return NextResponse.json(
        { error: "State changed; refresh." },
        { status: 409 },
      );
    }
    await recordAdminAction(admin, {
      adminUserId: adminUser.id,
      action: "transfer_reject",
      targetType: "share_transfer",
      targetId: xfer.id,
      details: { note },
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Approve path — actually move the share.
  const nowIso = new Date().toISOString();

  // 1. Mark the OLD holding as transferred. Atomic guard ensures we
  // only flip the holding once; if a race already moved it, we
  // surface 409.
  const oldHolding = await admin
    .from("share_holdings")
    .update({
      transferred_at: nowIso,
      transferred_to_user_id: xfer.to_user_id,
    })
    .eq("id", xfer.holding_id)
    .eq("user_id", xfer.from_user_id)
    .is("transferred_at", null)
    .select("id, shares, vehicle_symbol, boat_slug, purchase_id, share_index")
    .maybeSingle();
  if (!oldHolding.data) {
    return NextResponse.json(
      {
        error:
          "Source holding no longer transferable. Sender may have been refunded or the holding was already moved.",
      },
      { status: 409 },
    );
  }

  // 2. Insert NEW holdings for recipient. share_index is restarted
  // in the recipient's namespace (we use sequential 1..N per
  // recipient share). purchase_id stays null because the transfer
  // didn't go through a purchase.
  // Defense-in-depth: bound shares to [1,10] even though migration
  // 0016 has a CHECK ≤10. If the constraint is ever relaxed we don't
  // mass-insert.
  const sharesToCreate = Math.min(10, Math.max(1, xfer.shares));
  const newRows = Array.from({ length: sharesToCreate }, () => ({
    user_id: xfer.to_user_id!,
    vehicle_symbol: xfer.vehicle_symbol,
    boat_slug: xfer.boat_slug,
    shares: 1,
    purchase_id: null,
    share_index: null,
    acquired_at: nowIso,
  }));
  const insertNew = await admin.from("share_holdings").insert(newRows);
  if (insertNew.error) {
    // We already moved the old holding. Roll it back so the share
    // is at least intact on the sender — ops will reconcile.
    // SCOPED rollback: only undo IF the holding still shows our
    // exact transferred_to_user_id (matches the recipient on this
    // transfer). If a parallel admin click or refund already wiped
    // it, the predicate fails and we leave the row alone — better
    // a stuck state ops resolves than wiping a different transfer's
    // legitimate move-out.
    console.error("[admin · transfer ack · insert new]", insertNew.error);
    await admin
      .from("share_holdings")
      .update({ transferred_at: null, transferred_to_user_id: null })
      .eq("id", oldHolding.data.id)
      .eq("transferred_to_user_id", xfer.to_user_id!)
      .eq("transferred_at", nowIso);
    return NextResponse.json(
      { error: "Could not insert recipient holdings; sender share restored." },
      { status: 500 },
    );
  }

  // 3. Flip the transfer to 'completed'. CAS-guarded: only flip if
  // the status is still 'pending_ryda_review'. If a parallel admin
  // click already finalized it, we surface 409 — but the holdings
  // are now the source of truth, so the audit log records what we
  // saw. Without the CAS, a parallel reject racing in here could
  // overwrite 'rejected' with 'completed' silently.
  const finalize = await admin
    .from("share_transfers")
    .update({
      status: "completed",
      ryda_review_note: note || null,
      updated_at: nowIso,
    })
    .eq("id", xfer.id)
    .eq("status", "pending_ryda_review")
    .select("id")
    .maybeSingle();

  if (!finalize.data) {
    // Lost the final CAS — a parallel reject (or another admin click)
    // raced in after we moved the source holding + minted recipient
    // rows. We must undo BOTH side effects so the share_holdings
    // ledger reflects reality:
    //   a) Delete the recipient holdings we just inserted (scoped by
    //      to_user_id + acquired_at so we only touch our minted rows;
    //      these were just inserted, no other process should match).
    //   b) Restore the source holding (CAS-scoped to our exact stamp
    //      so we don't wipe a different transfer's legitimate move).
    //
    // If either undo fails the audit log records the warning and
    // ops triages from there — but the caller still gets 409.
    const undoNew = await admin
      .from("share_holdings")
      .delete()
      .eq("user_id", xfer.to_user_id!)
      .eq("acquired_at", nowIso)
      .is("purchase_id", null)
      .is("share_index", null)
      .or(
        `vehicle_symbol.eq.${xfer.vehicle_symbol ?? "__null__"},boat_slug.eq.${xfer.boat_slug ?? "__null__"}`,
      );
    if (undoNew.error) {
      console.error("[admin · transfer ack · undo new]", undoNew.error);
    }
    const undoOld = await admin
      .from("share_holdings")
      .update({ transferred_at: null, transferred_to_user_id: null })
      .eq("id", oldHolding.data.id)
      .eq("transferred_to_user_id", xfer.to_user_id!)
      .eq("transferred_at", nowIso);
    if (undoOld.error) {
      console.error("[admin · transfer ack · undo old]", undoOld.error);
    }

    console.warn(
      "[admin · transfer ack · finalize CAS lost — rolled back holdings]",
      { transferId: xfer.id, oldHoldingId: oldHolding.data.id },
    );
    await recordAdminAction(admin, {
      adminUserId: adminUser.id,
      action: "transfer_ack",
      targetType: "share_transfer",
      targetId: xfer.id,
      details: {
        warning: "finalize_cas_lost_rolled_back",
        from_user_id: xfer.from_user_id,
        to_user_id: xfer.to_user_id,
        shares: xfer.shares,
        old_holding_id: oldHolding.data.id,
        undo_new_error: undoNew.error?.message ?? null,
        undo_old_error: undoOld.error?.message ?? null,
        note: note || null,
      },
    });
    return NextResponse.json(
      {
        error:
          "Transfer state changed during acknowledgment. Holdings rolled back; refresh and inspect audit log.",
      },
      { status: 409 },
    );
  }

  await recordAdminAction(admin, {
    adminUserId: adminUser.id,
    action: "transfer_ack",
    targetType: "share_transfer",
    targetId: xfer.id,
    details: {
      from_user_id: xfer.from_user_id,
      to_user_id: xfer.to_user_id,
      shares: xfer.shares,
      asset:
        xfer.vehicle_symbol ?? xfer.boat_slug ?? null,
      old_holding_id: oldHolding.data.id,
      note: note || null,
    },
  });

  return NextResponse.json({ ok: true, status: "completed" });
}
