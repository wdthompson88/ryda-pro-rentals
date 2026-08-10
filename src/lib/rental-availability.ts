// Rental availability — the pure date math behind the per-car calendar
// (migration 0046).
//
// 0046 stores an operating window on the listing plus blackout / open
// rows against it; 0047 stores confirmed bookings. Turning those three
// inputs into "which days can this renter click" is arithmetic, so it
// lives here rather than in a route: nothing in this file queries
// Supabase, exactly like rental-listings-db.ts, and every function is
// callable from a server component, an API route, or a test.
//
// Three rules it exists to hold in one place:
//
//   1. UTC OR NOTHING. Every date is a 'YYYY-MM-DD' calendar day, and
//      no local-time accessor (getFullYear, new Date(y, m, d), toLocale*)
//      appears anywhere below. Comparisons are lexicographic on the
//      string — ISO days sort correctly as text, so the common path
//      never constructs a Date at all. Arithmetic goes through
//      Date.UTC-anchored milliseconds, where every day is exactly
//      86_400_000 ms. Local-time day math is wrong twice a year: in a
//      DST-observing zone, new Date(2026,2,10) - new Date(2026,2,7) is
//      2.958 days, not 3, which is what already bit the inquiry form
//      (see the comment at rental-inquiry-form.tsx validate()).
//
//   2. NIGHTS ARE NOT DAYS. A rental from the 5th to the 8th bills
//      THREE nights and occupies FOUR calendar days. Billing uses the
//      difference; occupancy uses the inclusive span, matching the '[]'
//      bound in 0046's and 0021's EXCLUDE constraints — the car is not
//      handed to the next renter on its return day. nightsBetween() is
//      the only place the first rule is expressed; occupiedDays() /
//      expandDays() the only place the second is.
//
//   3. AMBIGUITY FAILS CLOSED. A bound that cannot be parsed, a window
//      that inverts, a range longer than the module will expand — every
//      one of them yields "not available" or throws, never "available".
//      The cost of a wrongly-closed day is a lost request; the cost of a
//      wrongly-open day is two renters at one car.
//
//   4. WHICH BOOKINGS BLOCK A DAY IS NOT THIS MODULE'S OPINION. A day
//      is consumed by a booking exactly when that booking's status
//      appears in rental_bookings_no_overlap's WHERE clause (0047).
//      That list lives in ONE place — RENTAL_BOOKING_RESERVING_STATUSES
//      in rental-booking-status.ts, which its own test derives from the
//      migration text — and this file imports it rather than restating
//      it. A second copy here would be a copy that can drift, and the
//      failure mode of drift is precise: a calendar that offers a day
//      the INSERT then rejects with 23P01, or one that hides a day
//      nobody has taken. See reservingRanges() below.
//
// There is no generated Database type in this repo, so rows are typed by
// hand and cast at the query boundary. Keep RENTAL_AVAILABILITY_COLS
// next to RentalAvailabilityRow — they must drift together, because a
// column-name typo inside a .select() string is not a type error.

import type { RentalListingRow } from "./rental-listings-db";
import {
  RENTAL_BOOKING_RESERVING_STATUSES,
  isRentalBookingStatus,
  reservesRentalDates,
  type RentalBookingStatus,
} from "./rental-booking-status";

/**
 * Re-exported so a calendar call site needs one import, not two, and so
 * that "which statuses hold a date" has a single answer on the read path
 * as well as the write path. The definition stays in
 * rental-booking-status.ts, next to the transition map it belongs to.
 */
export { RENTAL_BOOKING_RESERVING_STATUSES };

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Default for rental_listings.booking_horizon_days (0046). */
export const DEFAULT_BOOKING_HORIZON_DAYS = 180;

/** Ceiling enforced by rental_listings_horizon_range (0046). */
export const MAX_BOOKING_HORIZON_DAYS = 730;

/**
 * How far before the UTC "today" the window may open.
 *
 * Miami is 4-5 hours behind UTC, so from 8pm local the server's UTC date
 * is already tomorrow and a same-day rental would read as a request for
 * yesterday. validateRentalInquiry() in rental-inquiry.ts already grants
 * exactly one day of slack for this, and the two MUST agree: a calendar
 * stricter than the validator hides bookable days, a calendar looser
 * than it offers days the POST then rejects.
 */
export const SAME_DAY_SLACK_DAYS = 1;

