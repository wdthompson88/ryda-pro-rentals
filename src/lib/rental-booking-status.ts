// The rental booking lifecycle, as pure TypeScript (migration 0047).
//
// One definition, three consumers: the booking routes (build loop 2D),
// their tests, and — by mirroring rather than by import, because SQL
// cannot import TypeScript — the database trigger
// rental_bookings_enforce_status.
//
// The trigger is the authority. A route that gets this wrong is
// answered by Postgres with `illegal rental_bookings status transition:
// x -> y` and a 500; the point of this module is that the route can say
// the same thing first, as a 409, with the same words. The Vitest suite
// next door parses 0047_rental_bookings.sql and fails if the two ever
// drift — so if you change a transition here, change it there, and the
// test will tell you if you only did one.
//
// No import of the Supabase client, no `server-only`: this is a pure
// module so a client component can render "what can I do with this
// booking" without a round trip.

/**
 * Every value public.rental_bookings.status may hold. Must match the
 * CHECK constraint in migration 0047 exactly — asserted by the tests.
 *
 * Note the spelling: this table's terminal is `cancelled` (two Ls).
 * public.rental_payments (0041) and the co-ownership public.bookings
 * (0009) both spell theirs `canceled`. They are different columns on
 * different tables and are never compared, but a shared constant would
 * silently match nothing — so there deliberately is not one.
 */
export const RENTAL_BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "declined",
  "expired",
  "cancelled",
] as const;

export type RentalBookingStatus = (typeof RENTAL_BOOKING_STATUSES)[number];

/**
 * The legal transition map, mirroring the trigger in 0047 §4.
 *
 * Typed as a total Record over the union, which is what makes it
 * self-maintaining: adding a status to RENTAL_BOOKING_STATUSES without
 * giving it a row here is a compile error, not a runtime surprise.
 *
 * Two entries carry decisions worth knowing before you edit them:
 *
 *   confirmed does NOT go to `declined`. `declined` is the operator's
 *   answer to a request; an operator backing out after confirmation is
 *   a cancellation, and open item O3 refunds the two differently.
 *
 *   in_progress goes only to `completed`. Once the car is out, the trip
 *   ends by the car coming back — damage or lateness is a deposit claim
 *   against the payment (3C/3D), not a rewrite of the booking.
 */
export const RENTAL_BOOKING_TRANSITIONS: Readonly<
  Record<RentalBookingStatus, readonly RentalBookingStatus[]>
> = {
  requested: ["confirmed", "declined", "expired", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  // Terminal. An empty row is the whole of "terminal stays terminal" —
  // there is no separate terminal list to keep in step.
  completed: [],
  declined: [],
  expired: [],
  cancelled: [],
};

/**
 * The statuses that actually hold the dates — the exact list in
 * 0047's `rental_bookings_no_overlap` EXCLUDE constraint.
 *
 * `requested` is absent on purpose. Request-to-book (D3) means several
 * renters may be asking for the same week at once and the operator
 * picks; the reservation fires on the transition to `confirmed`, which
 * is also when the card is charged. Use this to decide whether a status
 * change can lose a same-date race — and expect a 23P01 from the
 * database when it does.
 */
export const RENTAL_BOOKING_RESERVING_STATUSES = [
  "confirmed",
  "in_progress",
] as const;

/** Statuses with no way out. Derived, so it cannot drift from the map. */
export const RENTAL_BOOKING_TERMINAL_STATUSES: readonly RentalBookingStatus[] =
  RENTAL_BOOKING_STATUSES.filter(
    (status) => RENTAL_BOOKING_TRANSITIONS[status].length === 0,
  );

/** Narrow an unknown (a query result, a request body) to the union. */
export function isRentalBookingStatus(
  value: unknown,
): value is RentalBookingStatus {
  return (
    typeof value === "string" &&
    (RENTAL_BOOKING_STATUSES as readonly string[]).includes(value)
  );
}

/** Where a booking in this status may go next. */
export function nextRentalBookingStatuses(
  from: RentalBookingStatus,
): readonly RentalBookingStatus[] {
  return RENTAL_BOOKING_TRANSITIONS[from];
}

/**
 * True when this status change is legal IN THE ABSTRACT — i.e. when the
 * trigger's transition table permits the pair.
 *
 * `from === to` is TRUE, deliberately: the trigger only evaluates its
 * transition table when `new.status is distinct from old.status`, so a
 * same-status UPDATE (stamping `expires_at`, say) passes. This function
 * reports what the database does, not a stricter opinion of its own.
 * If you need "does this strictly advance the booking", read
 * RENTAL_BOOKING_TRANSITIONS directly.
 *
 * NOT a complete predictor of the write succeeding. Three rules in the
 * trigger depend on state this module cannot see, and each raises even
 * though the pair below is legal:
 *
 *   requested -> confirmed  is refused once `expires_at` has passed
 *                           (O5 is enforced, not advisory).
 *   -> completed            is refused before `start_date` — a trip
 *                           cannot end before it begins.
 *   -> cancelled            requires `cancelled_by`, because O3 prices
 *                           a renter and an operator cancellation
 *                           differently.
 *
 * Plus the two cross-table checks on the transition INTO a reserving
 * status: the dates must not be blacked out (0046) and must not already
 * be held on another listing for the same VIN. A route should still
 * expect the database to have the last word.
 */
export function canTransitionRentalBooking(
  from: RentalBookingStatus,
  to: RentalBookingStatus,
): boolean {
  if (from === to) return true;
  return RENTAL_BOOKING_TRANSITIONS[from].includes(to);
}

/** True when nothing can follow this status. */
export function isTerminalRentalBookingStatus(
  status: RentalBookingStatus,
): boolean {
  return RENTAL_BOOKING_TRANSITIONS[status].length === 0;
}

/**
 * True when a booking in this status is holding its dates against the
 * EXCLUDE constraint.
 */
export function reservesRentalDates(status: RentalBookingStatus): boolean {
  return (RENTAL_BOOKING_RESERVING_STATUSES as readonly string[]).includes(
    status,
  );
}

/**
 * Throw on an illegal transition, with the trigger's own message.
 *
 * The wording is copied from 0047 so a route-level rejection and a
 * database-level rejection read identically in logs — one string to
 * search for, whichever layer caught it.
 */
export function assertRentalBookingTransition(
  from: RentalBookingStatus,
  to: RentalBookingStatus,
): void {
  if (!canTransitionRentalBooking(from, to)) {
    throw new Error(
      `illegal rental_bookings status transition: ${from} -> ${to}`,
    );
  }
}
