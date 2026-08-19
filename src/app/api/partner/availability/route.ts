// /api/partner/availability — the operator's calendar controls.
// (RYDA_RENTAL_BUILD_LOOP.md task 2F.)
//
// GET    ?listingId=…  → { listing, rows, bookings }  the operator's own
//                        view of one car's calendar: their blackout/open
//                        rows AND the dates that are spoken for, so the
//                        editor can refuse to blackout a sold week.
// POST                 → { row }   create a blackout or an opening.
// DELETE ?id=…         → { ok }    remove one row.
//
// WHY THIS ROUTE IS THE POINT OF THE WHOLE PHASE.
// 0046 makes a listing DEFAULT-OPEN: a car with no rows is bookable for
// the next 180 days. That was the right default — an un-managed calendar
// would otherwise be a dead listing, and the 37-car fleet arrived with no
// per-day data at all — but it is only safe while an operator can
// subtract the days they cannot serve. Until this route existed there was
// no way to write a rental_availability row from anywhere in the product,
// so every seeded car advertised 180 days nobody had agreed to and the
// request inbox absorbed the whole difference. This is the missing half.
//
// AUTH: the service-role client with ownership enforced IN CODE, which is
// RYDA's dominant pattern and guardrail 3.7's instruction for money and
// booking routes. 0046's RLS would also scope these writes
// (rental_availability_manage_operator → is_partner_staff), and it stays
// as the backstop — but the checks here run first so a refusal is a 403
// with a sentence rather than an empty result set.
//
// Every branch resolves the caller's approved partner ids through
// loadPartnerStaffIds() — the same function the booking-decision route
// authorizes with — so "who counts as this operator's staff" has one
// definition across the operator surfaces.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { loadPartnerStaffIds } from "@/lib/rental-booking-access";
import {
  RENTAL_AVAILABILITY_COLS,
  RENTAL_BOOKING_RESERVING_STATUSES,
  type BookedRange,
  type RentalAvailabilityRow,
} from "@/lib/rental-availability";
import {
  availabilityFailureMessage,
  availabilityWriteMessage,
  bookingsBlockingBlackout,
  classifyAvailabilityWriteError,
  parseAvailabilityWrite,
} from "@/lib/partner-availability";

export const runtime = "nodejs";

// Writes, not reads: an operator editing a calendar makes a handful of
// requests, not a stream. Generous enough for a real editing session and
// far below anything that could churn the table.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ListingRow = {
  id: string;
  partner_id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  status: string;
  daily_rate_cents: number;
  available_from: string | null;
  available_until: string | null;
  booking_horizon_days: number;
};

// No commercial columns beyond the operator's own rate, and no renter
// identity anywhere in this file — an operator's calendar view needs to
// know a week is taken, not who took it. The booking select below is
// dates and status only for exactly that reason.
const LISTING_COLS =
  "id, partner_id, slug, make, model, year, status, daily_rate_cents, " +
  "available_from, available_until, booking_horizon_days";

type OperatorContext = {
  db: ReturnType<typeof requireSupabaseAdmin>;
  partnerIds: string[];
};

/**
 * Establish that the caller is approved staff of at least one operator,
 * BEFORE any row is read.
 *
 * Split out from authorizeListing() because DELETE cannot use that one
 * directly: it has to look a row up to learn which listing it belongs to,
 * and doing that lookup first meant an unauthenticated caller reached the
 * "already gone" branch and got a 200. That is an existence oracle for
 * rental_availability ids — harmless-looking, since nothing is deleted
 * and no field comes back, but it answers "is this a real id?" to anyone
 * who can guess a uuid, and it does it without a session. Auth first, row
 * second, ownership third: in that order no branch can answer before the
 * caller has been established.
 */
async function requireOperator(
  req: NextRequest,
): Promise<
  { ok: true; ctx: OperatorContext } | { ok: false; response: NextResponse }
> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in first." }, { status: 401 }),
    };
  }

  if (
    !(await isAllowed(
      `partner-availability:${user.id}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    ))
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many changes at once. Try again in a minute." },
        { status: 429 },
      ),
    };
  }

  const db = requireSupabaseAdmin();
  const partnerIds = await loadPartnerStaffIds(db, user.id);
  if (partnerIds.length === 0) {
    // Not approved staff of any operator. Deliberately the same 403 an
    // operator gets for someone else's car: whether a given listing
    // exists is not this caller's business either way.
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This is an operator surface." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, ctx: { db, partnerIds } };
}

async function authorizeListing(
  req: NextRequest,
  listingId: string,
): Promise<
  | { ok: true; db: ReturnType<typeof requireSupabaseAdmin>; listing: ListingRow }
  | { ok: false; response: NextResponse }
> {
  const gate = await requireOperator(req);
  if (!gate.ok) return gate;
  const { db, partnerIds } = gate.ctx;

  const res = await db
    .from("rental_listings")
    .select(LISTING_COLS)
    .eq("id", listingId)
    .maybeSingle();

  if (res.error) {
    console.warn("[partner-availability · listing]", res.error.message);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Could not load that car." },
        { status: 500 },
      ),
    };
  }

  const listing = res.data as ListingRow | null;
  // One 403 for "no such listing" and for "not yours" — a distinct 404
  // would confirm the existence of another operator's car to anyone who
  // can guess a uuid.
  if (!listing || !partnerIds.includes(listing.partner_id)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "That car isn't yours to manage." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, db, listing };
}

// ── GET ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const listingId = (req.nextUrl.searchParams.get("listingId") ?? "").trim();
  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ error: "Pick a car." }, { status: 400 });
  }

  const auth = await authorizeListing(req, listingId);
  if (!auth.ok) return auth.response;
  const { db, listing } = auth;

  const [rowsRes, bookingsRes] = await Promise.all([
    db
      .from("rental_availability")
      .select(RENTAL_AVAILABILITY_COLS)
      .eq("listing_id", listingId)
      .order("start_date", { ascending: true }),
    // Dates and status only. The operator is entitled to know the car is
    // committed; the renter behind it is disclosed through the booking
    // surfaces (D6), not through a calendar read.
    db
      .from("rental_bookings")
      .select("start_date, end_date, status")
      .eq("listing_id", listingId)
      .in("status", [...RENTAL_BOOKING_RESERVING_STATUSES])
      .order("start_date", { ascending: true }),
  ]);

  if (rowsRes.error) {
    console.warn("[partner-availability · rows]", rowsRes.error.message);
    return NextResponse.json(
      { error: "Could not load that calendar." },
      { status: 500 },
    );
  }
  // A bookings read that fails is NOT downgraded to an empty list: the
  // editor uses it to refuse a blackout over sold days, and an empty list
  // would silently turn that guard off at the moment it matters most.
  if (bookingsRes.error) {
    console.warn("[partner-availability · bookings]", bookingsRes.error.message);
    return NextResponse.json(
      { error: "Could not load that calendar." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    listing: {
      id: listing.id,
      slug: listing.slug,
      make: listing.make,
      model: listing.model,
      year: listing.year,
      status: listing.status,
      dailyRateCents: listing.daily_rate_cents,
      availableFrom: listing.available_from,
      availableUntil: listing.available_until,
      bookingHorizonDays: listing.booking_horizon_days,
    },
    rows: (rowsRes.data ?? []) as RentalAvailabilityRow[],
    bookings: (bookingsRes.data ?? []) as BookedRange[],
  });
}

// ── POST ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);

  const parsed = parseAvailabilityWrite(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: availabilityWriteMessage(parsed.reason), reason: parsed.reason },
      { status: 400 },
    );
  }
  const { listingId, kind, startDate, endDate, reason } = parsed.input;

  const auth = await authorizeListing(req, listingId);
  if (!auth.ok) return auth.response;
  const { db } = auth;

  // THE GUARD THIS ROUTE EXISTS FOR (see partner-availability.ts's
  // header). A blackout over a confirmed booking is a legal write that
  // changes nothing a renter sees — 0046 rule (d) keeps the booking — so
  // accepting it would tell an operator they are protected on days a car
  // is already promised. Refuse and name the dates.
  if (kind === "blackout") {
    const res = await db
      .from("rental_bookings")
      .select("start_date, end_date, status")
      .eq("listing_id", listingId)
      .in("status", [...RENTAL_BOOKING_RESERVING_STATUSES]);

    if (res.error) {
      // Fail CLOSED. Not knowing whether a week is sold is not a licence
      // to blackout over it.
      console.warn("[partner-availability · guard]", res.error.message);
      return NextResponse.json(
        { error: "Could not check your bookings. Try again in a moment." },
        { status: 500 },
      );
    }

    const clashes = bookingsBlockingBlackout(
      { start_date: startDate, end_date: endDate },
      (res.data ?? []) as BookedRange[],
    );
    if (clashes.length > 0) {
      const list = clashes
        .map((c) =>
          c.start_date === c.end_date
            ? c.start_date
            : `${c.start_date} → ${c.end_date}`,
        )
        .join(", ");
      return NextResponse.json(
        {
          error:
            `You have a booking on ${list}. Blocking those days here would not ` +
            `cancel it — the renter would still arrive. Cancel the booking first.`,
          reason: "booked",
          bookings: clashes,
        },
        { status: 409 },
      );
    }
  }

  const ins = await db
    .from("rental_availability")
    .insert({
      listing_id: listingId,
      kind,
      start_date: startDate,
      end_date: endDate,
      reason,
    })
    .select(RENTAL_AVAILABILITY_COLS)
    .single();

  if (ins.error) {
    const failure = classifyAvailabilityWriteError(ins.error);
    if (failure.kind === "unknown") {
      console.warn("[partner-availability · insert]", failure.message);
    }
    return NextResponse.json(
      {
        error: availabilityFailureMessage(failure, kind),
        reason: failure.kind,
      },
      { status: failure.kind === "overlap" ? 409 : 500 },
    );
  }

  return NextResponse.json({ row: ins.data as RentalAvailabilityRow }, { status: 201 });
}

// ── DELETE ──────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Pick an entry to remove." }, { status: 400 });
  }

  // Auth BEFORE the lookup. The row read below reveals whether an id
  // exists, and the "already gone" branch answers 200 — so establishing
  // the caller first is what stops that being a public oracle.
  const gate = await requireOperator(req);
  if (!gate.ok) return gate.response;
  const { db } = gate.ctx;

  // Then two hops: read the row to learn its listing, and authorize that
  // listing. Deleting by (id, listing_id) in one statement would need the
  // caller to send the listing id, and would trust it.
  const rowRes = await db
    .from("rental_availability")
    .select("id, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (rowRes.error) {
    console.warn("[partner-availability · row]", rowRes.error.message);
    return NextResponse.json({ error: "Could not remove that entry." }, { status: 500 });
  }
  const row = rowRes.data as { id: string; listing_id: string } | null;
  if (!row) {
    // Already gone. Idempotent rather than 404: a double-click on Remove
    // should not surface an error for a state the caller wanted anyway.
    // Only reachable by an authenticated operator, so it tells a real
    // operator about an id they were already entitled to act on.
    return NextResponse.json({ ok: true, alreadyGone: true });
  }

  const auth = await authorizeListing(req, row.listing_id);
  if (!auth.ok) return auth.response;

  const del = await db.from("rental_availability").delete().eq("id", id);
  if (del.error) {
    console.warn("[partner-availability · delete]", del.error.message);
    return NextResponse.json({ error: "Could not remove that entry." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