/**
 * Hard ceiling on day-by-day expansion. Sized just over the widest legal
 * window (730-day horizon + slack), so it is a guard against a
 * hand-built object, never a real calendar.
 */
export const MAX_EXPAND_DAYS = 800;

export const RENTAL_AVAILABILITY_KINDS = ["blackout", "open"] as const;
export type RentalAvailabilityKind = (typeof RENTAL_AVAILABILITY_KINDS)[number];

export const RENTAL_AVAILABILITY_REASONS = [
  "maintenance",
  "owner_use",
  "off_platform",
  "other",
] as const;
export type RentalAvailabilityReason =
  (typeof RENTAL_AVAILABILITY_REASONS)[number];

/** Row shape of public.rental_availability (migration 0046). */
export type RentalAvailabilityRow = {
  id: string;
  listing_id: string;
  kind: RentalAvailabilityKind;
  /** YYYY-MM-DD, inclusive. */
  start_date: string;
  /** YYYY-MM-DD, inclusive. */
  end_date: string;
  reason: RentalAvailabilityReason | null;
  created_at: string;
  updated_at: string;
};

/** Select list for RentalAvailabilityRow. Must match the type above. */
export const RENTAL_AVAILABILITY_COLS =
  "id, listing_id, kind, start_date, end_date, reason, created_at, updated_at";

/**
 * The operating-window columns 0046 adds to public.rental_listings.
 *
 * Declared here rather than folded into RentalListingRow because that
 * type describes the 0044 read path and is not this task's file to edit;
 * the intersection below is the seam. When 2C wires the server data path
 * these three columns should move onto RentalListingRow and this type
 * should become an alias — one edit, in one place, on purpose.
 */
export type RentalOperatingWindowRow = {
  /** YYYY-MM-DD or null = "from today". */
  available_from: string | null;
  /** YYYY-MM-DD or null = "to the end of the horizon". */
  available_until: string | null;
  booking_horizon_days: number;
};

export const RENTAL_OPERATING_WINDOW_COLS =
  "available_from, available_until, booking_horizon_days";

/**
 * Everything about a listing that constrains its calendar: the window
 * from 0046 plus the per-car rental length from 0044.
 */
export type RentalListingAvailability = RentalOperatingWindowRow &
  Pick<RentalListingRow, "min_nights" | "max_nights">;

/**
 * A closed calendar interval, INCLUSIVE of both endpoints — the '[]'
 * daterange bound used by 0046's rental_availability_no_overlap and by
 * 0021 / 0047 on bookings.
 *
 * Structural on purpose: a RentalAvailabilityRow and a rental_bookings
 * row are both assignable, so neither table needs an adapter to be read
 * against the calendar. What a booking row additionally needs is its
 * STATUS honoured — see BookedRange and reservingRanges().
 */
export type DayRange = {
  start_date: string;
  end_date: string;
};

/**
 * A booking's dates, optionally carrying the status that decides whether
 * they are actually held.
 *
 * `status` is optional so a caller that has already narrowed its query
 * (`.in("status", RENTAL_BOOKING_RESERVING_STATUSES)`) can pass bare
 * ranges. When it IS present it is honoured, which means a caller may
 * also hand over a listing's whole booking list and let this module
 * apply 0047's rule — see reservingRanges().
 */
export type BookedRange = DayRange & {
  /** public.rental_bookings.status (0047). */
  status?: RentalBookingStatus;
};

/** Everything the calendar needs to decide a day. */
export type AvailabilityInput = {
  listing: RentalListingAvailability;
  /** Rows from public.rental_availability for this listing. */
  rows?: readonly RentalAvailabilityRow[];
  /**
   * Ranges consumed by bookings (0047). Passed in rather than read here:
   * 0046 deliberately does not store bookings as blackout rows, and this
   * module deliberately does not query.
   *
   * Rows carrying a `status` are filtered through reservingRanges(), so
   * a `requested` booking does not hide a day the database would still
   * accept — request-to-book (D3) means several renters may be asking
   * for the same week.
   */
  booked?: readonly BookedRange[];
  /** UTC calendar day to treat as "now". Injectable so tests do not race the clock. */
  today?: string;
};

export type RangeRejection =
  | "invalid_dates"
  | "outside_window"
  | "too_short"
  | "too_long"
  | "unavailable";

