// ── Rental payment rail (Stripe Connect direct charges) ──────────────
//
// The only home for money math. Fee-only model: the customer pays the
// operator's connected account directly; RYDA's commission rides along
// as application_fee_amount on the direct charge. The rental price
// never enters RYDA's balance.
//
// Single source of truth, and that discipline is load-bearing. This
// module previously also carried the co-ownership acquisition-fee math,
// which existed because the client once showed a flat $1,500 "closing
// fee" while the server charged 5% — a $13,500 divergence on a $300k
// share, found in audit. The lesson survives its subject: the admin
// "send payment link" preview and the Checkout Session the server
// creates must both call computeRentalFee, so the fee the admin sees
// and the fee Stripe takes can never drift apart.
//
// Works in CENTS, Stripe's own unit. Rental amounts are operator-quoted
// arbitrary prices rather than fixed sticker dollars, so cents-in /
// cents-out avoids a *100 conversion step where a rounding bug could
// hide.

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
