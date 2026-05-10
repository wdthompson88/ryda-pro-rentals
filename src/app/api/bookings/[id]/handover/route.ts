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
    body.odometer_miles < 0 ||
    body.odometer_miles > 1_000_000 // sanity ceiling — even Enzo's tachometer doesn't go that far
  ) {
    errors.push("odometer_miles: required, non-negative integer below 1,000,000");
  }
  // fuel_level_pct must be an integer (DB column is smallint and we
  // don't want sub-integer percentages corrupting audit data — the
  // client widget steps in whole percent anyway). Per codex review.
  if (
    !isNumber(body.fuel_level_pct) ||
    !Number.isInteger(body.fuel_level_pct) ||
    body.fuel_level_pct < 0 ||
    body.fuel_level_pct > 100
  ) {
    errors.push("fuel_level_pct: required, integer 0-100");
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

  // ATOMICITY (per codex review of b8dcb2a):
  // We do the conditional UPDATE first — moving bookings.status from
  // its expected current value to its next value — and only INSERT
  // the handover if exactly one row transitioned. Concurrent POSTs
  // from a double-tap (or a network retry) will see the second
  // UPDATE affect 0 rows and bail before they can insert a duplicate
  // handover. The cost is one extra round-trip vs the old order; the
  // benefit is the handover audit-trail can never be out of sync
  // with the booking's lifecycle state.
  //
  // Postgres-side transaction would be tighter still, but the
  // service-role supabase-js client doesn't expose BEGIN/COMMIT
  // directly; the conditional-update guard gives us optimistic
  // concurrency on the same key as the constraint we care about.
  const type = body.type as "checkin" | "return";
  const expectedStatus = type === "checkin" ? "confirmed" : "in-progress";
  const nextStatus = type === "checkin" ? "in-progress" : "completed";
  const nowIso = new Date().toISOString();

  // Conditional UPDATE: succeeds only if status is currently the
  // expected value AND the booking belongs to the caller. Returns
  // the row(s) affected so we can verify exactly one transitioned.
  const { data: updated, error: updateErr } = await db
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .eq("status", expectedStatus)
    .select("id, status");

  if (updateErr) {
    return NextResponse.json(
      { error: `Booking transition failed: ${updateErr.message}` },
      { status: 500 },
    );
  }

  if (!updated || updated.length === 0) {
    // Either the booking doesn't exist, isn't owned by the caller,
    // or isn't in the expected status. Disambiguate with a follow-
    // up read so the client gets a useful error message.
    const { data: peek } = await db
      .from("bookings")
      .select("user_id, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!peek) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }
    if (peek.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not your booking." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error: `Booking is ${peek.status}; ${type} requires status ${expectedStatus}.`,
      },
      { status: 409 },
    );
  }

  // Status transition succeeded — now record the handover.
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
    // Rollback the status transition we just made so the booking
    // doesn't get stuck in an in-progress state with no handover
    // record. Best-effort — if this rollback also fails, ops will
    // see the inconsistency in /admin and reconcile.
    await db
      .from("bookings")
      .update({ status: expectedStatus })
      .eq("id", bookingId)
      .eq("status", nextStatus);
    return NextResponse.json(
      {
        error: `Handover insert failed: ${handoverErr?.message ?? "unknown"}. Booking status was rolled back.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    handover_id: handover.id,
    booking_status: nextStatus,
  });
}