export type RangeCheck =
  | { ok: true; nights: number }
  | { ok: false; reason: RangeRejection };

// ── Date primitives ─────────────────────────────────────────────────

/**
 * Strict 'YYYY-MM-DD' → UTC-midnight milliseconds, or null.
 *
 * The round-trip is load-bearing, not decoration: V8 accepts
 * new Date('2026-02-31T00:00:00.000Z') and silently rolls it to March
 * 2nd. Re-rendering and comparing is what catches an impossible day, a
 * non-ISO shape ('8/1/2026'), and an unpadded one ('2026-8-1').
 */
export function parseUtcDay(iso: string): number | null {
  if (!ISO_DAY.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  if (new Date(ms).toISOString().slice(0, 10) !== iso) return null;
  return ms;
}

/** The UTC calendar day a Date falls on. Never the local day. */
export function utcDayOf(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Shift a calendar day by whole days, in UTC.
 *
 * Safe across DST precisely because it is UTC: every UTC day is exactly
 * 86_400_000 ms, where a local day is 23 or 25 hours twice a year.
 */
export function addUtcDays(iso: string, days: number): string | null {
  const ms = parseUtcDay(iso);
  if (ms === null || !Number.isInteger(days)) return null;
  const shifted = ms + days * DAY_MS;
  if (!Number.isFinite(shifted)) return null;
  return new Date(shifted).toISOString().slice(0, 10);
}

/**
 * BILLABLE NIGHTS between two calendar days: the 5th → the 8th is 3.
 *
 * Null when either day is unparseable or the range inverts — callers
 * must not silently price a negative stay.
 */
export function nightsBetween(startDate: string, endDate: string): number | null {
  const a = parseUtcDay(startDate);
  const b = parseUtcDay(endDate);
  if (a === null || b === null || b < a) return null;
  // Exact in UTC; Math.round is belt against a non-integral ms input.
  return Math.round((b - a) / DAY_MS);
}

/**
 * Every calendar day a range OCCUPIES, inclusive of both ends: the 5th →
 * the 8th yields four days. This is the set 0021's '[]' EXCLUDE blocks,
 * and it is one longer than nightsBetween() by design — the return day
 * is not resold as the next renter's pickup day.
 *
 * Empty array for an invalid or inverted range (fails closed for a
 * caller asking "which days does this block": nothing is claimed).
 * Over-long ranges THROW rather than truncate: a short list would mark
 * unexamined days open, and the failure mode of that is a double-booked
 * car. This is the one place the module refuses to guess.
 */
export function expandDays(
  range: DayRange,
  maxDays: number = MAX_EXPAND_DAYS,
): string[] {
  const startMs = parseUtcDay(range.start_date);
  const endMs = parseUtcDay(range.end_date);
  if (startMs === null || endMs === null || endMs < startMs) return [];

  const count = Math.round((endMs - startMs) / DAY_MS) + 1;
  if (count > maxDays) {
    throw new RangeError(
      `rental-availability: refusing to expand ${count} days ` +
        `(${range.start_date}..${range.end_date}); max ${maxDays}`,
    );
  }

  const days: string[] = [];
  for (let i = 0; i < count; i += 1) {
    days.push(new Date(startMs + i * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}

/** Alias that names the intent at a booking call site. */
export const occupiedDays = expandDays;

/**
 * Inclusive-inclusive overlap, the JS twin of `daterange(a, b, '[]') &&`.
 *
 * Pure lexicographic comparison — no Date is constructed, so no timezone
 * can enter. Assumes well-formed, ordered ISO days, which the DB
 * guarantees via rental_availability_dates_ordered.
 *
 * Adjacent ranges do NOT overlap (the 3rd→the 4th), matching Postgres's
 * canonicalisation of a '[]' daterange to [start, end+1).
 */
export function rangesOverlap(a: DayRange, b: DayRange): boolean {
  return a.start_date <= b.end_date && b.start_date <= a.end_date;
}

/** Whether a range covers a given calendar day, both ends inclusive. */
export function rangeCoversDay(range: DayRange, day: string): boolean {
  return range.start_date <= day && day <= range.end_date;
}

// ── The 0047 seam ───────────────────────────────────────────────────

/**
 * The subset of a listing's bookings that actually HOLD their dates —
 * the JS twin of `where (status in ('confirmed','in_progress'))` on
 * rental_bookings_no_overlap.
 *
 * This is the one function that keeps the calendar and the database
 * agreeing about what "taken" means. It does not know the list; it asks
 * reservesRentalDates(), whose constant is checked against the
 * migration's own text by rental-booking-status.test.ts. So the chain
 * is: 0047's EXCLUDE → RENTAL_BOOKING_RESERVING_STATUSES → this filter →
 * the days the UI offers. Nothing in it can drift independently.
 *
 * Two inputs are deliberately treated as blocking rather than as free:
 *
 *   a range with NO status — the caller filtered in the query and is
 *   handing over rows it has already decided are held; and
 *
 *   a range whose status is not in the vocabulary at all — a value from
 *   a newer migration this build does not know about. Rule 3: the cost
 *   of a wrongly-closed day is a lost request, the cost of a wrongly-open
 *   day is two renters at one car. Assume it holds the dates.
 */
export function reservingRanges(rows: readonly BookedRange[]): DayRange[] {
  return rows.filter((row) => {
    if (row.status === undefined) return true;
    if (!isRentalBookingStatus(row.status)) return true;
    return reservesRentalDates(row.status);
  });
}

// ── The 0046 constraint, mirrored ───────────────────────────────────

export type AvailabilityCandidate = Pick<
  RentalAvailabilityRow,
  "listing_id" | "kind" | "start_date" | "end_date"
> & { id?: string };

/**
 * The row a candidate would collide with under
 * rental_availability_no_overlap, or null.
 *
 * Scoped by listing AND kind AND overlap, exactly as the EXCLUDE is: two
 * blackouts may not overlap, two open overrides may not, but a blackout
 * and an open override may — that pairing IS the override.
 *
 * A row with the candidate's own id is skipped, because an UPDATE is
 * never checked against itself. This is a pre-flight so the operator
 * dashboard can name the conflicting dates instead of surfacing a raw
 * 23P01; the constraint remains the authority, and the race between this
 * check and the write is exactly what it is there for (0021's lesson).
 */
export function availabilityConflict(
  candidate: AvailabilityCandidate,
  rows: readonly RentalAvailabilityRow[],
): RentalAvailabilityRow | null {
  for (const row of rows) {
    if (candidate.id && row.id === candidate.id) continue;
    if (row.listing_id !== candidate.listing_id) continue;
    if (row.kind !== candidate.kind) continue;
    if (rangesOverlap(row, candidate)) return row;
  }
  return null;
}

// ── The window ──────────────────────────────────────────────────────

/**
 * The span of days a listing is offered at all: the operator's declared
 * season, clipped to the booking horizon.
 *
 * Null means the car is closed — an available_until already in the past,
 * an available_from beyond the horizon, or a bound that will not parse.
 * An unparseable bound closes the window rather than being ignored:
 * ignoring available_until would OPEN days the operator closed.
 */
export function operatingWindow(
  listing: RentalListingAvailability,
  today: string = utcDayOf(),
): DayRange | null {
  const floor = addUtcDays(today, -SAME_DAY_SLACK_DAYS);
  const horizon = Number.isInteger(listing.booking_horizon_days)
    ? Math.min(listing.booking_horizon_days, MAX_BOOKING_HORIZON_DAYS)
    : DEFAULT_BOOKING_HORIZON_DAYS;
  const ceiling = horizon >= 1 ? addUtcDays(today, horizon) : null;
  if (floor === null || ceiling === null) return null;

  let start = floor;
  if (listing.available_from !== null) {
    if (parseUtcDay(listing.available_from) === null) return null;
    if (listing.available_from > start) start = listing.available_from;
  }

  let end = ceiling;
  if (listing.available_until !== null) {
    if (parseUtcDay(listing.available_until) === null) return null;
    if (listing.available_until < end) end = listing.available_until;
  }

  return end < start ? null : { start_date: start, end_date: end };
}

// ── Selectability ───────────────────────────────────────────────────

type Partitioned = {
  blackouts: RentalAvailabilityRow[];
  opens: RentalAvailabilityRow[];
};

/**
 * Split rows by kind, once per query rather than once per day.
 *
 * A row whose kind is neither is dropped: it neither blocks nor opens.
 * The CHECK constraint in 0046 makes that unreachable from the database,
 * so this is the behaviour for a hand-built object only — and "ignore
 * what I cannot interpret" is the right answer for a value that would
 * otherwise have to be guessed into meaning something.
 */
function partition(rows: readonly RentalAvailabilityRow[]): Partitioned {
  const blackouts: RentalAvailabilityRow[] = [];
  const opens: RentalAvailabilityRow[] = [];
  for (const row of rows) {
    if (row.kind === "blackout") blackouts.push(row);
    else if (row.kind === "open") opens.push(row);
  }
  return { blackouts, opens };
}

/**
 * Whether one calendar day can be part of a rental.
 *
 * Precedence, identical to the header of migration 0046:
 *   1. outside the operating window  → closed (an open row cannot
 *      extend the season; to rent outside it, move it)
 *   2. inside a confirmed booking    → closed, unconditionally
 *   3. inside a blackout             → closed unless an open row also
 *      covers the day
 *   4. otherwise                     → open (default-open)
 */
export function isDayOpen(day: string, input: AvailabilityInput): boolean {
  const window = operatingWindow(input.listing, input.today);
  if (!window) return false;
  return isDayOpenIn(
    day,
    window,
    partition(input.rows ?? []),
    reservingRanges(input.booked ?? []),
  );
}

function isDayOpenIn(
  day: string,
  window: DayRange,
  rows: Partitioned,
  booked: readonly DayRange[],
): boolean {
  if (!rangeCoversDay(window, day)) return false;
  if (booked.some((b) => rangeCoversDay(b, day))) return false;

  if (rows.blackouts.some((r) => rangeCoversDay(r, day))) {
    return rows.opens.some((r) => rangeCoversDay(r, day));
  }
  return true;
}

/**
 * Every day a renter may select, ascending.
 *
 * A listing with no availability rows and no bookings returns its whole
 * operating window — absence of data is "open", which is the default-open
 * posture 0046 documents.
 *
 * The window is clamped to MAX_EXPAND_DAYS before expansion. Clamping
 * here is safe in a way clamping a blackout would not be: showing fewer
 * future days under-reports availability (a lost request), where
 * under-reporting a blackout over-reports availability (a double
 * booking). Rule 3 in the file header, applied.
 */
export function selectableDays(input: AvailabilityInput): string[] {
  const window = operatingWindow(input.listing, input.today);
  if (!window) return [];

  const clampedEnd = addUtcDays(window.start_date, MAX_EXPAND_DAYS - 1);
  const end =
    clampedEnd !== null && clampedEnd < window.end_date
      ? clampedEnd
      : window.end_date;

  const rows = partition(input.rows ?? []);
  const booked = reservingRanges(input.booked ?? []);
  return expandDays({ start_date: window.start_date, end_date: end }).filter(
    (day) => isDayOpenIn(day, window, rows, booked),
  );
}

/**
 * Whether a requested range is bookable, and what it bills.
 *
 * Rejection precedence is fixed and tested: invalid_dates →
 * outside_window → too_short → too_long → unavailable. It runs
 * cheapest-and-most-fundamental first so the renter is told the real
 * problem — "that car isn't offered in December" beats "those dates are
 * taken" when both are true.
 *
 * `nights` on success is the billable figure the server quote multiplies
 * by the daily rate (2C). It is NOT the number of days blocked; the
 * range occupies nights + 1 calendar days.
 */
export function checkRange(
  startDate: string,
  endDate: string,
  input: AvailabilityInput,
): RangeCheck {
  const nights = nightsBetween(startDate, endDate);
  if (nights === null) return { ok: false, reason: "invalid_dates" };

  const window = operatingWindow(input.listing, input.today);
  if (!window) return { ok: false, reason: "outside_window" };
  if (startDate < window.start_date || endDate > window.end_date) {
    return { ok: false, reason: "outside_window" };
  }

  if (nights < input.listing.min_nights) return { ok: false, reason: "too_short" };
  if (nights > input.listing.max_nights) return { ok: false, reason: "too_long" };

  const rows = partition(input.rows ?? []);
  const booked = reservingRanges(input.booked ?? []);
  // Inclusive of both endpoints: the return day is occupied too, which
  // is what 0021's '[]' EXCLUDE enforces on the booking itself.
  const days = expandDays({ start_date: startDate, end_date: endDate });
  for (const day of days) {
    if (!isDayOpenIn(day, window, rows, booked)) {
      return { ok: false, reason: "unavailable" };
    }
  }

  return { ok: true, nights };
}
