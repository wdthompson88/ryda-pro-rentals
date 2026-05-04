// POST /api/bookings — create a booking with conflict detection.
// GET  /api/bookings — list the signed-in user's bookings.
//
// Conflict detection: an asset (vehicle_symbol or boat_slug) cannot
// have two overlapping bookings where status ∈ {pending, confirmed,
// in-progress}. We run an existence query before insert.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

const RATE_LIMIT = 30; // bookings flow can fire several requests in a session
const RATE_WINDOW_MS = 60_000;

const ACTIVE_STATUSES = ["pending", "confirmed", "in-progress"];

export async function POST(req: NextRequest) {
  if (!isAllowed(`bookings:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const vehicleSymbol = typeof body.vehicleSymbol === "string" ? body.vehicleSymbol.toUpperCase() : null;
  const boatSlug = typeof body.boatSlug === "string" ? body.boatSlug.toLowerCase() : null;
  const mode = String(body.mode ?? "");
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? "");
  const type = String(body.type ?? "standard");
  const handover = String(body.handover ?? "delivery");
  const notes = String(body.notes ?? "").slice(0, 1000);

  // Validation
  if ((!vehicleSymbol && !boatSlug) || (vehicleSymbol && boatSlug)) {
    return NextResponse.json(
      { error: "Provide exactly one of vehicleSymbol or boatSlug." },
      { status: 400 },
    );
  }
  if (!["short-notice", "planned"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }
  if (!["standard", "event"].includes(type)) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }
  if (!["delivery", "pickup"].includes(handover)) {
    return NextResponse.json({ error: "Invalid handover." }, { status: 400 });
  }
  // Date parsing — both dates must be valid ISO YYYY-MM-DD strings,
  // start <= end, in the future, and within the next 365 days.
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }
  if (start > end) {
    return NextResponse.json({ error: "start_date must be ≤ end_date." }, { status: 400 });
  }
  const todayMs = new Date(new Date().toISOString().slice(0, 10)).getTime();
  if (start.getTime() < todayMs) {
    return NextResponse.json(
      { error: "start_date must be today or in the future." },
      { status: 400 },
    );
  }
  // Cap forward window at 365 days from today; the booking-policy
  // copy says "8–365 days out · planned" so requests beyond that are
  // outside the policy regardless.
  const maxAheadMs = todayMs + 365 * 24 * 60 * 60 * 1000;
  if (end.getTime() > maxAheadMs) {
    return NextResponse.json(
      { error: "end_date must be within 365 days of today." },
      { status: 400 },
    );
  }
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days < 1 || days > 30) {
    return NextResponse.json({ error: "Booking range must be 1–30 days." }, { status: 400 });
  }

  // Existence check on the asset (catches typos in the symbol/slug).
  if (vehicleSymbol && !VEHICLES.find((v) => v.symbol === vehicleSymbol)) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }
  if (boatSlug && !BOATS.find((b) => b.slug === boatSlug)) {
    return NextResponse.json({ error: "Boat not found." }, { status: 404 });
  }

  // Membership check: caller must hold an active share in this asset.
  const holdings = await admin
    .from("share_holdings")
    .select("id")
    .eq("user_id", user.id)
    .is("transferred_at", null)
    .eq(vehicleSymbol ? "vehicle_symbol" : "boat_slug", vehicleSymbol ?? boatSlug)
    .limit(1);
  if (holdings.error) {
    console.error("[bookings · membership check]", holdings.error);
    return NextResponse.json({ error: "Could not verify membership." }, { status: 500 });
  }
  if (!holdings.data || holdings.data.length === 0) {
    return NextResponse.json(
      { error: "You don't hold a share in this asset." },
      { status: 403 },
    );
  }

  // Conflict check: any active booking with overlapping date range on
  // the same asset. Two ranges [a,b] and [c,d] overlap iff a ≤ d AND c ≤ b.
  const conflict = await admin
    .from("bookings")
    .select("id, start_date, end_date, status")
    .in("status", ACTIVE_STATUSES)
    .eq(vehicleSymbol ? "vehicle_symbol" : "boat_slug", vehicleSymbol ?? boatSlug)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);
  if (conflict.error) {
    console.error("[bookings · conflict check]", conflict.error);
    return NextResponse.json({ error: "Could not check availability." }, { status: 500 });
  }
  if (conflict.data && conflict.data.length > 0) {
    return NextResponse.json(
      {
        error: "Those dates overlap with an existing booking on this vehicle.",
        conflict: conflict.data[0],
      },
      { status: 409 },
    );
  }

  // Insert.
  const insert = await admin
    .from("bookings")
    .insert({
      user_id: user.id,
      vehicle_symbol: vehicleSymbol,
      boat_slug: boatSlug,
      mode,
      start_date: startDate,
      end_date: endDate,
      days,
      type,
      handover,
      notes: notes || null,
      status: "pending",
    })
    .select("id, start_date, end_date, days, status")
    .single();

  if (insert.error || !insert.data) {
    // Postgres exclusion-constraint error code is 23P01. Migration
    // 0021 enforces non-overlap at the database level so the TOCTOU
    // race between the conflict check above and this INSERT can't
    // double-book. Surface as 409 with the same shape as the app-
    // level conflict response. Codex round-3 catch.
    const code = (insert.error as { code?: string } | null)?.code;
    if (code === "23P01") {
      return NextResponse.json(
        {
          error: "Those dates overlap with an existing booking on this vehicle.",
          conflict: { reason: "exclusion_violation" },
        },
        { status: 409 },
      );
    }
    console.error("[bookings · insert]", insert.error);
    return NextResponse.json({ error: "Could not create booking." }, { status: 500 });
  }

  // Notify team. Member email goes through the standard notify pipe.
  const assetLabel = vehicleSymbol ?? boatSlug;
  await notifyTeam({
    subject: `Booking pending · ${assetLabel} · ${startDate} → ${endDate}`,
    html: emailLayout(
      "New booking awaiting confirmation",
      `
        <p>${escapeHtml(user.email ?? "Member")} just requested
        <strong>${days} day${days > 1 ? "s" : ""}</strong> on
        <strong>${escapeHtml(String(assetLabel))}</strong> (${escapeHtml(mode)}).</p>
        <p>${escapeHtml(startDate)} → ${escapeHtml(endDate)}</p>
        ${notes ? `<p>Notes: ${escapeHtml(notes)}</p>` : ""}
      `,
    ),
  });

  return NextResponse.json({ booking: insert.data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const vehicleSymbol = url.searchParams.get("vehicleSymbol");
  const boatSlug = url.searchParams.get("boatSlug");
  const upcomingOnly = url.searchParams.get("upcoming") === "1";

  // Mirror POST: at most one asset filter. Both-or-neither was
  // previously silently coerced to vehicle-only.
  if (vehicleSymbol && boatSlug) {
    return NextResponse.json(
      { error: "Provide at most one of vehicleSymbol or boatSlug." },
      { status: 400 },
    );
  }

  // Authorization: when an asset filter is provided, the caller is asking
  // for *other co-owners'* bookings on that asset (calendar view). The
  // RLS policy on `bookings` only allows that read for users who hold an
  // active share — but this route uses the service-role client (admin)
  // which BYPASSES RLS, so we must enforce the same check here in code.
  // Without this, any signed-in user could query any vehicleSymbol or
  // boatSlug and read every co-owner's booking metadata (including
  // user_id, dates, and free-text notes). See migration 0009 §RLS.
  const assetSymbol = vehicleSymbol ? vehicleSymbol.toUpperCase() : null;
  const assetSlug = boatSlug ? boatSlug.toLowerCase() : null;

  if (assetSymbol || assetSlug) {
    const holdings = await admin
      .from("share_holdings")
      .select("id")
      .eq("user_id", user.id)
      .is("transferred_at", null)
      .eq(assetSymbol ? "vehicle_symbol" : "boat_slug", assetSymbol ?? assetSlug)
      .limit(1);
    if (holdings.error) {
      console.error("[bookings · membership check]", holdings.error);
      return NextResponse.json(
        { error: "Could not verify membership." },
        { status: 500 },
      );
    }
    if (!holdings.data || holdings.data.length === 0) {
      // Caller doesn't hold a share in this asset — they have no business
      // seeing other co-owners' bookings. Match RLS behavior: empty list,
      // not 403 (avoids leaking which assets exist).
      return NextResponse.json({ bookings: [] });
    }
  }

  // Calendar view (asset filter present): return only the minimal
  // fields a calendar needs. Hide notes/handover/type AND user_id —
  // returning user_id let any co-owner correlate booking patterns
  // back to specific members across assets, which is creepier than
  // members expect from a calendar widget. We compute `is_self` on
  // the server so the calendar can still render a "You" badge
  // without learning anyone else's user_id.
  const isCalendarView = !!(assetSymbol || assetSlug);
  const calendarColumns =
    "id, user_id, vehicle_symbol, boat_slug, start_date, end_date, status";
  const selectColumns = isCalendarView ? calendarColumns : "*";

  let query = admin
    .from("bookings")
    .select(selectColumns)
    .order("start_date", { ascending: true });

  if (assetSymbol) {
    query = query.eq("vehicle_symbol", assetSymbol);
  } else if (assetSlug) {
    query = query.eq("boat_slug", assetSlug);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (upcomingOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("end_date", today);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[bookings · list]", error);
    return NextResponse.json({ error: "Could not fetch bookings." }, { status: 500 });
  }

  // For calendar view, swap user_id for is_self so cross-owner
  // identification isn't possible. Self-view leaves rows as-is
  // (user is asking for their own data; nothing to redact). Going
  // through `unknown` because supabase-js's ParseQuery generic
  // doesn't widen to Record<string, unknown> on a string-valued
  // dynamic select.
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  if (isCalendarView) {
    const sanitized = rows.map((row) => {
      const owner = row.user_id;
      const { user_id: _strip, ...rest } = row;
      void _strip;
      return { ...rest, is_self: owner === user.id };
    });
    return NextResponse.json({ bookings: sanitized });
  }

  return NextResponse.json({ bookings: rows });
}
