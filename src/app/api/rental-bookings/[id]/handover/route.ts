// POST /api/rental-bookings/[id]/handover — record a pickup or a return.
// GET  /api/rental-bookings/[id]/handover — both records for a booking.
// (RYDA_RENTAL_BUILD_LOOP.md phase 4C, migration 0053.)
//
// This is the route that closes a booking's life, and the transition it
// causes is what money hangs off: `completed` is decidePayout()'s first
// check, and it is what will release the deposit hold (D5 / 3C).
//
// THE STATUS CHANGE IS NOT MADE HERE. 0053's rental_handovers_advance
// trigger moves the booking in the same transaction as the insert, so
// there is no window in which the evidence exists and the booking has not
// advanced — the failure mode that would leave an operator unpayable with
// photographs proving the trip happened. This route inserts one row and
// translates what the database says about it.
//
// WHO MAY RECORD ONE. Either party to the booking: the operator handing
// over keys, or the renter at the kerb. Both are physically present, both
// have an interest in the readings being right, and demanding it be the
// operator would mean a renter collecting a car from a lockbox cannot
// start their own rental. Whoever submits is stamped in
// recorded_by_user_id, and rental-booking-access.ts decides party
// membership — the same function the decision route authorizes with.
//
// D6 is not at risk here: a handover only exists on a CONFIRMED booking,
// and confirmation is the moment the operator is revealed.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import {
  RENTAL_BOOKING_COLS,
  loadPartnerStaffIds,
  rentalBookingAccess,
  rentalBookingSubject,
  type RentalBookingRow,
} from "@/lib/rental-booking-access";
import {
  checkHandoverAllowed,
  handoverBlockMessage,
  handoverRejectionMessage,
  milesDriven,
  parseHandover,
  type RentalHandoverType,
} from "@/lib/rental-handover";
import type { RentalBookingStatus } from "@/lib/rental-booking-status";

export const runtime = "nodejs";

const IP_LIMIT = 20;
const USER_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HANDOVER_COLS =
  "id, booking_id, type, odometer_miles, fuel_level_pct, condition_notes, " +
  "photo_paths, renter_signed_at, renter_signed_name, operator_signed_at, " +
  "operator_signed_name, created_at";

type HandoverRow = {
  id: string;
  booking_id: string;
  type: RentalHandoverType;
  odometer_miles: number;
  fuel_level_pct: number;
  condition_notes: string | null;
  photo_paths: string[];
  renter_signed_at: string | null;
  renter_signed_name: string | null;
  operator_signed_at: string | null;
  operator_signed_name: string | null;
  created_at: string;
};

function isTableMissing(error: { message?: string } | null): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes("rental_handovers") &&
    (msg.includes("schema cache") || msg.includes("does not exist"))
  );
}

/**
 * Load the booking and establish that the caller is a party to it.
 *
 * Returns the booking plus which party the caller is, because the two
 * signature columns differ by party and the insert needs to know which
 * one it may stamp.
 */
async function authorize(req: NextRequest, bookingId: string) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Sign in first." }, { status: 401 }),
    };
  }

  const db = requireSupabaseAdmin();

  const bookingRes = await db
    .from("rental_bookings")
    .select(RENTAL_BOOKING_COLS)
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingRes.error) {
    console.warn("[handover · booking]", bookingRes.error.message);
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Could not load that booking." },
        { status: 500 },
      ),
    };
  }

  const booking = bookingRes.data as unknown as RentalBookingRow | null;
  if (!booking) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not found." }, { status: 404 }),
    };
  }

  // The listing's owner, for operator-party membership.
  const listingRes = await db
    .from("rental_listings")
    .select("id, partner_id, slug, make, model, year")
    .eq("id", booking.listing_id)
    .maybeSingle();
  const listing = listingRes.data as unknown as {
    id: string;
    partner_id: string;
    slug: string;
    make: string;
    model: string;
    year: number | null;
  } | null;

  const access = rentalBookingAccess(
    {
      userId: user.id,
      partnerIds: await loadPartnerStaffIds(db, user.id),
      isAdmin: false,
    },
    rentalBookingSubject(booking, listing?.partner_id ?? null),
  );

  // 404 rather than 403 for a non-party, matching the other booking
  // routes: whether a given booking id exists is not a stranger's
  // business either way.
  if (!access.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not found." }, { status: 404 }),
    };
  }

  return { ok: true as const, db, user, booking, listing, access };
}

