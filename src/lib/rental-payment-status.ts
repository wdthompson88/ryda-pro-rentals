// The rental PAYMENT lifecycle, as pure TypeScript (migrations 0041,
// 0047 §7, 0051).
//
// The sibling of rental-booking-status.ts, and the same contract: the
// database trigger rental_payments_enforce_status is the authority, this
// module mirrors it, and the Vitest suite next door parses the SQL and
// fails if the two drift. A route that gets a transition wrong is
// answered by Postgres with `illegal rental_payments status transition:
// x -> y` and a 500; the point of this module is that the route can say
// the same thing first, as a 409, in the same words.
//
// No Supabase client and no `server-only` — pure, so an admin screen can
// render "what can be done with this payment" without a round trip.
//
// ── WHY THIS ONE MATTERS MORE THAN THE BOOKING'S ────────────────────
//
// A booking status describes an intention. A payment status describes
// where money physically is. On the D1 rail the renter is charged on
// RYDA's own platform account, so between `paid` and the operator's
// Transfer, RYDA is holding somebody else's money — and after a
// chargeback it may be holding a debt instead. Getting `disputed` or
// `refunded` wrong is not a UI defect.

/**
 * Every value public.rental_payments.status may hold. Must match
 * rental_payments_status_known (0051) exactly — asserted by the tests.
 *
 * SPELLING, and it is a trap: this table's terminal is `canceled`, ONE
 * L, inherited from 0041. public.rental_bookings (0047) spells its
 * `cancelled` with two. They are different columns on different tables
 * and are never compared, so a shared constant would silently match
 * nothing — the same reason rental-booking-status.ts refuses to define
 * one. Cross-referencing them is always a bug.
 */
export const RENTAL_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "expired",
  "canceled",
  "refunded",
  "disputed",
] as const;

export type RentalPaymentStatus = (typeof RENTAL_PAYMENT_STATUSES)[number];

/**
 * The statuses by name, so nothing outside this file writes one as a
 * bare string. `.eq("status", …)` and `.update({ status: … })` are both
 * untyped at the supabase-js boundary, so a typo compiles, matches no
 * row, and surfaces as a mystery.
 */
export const RENTAL_PAYMENT_STATUS = {
  pending: "pending",
  paid: "paid",
  expired: "expired",
  canceled: "canceled",
  refunded: "refunded",
  disputed: "disputed",
} as const satisfies { [K in RentalPaymentStatus]: K };

/**
 * The legal moves, mirroring 0051's trigger exactly.
 *
 *   pending  → paid | expired | canceled
 *   paid     → refunded | disputed
 *   disputed → refunded | paid
 *
 * `disputed → paid` is a dispute resolved in RYDA's favour. It looks
 * like it reopens a terminal state and it does not: the trigger's
 * immutability rules key on the row having been paid, so the Stripe
 * objects and paid_at stay frozen throughout. Modelling a won dispute as
 * a separate status would mean every revenue query had to know two
 * spellings of "this payment stands", which is how a number quietly
 * starts excluding rows.
 *
 * `refunded`, `expired` and `canceled` are terminal. Money that has been
 * returned is returned; a later charge for the same booking is a NEW row
 * (0041's doctrine, and what rental_payments_one_pending_per_booking
 * keeps honest).
 */
export const RENTAL_PAYMENT_TRANSITIONS: Readonly<
  Record<RentalPaymentStatus, readonly RentalPaymentStatus[]>
> = {
  pending: ["paid", "expired", "canceled"],
  paid: ["refunded", "disputed"],
  disputed: ["refunded", "paid"],
  expired: [],
  canceled: [],
  refunded: [],
} as const;

/** Statuses from which nothing further can happen. */
export const RENTAL_PAYMENT_TERMINAL_STATUSES: readonly RentalPaymentStatus[] =
  RENTAL_PAYMENT_STATUSES.filter(
    (s) => RENTAL_PAYMENT_TRANSITIONS[s].length === 0,
  );

/**
 * Statuses in which RYDA is holding money that is not RYDA's.
 *
 * On the D1 rail the charge lands in RYDA's balance and stays there
 * until the Transfer after a clean return (D4). A row in one of these
 * states is an obligation, and it is the set a payout reconciliation
 * sweeps. `disputed` is included deliberately: the funds may be
 * provisionally withdrawn by the bank, but the operator's claim on them
 * has not been settled either way.
 */
export const RENTAL_PAYMENT_HOLDING_STATUSES: readonly RentalPaymentStatus[] = [
  "paid",
  "disputed",
];

export function isRentalPaymentStatus(
  value: unknown,
): value is RentalPaymentStatus {
  return (
    typeof value === "string" &&
    (RENTAL_PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

/** What may follow `status`. Empty for a terminal state. */
export function nextRentalPaymentStatuses(
  status: RentalPaymentStatus,
): readonly RentalPaymentStatus[] {
  return RENTAL_PAYMENT_TRANSITIONS[status];
}

export function canTransitionRentalPayment(
  from: RentalPaymentStatus,
  to: RentalPaymentStatus,
): boolean {
  return RENTAL_PAYMENT_TRANSITIONS[from].includes(to);
}

export function isTerminalRentalPaymentStatus(
  status: RentalPaymentStatus,
): boolean {
  return RENTAL_PAYMENT_TRANSITIONS[status].length === 0;
}

/** True when RYDA is holding funds it will owe onward. */
export function holdsOperatorFunds(status: RentalPaymentStatus): boolean {
  return RENTAL_PAYMENT_HOLDING_STATUSES.includes(status);
}

/**
 * Throw the same sentence the trigger throws, so a route can refuse
 * before the round trip and a log line reads identically either way.
 */
export function assertRentalPaymentTransition(
  from: RentalPaymentStatus,
  to: RentalPaymentStatus,
): void {
  if (!canTransitionRentalPayment(from, to)) {
    throw new Error(
      `illegal rental_payments status transition: ${from} -> ${to}`,
    );
  }
}
