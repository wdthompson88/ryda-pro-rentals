// POST /api/bookings/[id]/handover
//
// Records a vehicle handover (checkin or return) and transitions
// the booking's status accordingly. Member-facing — the caller
// must own the booking.
//
// State machine (matches bookings.status check constraint):
//   confirmed     → in-progress  (checkin)
//   in-progress   → completed    (return)
//
// Body shape:
//   {
//     type: "checkin" | "return",
//     odometer_miles: number,
//     fuel_level_pct: number (0-100),
//     condition_good: boolean,    // member's overall condition
//                                  // declaration; false → diff is real
//     condition_notes?: string,
//     condition_data?: Record<string, "good"|"minor_issue"|"damage"|"unchecked">,
//     photos_taken_count?: number, // for v1 we record the count without
//                                   // requiring upload; signed-PDF audit
//                                   // trail comes via the email digest
//                                   // operations gets after every handover
//     member_signed_name: string,
//   }

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: bookingId } = await params;
  if (!UUID_RE.test(bookingId)) {
    return NextResponse.json(
      { error: "Invalid booking id." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const errors: string[] = [];
  if (
    !isString(body.type) ||
    !["checkin", "return"].includes(body.type)
  ) {
    errors.push("type: must be 'checkin' or 'return'");
  }
  if (
    !isNumber(body.odometer_miles) ||
    !Number.isInteger(body.odometer_miles) ||
    body.odometer_miles < 0
  ) {
    errors.push("odometer_miles: required, non-negative integer");
  }
  if (
    !isNumber(body.fuel_level_pct) ||
    body.fuel_level_pct < 0 ||
    body.fuel_level_pct > 100
  ) {
    errors.push("fuel_level_pct: required, 0-100");
  }
  if (typeof body.condition_good !== "boolean") {
    errors.push("condition_good: required boolean");
  }
  if (
    body.condition_notes != null &&
    (!isString(body.condition_notes) || body.condition_notes.length > 4000)
  ) {
    errors.push("condition_notes: max 4000 chars");
  }
  if (
    body.condition_data != null &&
    (typeof body.condition_data !== "object" ||
      Array.isArray(body.condition_data))
  ) {
    errors.push("condition_data: must be an object");
  }
  if (!isString(body.member_signed_name) || body.member_signed_name.trim().length === 0) {
    errors.push("member_signed_name: required");
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
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

  // Authenticate ownership: the booking must belong to this user.
  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, user_id, status, vehicle_symbol, boat_slug")
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json(
      { error: "Booking not found." },
      { status: 404 },
    );
  }
  if (booking.user_id !== user.id) {
    return NextResponse.json(
      { error: "Not your booking." },
      { status: 403 },
    );
  }

  // Validate the state transition.
  const type = body.type as "checkin" | "return";
  const allowed =
    (type === "checkin" && booking.status === "confirmed") ||
    (type === "return" && booking.status === "in-progress");
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Booking is ${booking.status}; ${type} requires status ${type === "checkin" ? "confirmed" : "in-progress"}.`,
      },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();

  // Record the handover.
  const { data: handover, error: handoverErr } = await db
    .from("vehicle_handovers")
    .insert({
      booking_id: bookingId,
      type,
      odometer_miles: body.odometer_miles,
      fuel_level_pct: body.fuel_level_pct,
      condition_notes: body.condition_notes ?? null,
      condition_data: body.condition_data ?? {},
      // Photo upload skipped for v1 — see route header.
      photo_paths: [],
      member_signed_at: nowIso,
      member_signed_name: (body.member_signed_name as string).trim(),
      created_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (handoverErr || !handover) {
    return NextResponse.json(
      { error: `Handover insert failed: ${handoverErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  // Transition the booking status.
  const nextStatus = type === "checkin" ? "in-progress" : "completed";
  const { error: updateErr } = await db
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", bookingId);

  if (updateErr) {
    return NextResponse.json(
      {
        error: `Booking status transition failed: ${updateErr.message}. Handover ${handover.id} was recorded; ops will reconcile.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    handover_id: handover.id,
    booking_status: nextStatus,
  });
}
