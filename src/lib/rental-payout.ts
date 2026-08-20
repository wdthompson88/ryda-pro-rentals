// Does RYDA owe this operator money for this booking, how much, and if
// not — why not. (RYDA_RENTAL_BUILD_LOOP.md phase 3B, decision D4.)
//
// Pure: no Supabase client, no `server-only`, no Stripe. The payout route
// and the reconciliation view both decide with this function, so "what do
// we owe" cannot come to have two answers — and the admin screen that
// shows a blocked payout shows the same reason the route would refuse
// with.
//
// ── THE SHAPE OF THE RISK ───────────────────────────────────────────
//
// On the D1 rail RYDA charges the renter on its own account, holds the
// money, and transfers the operator's net after a clean return. Between
// those two events RYDA is holding somebody else's money, and there are
// exactly two ways to get that wrong:
//
//   PAY WHEN IT IS NOT OWED — pay twice, pay for a booking that was
//   refunded, pay before the trip happened, pay from a charge that never
//   landed. Every one of these moves real money out of RYDA's balance
//   and none of them is reversible by a database rollback.
//
//   FAIL TO PAY WHEN IT IS OWED — quieter, and worse for the operator.
//   Money sits in RYDA's balance while an operator waits, and nothing
//   surfaces it unless something is deliberately looking. That is what
//   the reconciliation half is for.
//
// This module is written to make the first impossible and the second
// visible. Every refusal carries a machine-readable reason so the sweep
// can group by it, because "12 payouts blocked" is not actionable and
// "12 blocked: 9 operators not payout-enabled, 3 awaiting return" is.

import {
  holdsOperatorFunds,
  type RentalPaymentStatus,
} from "./rental-payment-status";
import type { RentalBookingStatus } from "./rental-booking-status";

/** Stripe's `capabilities.transfers` value that permits a transfer in. */
export const TRANSFERS_CAPABILITY_ACTIVE = "active";

/**
 * How stale a cached payout-readiness answer may be before the
 * reconciliation view flags it. Not a gate — the payout route re-checks
 * with Stripe regardless — but a roster whose readiness was last
 * confirmed months ago is reporting history, not state.
 */
export const PAYOUT_STATUS_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** The operator, as a payout decision needs them. */
export type PayoutPartner = {
  id: string;
  name: string;
  stripe_account_id: string | null;
  payouts_enabled: boolean;
  details_submitted: boolean;
  transfers_capability: string | null;
  payout_status_at: string | null;
};

/** The booking, as a payout decision needs it. */
export type PayoutBooking = {
  id: string;
  status: RentalBookingStatus;
  end_date: string;
};

/** The ledger row that funded it. */
export type PayoutPayment = {
  id: string;
  status: RentalPaymentStatus;
  operator_net_cents: number | null;
  refunded_cents: number;
  stripe_transfer_id: string | null;
  transferred_at: string | null;
};

export type PayoutBlockReason =
  | "booking_not_completed"
  | "no_payment"
  | "payment_not_settled"
  | "payment_refunded"
  | "payment_disputed"
  | "already_transferred"
  | "no_connect_account"
  | "details_not_submitted"
  | "payouts_disabled"
  | "transfers_capability_inactive"
  | "nothing_owed";

export type PayoutDecision =
  | { payable: true; amountCents: number; partnerId: string; paymentId: string }
  | { payable: false; reason: PayoutBlockReason; amountCents: number };

/**
 * Decide whether this booking's operator may be paid now.
 *
 * ORDER IS THE DESIGN. The checks run booking → money → operator, and a
 * caller shows the FIRST reason, because that is the one whose fix
 * unblocks the rest. Telling an operator their Stripe details are
 * incomplete on a booking whose trip has not happened sends them to fix
 * something that was never the obstacle.
 *
 * `nothing_owed` is deliberately not an error state — a booking whose
 * operator net is zero (a fee that consumed the whole base) is fully
 * settled by paying nothing, and a transfer of 0 is an API error.
 */
export function decidePayout(input: {
  booking: PayoutBooking;
  payment: PayoutPayment | null;
  partner: PayoutPartner;
}): PayoutDecision {
  const { booking, payment, partner } = input;

  // 1) The trip. D4 pays after a CLEAN RETURN, and `completed` is the
  //    only status that means the car came back — 0047 stamps
  //    completed_at on exactly that transition. in_progress is a car
  //    currently out; paying then would forfeit the only leverage
  //    anybody has if it comes back damaged.
  if (booking.status !== "completed") {
    return { payable: false, reason: "booking_not_completed", amountCents: 0 };
  }

  // 2) The money must actually have arrived. This is the check that makes
  //    the whole thing safe while the charge rail (3B step 2) is still
  //    unbuilt: no charge means no rental_payments row, means no payout,
  //    so a transfer cannot move RYDA's own funds to an operator for a
  //    booking nobody paid for.
  if (!payment) {
    return { payable: false, reason: "no_payment", amountCents: 0 };
  }
  if (payment.status === "refunded") {
    return { payable: false, reason: "payment_refunded", amountCents: 0 };
  }
  if (payment.status === "disputed") {
    // The bank may already have pulled the funds back. Paying out now
    // means paying an operator with money RYDA no longer has.
    return { payable: false, reason: "payment_disputed", amountCents: 0 };
  }
  if (!holdsOperatorFunds(payment.status)) {
    // pending / expired / canceled — nothing settled.
    return { payable: false, reason: "payment_not_settled", amountCents: 0 };
  }

  // 3) Not already paid. The database backstops this with a UNIQUE on
  //    stripe_transfer_id (0051), but a duplicate that reaches Stripe has
  //    already moved money — the constraint only stops the SECOND ROW,
  //    not the second transfer. So the check belongs here too.
  if (payment.stripe_transfer_id || payment.transferred_at) {
    return { payable: false, reason: "already_transferred", amountCents: 0 };
  }

  // 4) The amount. A partial refund reduces what the operator is owed;
  //    the refund came out of the same charge.
  const net = payment.operator_net_cents ?? 0;
  const owed = net - payment.refunded_cents;
  if (owed <= 0) {
    return { payable: false, reason: "nothing_owed", amountCents: 0 };
  }

  // 5) The operator's account. Last, because these are the reasons an
  //    operator can act on, and surfacing them before the booking is even
  //    complete would send them to fix a non-problem.
  if (!partner.stripe_account_id) {
    return { payable: false, reason: "no_connect_account", amountCents: owed };
  }
  if (!partner.details_submitted) {
    return { payable: false, reason: "details_not_submitted", amountCents: owed };
  }
  if (partner.transfers_capability !== TRANSFERS_CAPABILITY_ACTIVE) {
    // Anything but 'active' — including null and any value Stripe adds
    // later — fails closed. A transfer into an account without the
    // capability is rejected by Stripe anyway; refusing here makes the
    // reason legible instead of arriving as an API error.
    return {
      payable: false,
      reason: "transfers_capability_inactive",
      amountCents: owed,
    };
  }
  if (!partner.payouts_enabled) {
    // The transfer would SUCCEED and the money would then sit in the
    // operator's Stripe balance with no route to their bank. That is
    // worse than not paying: the ledger would say paid.
    return { payable: false, reason: "payouts_disabled", amountCents: owed };
  }

  return {
    payable: true,
    amountCents: owed,
    partnerId: partner.id,
    paymentId: payment.id,
  };
}

