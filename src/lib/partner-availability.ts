// The operator's side of the calendar: validating a blackout before it is
// written, and explaining the write when the database refuses it.
// (RYDA_RENTAL_BUILD_LOOP.md task 2F — the availability half.)
//
// WHY THIS EXISTS AS A SEPARATE FILE FROM rental-availability.ts.
// That module answers "is this day open?" for a READER — the browse grid,
// the date picker, the quote. This one answers "may this row be written?"
// for a WRITER, and the two questions have different failure modes: a
// reader that gets it wrong shows a wrong day, a writer that gets it
// wrong strands a renter who has already been told they have the car.
// The read logic is imported rather than restated, so a rule can only be
// expressed once.
//
// NO `server-only` and no Supabase client at module scope, matching
// rental-availability.ts and rental-booking-access.ts — the predicates
// are pure so the Vitest suite can pin them without a database, and so a
// client component can import the vocabulary without dragging the
// service-role key's module graph into the bundle.
//
// ── THE ONE RULE THAT IS NOT IN THE DATABASE ────────────────────────
//
// 0046 documents its precedence, and rule (d) is: a confirmed booking
// beats every availability row. That is deliberately one-directional and
// it is about READING — a blackout written after a booking was confirmed
// must not un-book a renter whose dates are held. The database enforces
// the other direction (0047's rental_bookings_assert_dates_free stops a
// booking confirming INTO a blackout) but it does not, and should not,
// stop an operator writing a blackout over a booking that already exists.
//
// So at the database layer that write SUCCEEDS and changes nothing the
// renter can see. Which is exactly why it must be refused HERE. An
// operator blacking out next week means "I cannot serve these days"; if
// three of those days are already sold, silently accepting the row tells
// them they are protected while the renter still arrives expecting keys.
// The honest answer names the booking and makes them cancel it — a
// deliberate act with a notification attached — rather than letting a
// calendar edit quietly become a no-op.
//
// This is a route-level rule and not a trigger because it is a matter of
// INTENT, not integrity: the same row is legitimate when an admin writes
// it to reflect a cancellation that already happened. The database keeps
// the invariant that money depends on; this keeps the operator honest
// with themselves.

import {
  RENTAL_AVAILABILITY_KINDS,
  RENTAL_AVAILABILITY_REASONS,
  addUtcDays,
  parseUtcDay,
  rangesOverlap,
  reservingRanges,
  utcDayOf,
  type BookedRange,
  type DayRange,
  type RentalAvailabilityKind,
  type RentalAvailabilityReason,
} from "./rental-availability";

/** UUID shape, matching the booking routes' UUID_RE. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The longest range one row may cover, in days (inclusive of both ends).
 *
 * 730 matches rental_listings_horizon_range's ceiling in 0046: a single
 * row can therefore blanket the furthest horizon a listing may declare,
 * and nothing longer is expressible anyway. The bound exists so a typo'd
 * year ("2126-08-10") is rejected by name here instead of expanding into
 * a range the read path refuses to walk (MAX_EXPAND_DAYS).
 */
export const MAX_AVAILABILITY_RANGE_DAYS = 730;

/**
 * How far into the past a row may start. Zero: an operator may blackout
 * from today, but not backwards.
 *
 * Backdating is refused rather than clamped because the two readings of
 * it differ and only one is safe. "Block the 3rd through the 20th" typed
 * on the 10th might mean the operator wants the rest of that span — or it
 * might be last year's dates pasted by mistake. Clamping silently picks
 * one; refusing makes them say. Days already past are not selectable on
 * any renter surface (operatingWindow floors the window at today), so
 * nothing is lost by insisting.
 */
export const MAX_BACKDATE_DAYS = 0;

export type AvailabilityWriteInput = {
  listingId: string;
  kind: RentalAvailabilityKind;
  startDate: string;
  endDate: string;
  reason: RentalAvailabilityReason | null;
};

export type AvailabilityWriteRejection =
  | "bad_listing_id"
  | "bad_kind"
  | "bad_dates"
  | "dates_reversed"
  | "range_too_long"
  | "starts_in_past"
  | "bad_reason";

export type AvailabilityWriteParse =
  | { ok: true; input: AvailabilityWriteInput }
  | { ok: false; reason: AvailabilityWriteRejection };

function isKind(v: unknown): v is RentalAvailabilityKind {
  return (
    typeof v === "string" &&
    (RENTAL_AVAILABILITY_KINDS as readonly string[]).includes(v)
  );
}

function isReason(v: unknown): v is RentalAvailabilityReason {
  return (
    typeof v === "string" &&
    (RENTAL_AVAILABILITY_REASONS as readonly string[]).includes(v)
  );
}

/**
 * Validate an untrusted request body into the row a route may insert.
 *
 * Order matters and is chosen so the message a caller gets names the
 * FIRST thing wrong rather than the last: identity, then vocabulary,
 * then dates. `reason` is checked last because it is the only optional
 * field, and an unknown reason is the least consequential error here —
 * unlike `kind`, where an unrecognised value would be dropped by
 * partition() in rental-availability.ts and silently resolve to "not a
 * blackout, therefore bookable" (0046's own warning).
 */
