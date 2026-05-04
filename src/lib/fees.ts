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