/** Operator-facing / admin-facing copy for a blocked payout. */
export function payoutBlockMessage(reason: PayoutBlockReason): string {
  switch (reason) {
    case "booking_not_completed":
      return "The trip hasn't been completed yet.";
    case "no_payment":
      return "No payment has been taken for this booking.";
    case "payment_not_settled":
      return "The renter's payment hasn't settled.";
    case "payment_refunded":
      return "This booking was refunded — nothing is owed.";
    case "payment_disputed":
      return "The renter's bank has opened a dispute. Payout is held until it resolves.";
    case "already_transferred":
      return "Already paid out.";
    case "no_connect_account":
      return "The operator hasn't started Stripe onboarding.";
    case "details_not_submitted":
      return "The operator hasn't finished their Stripe details.";
    case "payouts_disabled":
      return "Stripe has payouts disabled on the operator's account.";
    case "transfers_capability_inactive":
      return "The operator's account can't receive transfers yet.";
    case "nothing_owed":
      return "Nothing owed after fees and refunds.";
  }
}

/**
 * Whose problem a blocked payout is.
 *
 * The reconciliation view groups by this before it groups by reason: an
 * admin scanning a list needs "9 of these are waiting on the operator,
 * 2 are waiting on us" far more than a flat tally. `time` means nobody
 * is blocked — the trip simply has not finished.
 */
export function payoutBlockOwner(
  reason: PayoutBlockReason,
): "operator" | "ryda" | "time" | "none" {
  switch (reason) {
    case "no_connect_account":
    case "details_not_submitted":
    case "payouts_disabled":
    case "transfers_capability_inactive":
      return "operator";
    case "no_payment":
    case "payment_not_settled":
      return "ryda";
    case "booking_not_completed":
      return "time";
    case "payment_refunded":
    case "payment_disputed":
    case "already_transferred":
    case "nothing_owed":
      return "none";
  }
}

/** True when a cached readiness answer is old enough to distrust. */
export function isPayoutStatusStale(
  payoutStatusAt: string | null,
  now: number = Date.now(),
): boolean {
  if (!payoutStatusAt) return true;
  const t = Date.parse(payoutStatusAt);
  if (!Number.isFinite(t)) return true;
  return now - t > PAYOUT_STATUS_STALE_AFTER_MS;
}

export type PayoutLine = {
  bookingId: string;
  partnerId: string;
  partnerName: string;
  decision: PayoutDecision;
};

export type ReconciliationSummary = {
  /** Transfers that could be sent right now, and their total. */
  payableCount: number;
  payableCents: number;
  /** Money owed but blocked, and their total. */
  blockedCount: number;
  blockedCents: number;
  /** Blocked counts by reason, densest-first ordering left to the caller. */
  byReason: Record<string, number>;
  /** Blocked counts by who has to act. */
  byOwner: Record<string, number>;
};

/**
 * Roll a set of decisions into the numbers the admin view leads with.
 *
 * `blockedCents` counts only money genuinely owed and stuck — a booking
 * that is not yet complete is not "blocked money", it is a trip in
 * progress, and folding it in would make the headline figure meaningless
 * the moment the marketplace has volume. decidePayout() reports
 * amountCents 0 for those, which is what keeps the two apart.
 */
export function summarisePayouts(
  lines: readonly PayoutLine[],
): ReconciliationSummary {
  const summary: ReconciliationSummary = {
    payableCount: 0,
    payableCents: 0,
    blockedCount: 0,
    blockedCents: 0,
    byReason: {},
    byOwner: {},
  };

  for (const line of lines) {
    if (line.decision.payable) {
      summary.payableCount += 1;
      summary.payableCents += line.decision.amountCents;
      continue;
    }
    const { reason, amountCents } = line.decision;
    summary.byReason[reason] = (summary.byReason[reason] ?? 0) + 1;
    const owner = payoutBlockOwner(reason);
    summary.byOwner[owner] = (summary.byOwner[owner] ?? 0) + 1;
    if (amountCents > 0) {
      summary.blockedCount += 1;
      summary.blockedCents += amountCents;
    }
  }

  return summary;
}
