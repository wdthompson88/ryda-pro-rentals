// Single source of truth for the buy-flow fee math. Both client
// (buy-flow.tsx, boat-buy-flow.tsx) and server (create-checkout
// route) read from here so the buyer-visible total and the Stripe
// charge are always identical.
//
// Pre-audit, the client showed a flat $1,500 "closing fee" while
// the server charged a 5% acquisition fee. For a $34k share that's
// $1,500 vs $1,700; for a $300k boat share it would have been
// $1,500 vs $15,000. The audit caught the mismatch and we
// consolidated on the percentage form (matches the API copy that
// already said "Includes 5% acquisition fee").

export const ACQUISITION_FEE_PCT = 5;

/**
 * Compute the buy-in (price * shares) and the acquisition fee.
 * `price` is per-share dollars; result is in dollars (not cents).
 * Server-side code multiplies by 100 to get cents for Stripe.
 */
export function computeFees(pricePerShare: number, shares: number) {
  const buyIn = pricePerShare * shares;
  const acquisitionFee = Math.round(buyIn * (ACQUISITION_FEE_PCT / 100));
  const total = buyIn + acquisitionFee;
  return { buyIn, acquisitionFee, total };
}

// ── Rental payment rail (Stripe Connect direct charges) ──────────────
//
// Fee-only model: the customer pays the operator's connected account
// directly; RYDA's commission rides along as application_fee_amount on
// the direct charge. Same single-source discipline as computeFees —
// the admin "send payment link" preview and the Checkout Session the
// server creates must both call computeRentalFee so the fee the admin
// sees and the fee Stripe takes are always identical.
//
// Works in CENTS (Stripe's unit), unlike computeFees' dollars — rental
// amounts are operator-quoted arbitrary prices, not per-share sticker
// dollars, so cents-in/cents-out avoids a *100 conversion step where a
// rounding bug could hide.

/** Platform commission when the partner row has no override.
 *  Mirrors partners.commission_rate's default (0.150) in migration 0041. */
export const RENTAL_COMMISSION_RATE_DEFAULT = 0.15;

/**
 * Split an operator-confirmed rental price into RYDA's application fee
 * and the operator's net. `amountCents` must be a positive integer;
 * `commissionRate` is a fraction bounded [0, 0.5] to match the DB
 * check constraint on partners.commission_rate. Throws on invalid
 * input rather than guessing — this feeds a live Stripe charge.
 */
export function computeRentalFee(
  amountCents: number,
  commissionRate: number = RENTAL_COMMISSION_RATE_DEFAULT
) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(
      `computeRentalFee: amountCents must be a positive integer, got ${amountCents}`
    );
  }
  if (
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 0.5
  ) {
    throw new Error(
      `computeRentalFee: commissionRate must be within [0, 0.5], got ${commissionRate}`
    );
  }
  const applicationFeeCents = Math.round(amountCents * commissionRate);
  return {
    amountCents,
    applicationFeeCents,
    operatorNetCents: amountCents - applicationFeeCents,
  };
}
