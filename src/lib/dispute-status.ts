// Pure helpers for the Stripe dispute lifecycle.
// Extracted from the route handler so the lifecycle / state-machine
// logic is unit-testable without mocking Stripe or Supabase.

/** Stripe's dispute statuses (from their API docs). */
export type StripeDisputeStatus =
  | "warning_needs_response"
  | "warning_under_review"
  | "warning_closed"
  | "needs_response"
  | "under_review"
  | "won"
  | "lost"
  | "charge_refunded";

/** Our share_purchases.dispute_status enum (subset of the above
 *  collapsed to "is this share recoverable / refundable"). */
export type PurchaseDisputeStatus =
  | "disputed"
  | "dispute_won"
  | "dispute_lost"
  | null;

/** Map Stripe's granular status to our coarse purchase-level flag.
 *  warning_* statuses are "Stripe's heads-up that an issuer might
 *  open a dispute" — we treat them as disputed for safety
 *  (gates refunds + revocation logic) even if they may resolve
 *  without becoming a real dispute. */
export function purchaseDisputeStatusFor(
  stripeStatus: StripeDisputeStatus,
): PurchaseDisputeStatus {
  switch (stripeStatus) {
    case "won":
      return "dispute_won";
    case "lost":
      return "dispute_lost";
    case "warning_closed":
      // Stripe closed the warning without it becoming a real
      // dispute. Don't downgrade — the original was disputed
      // briefly, leave as 'disputed' so audit shows the warning
      // existed.
      return "disputed";
    case "charge_refunded":
      // We refunded before the dispute could close. Surface as
      // 'disputed' (terminal-but-not-our-fault); the share
      // revocation flow runs the same as 'lost'.
      return "disputed";
    default:
      // warning_needs_response, warning_under_review,
      // needs_response, under_review — all "in progress".
      return "disputed";
  }
}

/** True iff the dispute is in a terminal state (won/lost/refunded
 *  + warning_closed). Drives the "set outcome_at + outcome" path. */
export function isTerminalDisputeStatus(
  stripeStatus: StripeDisputeStatus,
): boolean {
  return (
    stripeStatus === "won" ||
    stripeStatus === "lost" ||
    stripeStatus === "charge_refunded" ||
    stripeStatus === "warning_closed"
  );
}

/** Map terminal Stripe status to our outcome enum. NULL if not
 *  terminal. */
export function outcomeFor(
  stripeStatus: StripeDisputeStatus,
): "won" | "lost" | "withdrawn" | null {
  switch (stripeStatus) {
    case "won":
      return "won";
    case "lost":
    case "charge_refunded":
      return "lost"; // we lost the funds either way
    case "warning_closed":
      return "withdrawn";
    default:
      return null;
  }
}

/** True iff a dispute should block refund attempts on the
 *  underlying purchase. Used by the refund route to reject
 *  refunds while a dispute is in flight (Stripe will reject the
 *  refund anyway, but explicit guard gives a better error
 *  message and audit trail). */
export function blocksRefund(status: PurchaseDisputeStatus): boolean {
  return status === "disputed" || status === "dispute_lost";
  // dispute_won → safe to refund (e.g. goodwill); null → no
  // dispute, refund as normal.
}
