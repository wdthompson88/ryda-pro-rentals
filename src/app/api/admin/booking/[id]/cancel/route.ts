// POST /api/admin/booking/[id]/cancel
// Body: { note?: string }
//
// Admin-initiated booking cancellation. Used to resolve booking
// conflicts where two members claim the same date range (e.g. a
// member-side double-booking that slipped past the conflict-check
// race window) — the older booking gets canceled to free the
// slot for the newer / higher-priority one.
//
// Audit-logged.

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

  const { id: bookingId } = await params;
  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  const { data: claim } = await admin
    .from("bookings")
    .update({
      status: "canceled",
      notes: note ? `[admin] ${note}` : "[admin] canceled by admin",
    })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"])
    .select("id, user_id, vehicle_symbol, boat_slug, start_date, end_date")
    .maybeSingle();

  if (!claim) {
    return NextResponse.json(
      {
        error:
          "Booking not found or not in a cancelable state (pending/confirmed only).",
      },
      { status: 409 },
    );
  }

  await recordAdminAction(admin, {
    adminUserId: adminUser.id,
    action: "booking_canceled",
    targetType: "booking",
    targetId: claim.id,
    details: {
      user_id: claim.user_id,
      asset:
        claim.vehicle_symbol ?? claim.boat_slug ?? null,
      dates: `${claim.start_date} to ${claim.end_date}`,
      note: note || null,
    },
  });

  return NextResponse.json({ ok: true, status: "canceled" });
}
