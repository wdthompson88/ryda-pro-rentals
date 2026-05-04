// GET /api/admin/overview
//
// Admin-only read endpoint that returns counts + recent rows for
// the operational triage dashboard:
//   - share_purchases by status (pending, paid, failed, canceled)
//   - bookings by status
//   - kyc_verifications by status
//   - share_transfers by status
//   - 20 most-recent rows per category for spot-checking
//
// Uses the service-role client (bypasses RLS) intentionally —
// admins need to see across all users. Gating is enforced by
// requireAdmin() on app_metadata.role === 'admin' (service-role-
// only writable; user-controlled user_metadata is NOT trusted).

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

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

  // Counts and recent rows in parallel. We batch the count queries
  // via the Supabase head=true + count='exact' pattern so we don't
  // pull every row just to count them.
  const [
    purchasesRecent,
    bookingsRecent,
    kycRecent,
    transfersRecent,
    pendingPurchases,
    failedPurchases,
    paidPurchases,
    pendingBookings,
    pendingTransfers,
  ] = await Promise.all([
    db
      .from("share_purchases")
      .select(
        "id, user_id, email, status, shares, vehicle_symbol, boat_slug, total_cents, fulfilled_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(20),
    db
      .from("bookings")
      .select(
        "id, user_id, vehicle_symbol, boat_slug, mode, start_date, end_date, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("kyc_verifications")
      .select(
        "id, user_id, status, failure_code, failure_reason, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(20),
    db
      .from("share_transfers")
      .select(
        "id, from_user_id, to_user_email, to_user_id, vehicle_symbol, boat_slug, shares, status, expires_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(20),
    db
      .from("share_purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("share_purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    db
      .from("share_purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid"),
    db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("share_transfers")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "accepted", "pending_ryda_review"]),
  ]);

  return NextResponse.json({
    counts: {
      purchases_pending: pendingPurchases.count ?? 0,
      purchases_failed: failedPurchases.count ?? 0,
      purchases_paid: paidPurchases.count ?? 0,
      bookings_pending: pendingBookings.count ?? 0,
      transfers_open: pendingTransfers.count ?? 0,
    },
    recent: {
      purchases: purchasesRecent.data ?? [],
      bookings: bookingsRecent.data ?? [],
      kyc: kycRecent.data ?? [],
      transfers: transfersRecent.data ?? [],
    },
  });
}