export function parseAvailabilityWrite(
  raw: unknown,
  today: string = utcDayOf(),
): AvailabilityWriteParse {
  const b = (raw ?? {}) as Record<string, unknown>;

  const listingId = typeof b.listingId === "string" ? b.listingId.trim() : "";
  if (!UUID_RE.test(listingId)) return { ok: false, reason: "bad_listing_id" };

  if (!isKind(b.kind)) return { ok: false, reason: "bad_kind" };

  const startDate = typeof b.startDate === "string" ? b.startDate.trim() : "";
  const endDate = typeof b.endDate === "string" ? b.endDate.trim() : "";
  const start = parseUtcDay(startDate);
  const end = parseUtcDay(endDate);
  if (start === null || end === null) return { ok: false, reason: "bad_dates" };
  if (end < start) return { ok: false, reason: "dates_reversed" };

  // Inclusive on both ends (0046), so a same-day row is 1 day, not 0.
  const days = Math.round((end - start) / 86_400_000) + 1;
  if (days > MAX_AVAILABILITY_RANGE_DAYS) {
    return { ok: false, reason: "range_too_long" };
  }

  const floor = addUtcDays(today, -MAX_BACKDATE_DAYS);
  if (floor !== null && startDate < floor) {
    return { ok: false, reason: "starts_in_past" };
  }

  let reason: RentalAvailabilityReason | null = null;
  if (b.reason !== undefined && b.reason !== null && b.reason !== "") {
    if (!isReason(b.reason)) return { ok: false, reason: "bad_reason" };
    reason = b.reason;
  }

  return {
    ok: true,
    input: { listingId, kind: b.kind, startDate, endDate, reason },
  };
}

/** Operator-facing copy for a rejected write. */
export function availabilityWriteMessage(
  reason: AvailabilityWriteRejection,
): string {
  switch (reason) {
    case "bad_listing_id":
      return "That car isn't one we can find.";
    case "bad_kind":
      return "Choose whether these days are blocked or re-opened.";
    case "bad_dates":
      return "Pick a start and end date.";
    case "dates_reversed":
      return "The end date must be on or after the start date.";
    case "range_too_long":
      return `A single entry can cover at most ${MAX_AVAILABILITY_RANGE_DAYS} days. Split it into two.`;
    case "starts_in_past":
      return "You can block from today onward, not in the past.";
    case "bad_reason":
      return "Pick one of the listed reasons, or leave it blank.";
  }
}

/**
 * The confirmed bookings a proposed blackout would cover.
 *
 * Only meaningful for kind='blackout'. An 'open' row ADDS days, so it can
 * never strand a renter and is not checked — and it must not be, since
 * re-opening a day around an existing booking is exactly how an operator
 * corrects an over-broad blackout.
 *
 * reservingRanges() decides what "booked" means, so this cannot come to
 * disagree with the read path or with 0047's EXCLUDE about which statuses
 * hold dates. A cancelled or declined booking is not in that set and does
 * not block the operator.
 */
export function bookingsBlockingBlackout(
  range: DayRange,
  bookings: readonly BookedRange[],
): DayRange[] {
  return reservingRanges(bookings).filter((b) => rangesOverlap(b, range));
}

export type AvailabilityWriteFailure =
  | { kind: "overlap" }
  | { kind: "not_found" }
  | { kind: "unknown"; message: string };

/**
 * Translate a Postgres error from the insert into something an operator
 * can act on.
 *
 * 23P01 is rental_availability_no_overlap (0046 §3): two rows of the SAME
 * kind may not overlap on one listing. It is not a race the way 0047's
 * 23P01 is — nobody else is editing this operator's calendar — it just
 * means they already have an entry covering some of those days. The fix
 * is to edit or delete that one, so the message says so rather than
 * inviting a retry that would fail identically.
 */
export function classifyAvailabilityWriteError(
  error: { code?: string; message?: string } | null,
): AvailabilityWriteFailure {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();

  if (code === "23P01" || msg.includes("rental_availability_no_overlap")) {
    return { kind: "overlap" };
  }
  // FK violation: the listing id parsed but names no row.
  if (code === "23503" || msg.includes("rental_availability_listing_id_fkey")) {
    return { kind: "not_found" };
  }
  return { kind: "unknown", message: error?.message ?? "Unknown error" };
}

/** Operator-facing copy for a failed write. */
export function availabilityFailureMessage(
  failure: AvailabilityWriteFailure,
  kind: RentalAvailabilityKind,
): string {
  switch (failure.kind) {
    case "overlap":
      return kind === "blackout"
        ? "You already have blocked dates overlapping those days. Edit or remove that entry instead."
        : "You already have an opening overlapping those days. Edit or remove that entry instead.";
    case "not_found":
      return "That car isn't one we can find.";
    case "unknown":
      return "Could not save those dates. Try again in a moment.";
  }
}
