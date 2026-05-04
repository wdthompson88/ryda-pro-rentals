// PATCH /api/bookings/[id] — cancel a booking (status -> 'canceled').
// DELETE /api/bookings/[id] — alias for cancel; same effect.
//
// We never hard-delete bookings (audit trail matters for member
// accounting + the rental-pool revenue split downstream). The RLS
// policy lets the user update their own row to status='canceled' only;
// we use the service-role key here so the timestamps update too.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";

async function cancelBooking(req: NextRequest, id: string) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Only the booking owner can cancel. Combine the owner check into
  // the SELECT (eq user_id) so a 404 covers BOTH "no such id" and
  // "not your booking" — no existence-leak for someone else's
  // booking ids.
  const existing = await admin
    .from("bookings")
    .select("id, user_id, status, start_date, end_date, vehicle_symbol, boat_slug")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (existing.data.status === "canceled" || existing.data.status === "completed") {
    return NextResponse.json(
      { error: `Booking is already ${existing.data.status}.` },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[bookings · cancel]", error);
    return NextResponse.json({ error: "Could not cancel booking." }, { status: 500 });
  }

  const assetLabel = existing.data.vehicle_symbol ?? existing.data.boat_slug;
  await notifyTeam({
    subject: `Booking canceled · ${assetLabel}`,
    html: emailLayout(
      "Booking canceled by member",
      `
        <p>${escapeHtml(user.email ?? "Member")} canceled their booking on
        <strong>${escapeHtml(String(assetLabel))}</strong>
        (${escapeHtml(existing.data.start_date)} → ${escapeHtml(existing.data.end_date)}).</p>
      `,
    ),
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return cancelBooking(req, id);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return cancelBooking(req, id);
}