// ── GET ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await authorize(req, id);
  if (!auth.ok) return auth.response;
  const { db } = auth;

  const res = await db
    .from("rental_handovers")
    .select(HANDOVER_COLS)
    .eq("booking_id", id)
    .order("created_at", { ascending: true });

  if (res.error) {
    // Pre-0053 window: no table yet. An empty list is the truthful
    // degraded state — no handovers have been recorded — and it keeps
    // the surface renderable rather than 500ing a booking page.
    if (isTableMissing(res.error)) {
      return NextResponse.json({ handovers: [], milesDriven: null });
    }
    console.warn("[handover · list]", res.error.message);
    return NextResponse.json(
      { error: "Could not load the handover records." },
      { status: 500 },
    );
  }

  const rows = (res.data ?? []) as unknown as HandoverRow[];
  const checkin = rows.find((r) => r.type === "checkin");
  const ret = rows.find((r) => r.type === "return");

  return NextResponse.json({
    handovers: rows,
    // Computed server-side so the two surfaces that will show it cannot
    // arrive at different numbers.
    milesDriven: milesDriven(checkin?.odometer_miles, ret?.odometer_miles),
  });
}

// ── POST ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await isAllowed(`handover:ip:${clientIp(req)}`, IP_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = parseHandover(body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: handoverRejectionMessage(parsed.reason),
        reason: parsed.reason,
      },
      { status: 400 },
    );
  }

  const auth = await authorize(req, id);
  if (!auth.ok) return auth.response;
  const { db, user, booking, access } = auth;

  if (!(await isAllowed(`handover:user:${user.id}`, USER_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  // What already exists, so a duplicate reads as "already recorded"
  // rather than as a 23505 from the unique index.
  const existingRes = await db
    .from("rental_handovers")
    .select("type")
    .eq("booking_id", id);

  if (existingRes.error && !isTableMissing(existingRes.error)) {
    console.warn("[handover · existing]", existingRes.error.message);
    return NextResponse.json(
      { error: "Could not check this booking's records." },
      { status: 500 },
    );
  }
  if (existingRes.error) {
    // Table genuinely absent — 0053 unapplied. Honest 503 rather than an
    // insert that will fail more confusingly a line later.
    return NextResponse.json(
      { error: "Check-in isn't available yet." },
      { status: 503 },
    );
  }

  const existingTypes = ((existingRes.data ?? []) as { type: RentalHandoverType }[])
    .map((r) => r.type);

  const allowed = checkHandoverAllowed(
    parsed.input.type,
    booking.status as RentalBookingStatus,
    existingTypes,
  );
  if (!allowed.ok) {
    return NextResponse.json(
      {
        error: handoverBlockMessage(
          allowed.reason,
          booking.status as RentalBookingStatus,
        ),
        reason: allowed.reason,
      },
      { status: 409 },
    );
  }

  // The signature this caller may stamp. An operator cannot sign for the
  // renter and vice versa — the whole evidentiary value of two signature
  // columns is that each was applied by the party it names.
  const now = new Date().toISOString();
  const signature =
    access.party === "operator"
      ? { operator_signed_at: now }
      : access.party === "renter"
        ? { renter_signed_at: now }
        : {};

  const ins = await db
    .from("rental_handovers")
    .insert({
      booking_id: id,
      type: parsed.input.type,
      odometer_miles: parsed.input.odometerMiles,
      fuel_level_pct: parsed.input.fuelLevelPct,
      condition_notes: parsed.input.conditionNotes,
      photo_paths: parsed.input.photoPaths,
      recorded_by_user_id: user.id,
      ...signature,
    })
    .select(HANDOVER_COLS)
    .single();

  if (ins.error) {
    const code = (ins.error as { code?: string }).code;
    const msg = ins.error.message ?? "";

    // The unique index, if two submits raced past the check above.
    if (code === "23505") {
      return NextResponse.json(
        {
          error: "That's already been recorded for this booking.",
          reason: "already_recorded",
        },
        { status: 409 },
      );
    }

    // 0053's trigger, or 0047's underneath it. Both raise P0001 with a
    // sentence written for a person; passing it through beats replacing
    // it with a generic failure, because the trigger knows things this
    // route re-checked a moment ago and the database re-checked under a
    // lock.
    if (code === "P0001") {
      return NextResponse.json(
        {
          error: msg.replace(/^.*?rental_(handovers|bookings): /, ""),
          reason: "rejected",
        },
        { status: 409 },
      );
    }

    console.warn("[handover · insert]", ins.error.message);
    return NextResponse.json(
      { error: "Could not record that. Try again." },
      { status: 500 },
    );
  }

  // Read the booking back rather than assuming: the trigger moved it, and
  // the client should render what the database now says, not what this
  // route expected it to say.
  const after = await db
    .from("rental_bookings")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json(
    {
      handover: ins.data as unknown as HandoverRow,
      bookingStatus:
        (after.data as { status?: string } | null)?.status ?? booking.status,
    },
    { status: 201 },
  );
}
