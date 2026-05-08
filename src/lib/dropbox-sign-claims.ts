// Decision logic for the dropbox-sign event-claim state machine.
//
// Extracted from api/documents/webhook/route.ts so the gnarly
// "is this an in-flight worker, a crashed worker, or already done"
// logic is unit-testable without booting Next.js or mocking
// Supabase. The route boundary is just: lookup row, call this
// function, branch on the verdict.
//
// State machine (matches migration 0027 + route comment):
//
//   no row exists                    → action: claim_and_process
//   row.processed_at IS NOT NULL     → action: already_processed
//   row.processed_at IS NULL,
//     row.received_at within stale-claim window  → action: in_flight
//   row.processed_at IS NULL,
//     row.received_at older than stale window    → action: take_over
//
// "Stale claim window" = how long we wait before assuming a
// previous worker crashed. Default 5 minutes. Tuneable so tests
// can use small values without timing flakiness.

/** How long to consider a claim "in-flight" before take-over. */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

export type ExistingClaim = {
  /** ISO timestamp when the row was first INSERT-claimed. */
  received_at: string;
  /** ISO timestamp when processing completed; null while in-flight. */
  processed_at: string | null;
};

export type ClaimDecision =
  /** No row → INSERT, then run mutation, then UPDATE processed_at. */
  | { action: "claim_and_process" }
  /** Row exists with processed_at set → return 200 ack, no work. */
  | { action: "already_processed" }
  /** Row exists, processed_at null, received_at recent → return 503,
   *  let the active worker finish. */
  | { action: "in_flight"; ageMs: number }
  /** Row exists, processed_at null, received_at old → previous
   *  worker crashed; UPDATE received_at = NOW() to restart claim,
   *  then run mutation, then UPDATE processed_at. */
  | { action: "take_over"; ageMs: number };

/** Pure-function decider. Pass the existing row (or null) + the
 *  current timestamp. The route then dispatches on `action`. */
export function decideClaimAction(
  existing: ExistingClaim | null,
  now: Date = new Date(),
  staleMs: number = STALE_CLAIM_MS,
): ClaimDecision {
  if (existing === null) return { action: "claim_and_process" };
  if (existing.processed_at !== null) return { action: "already_processed" };

  const receivedTime = Date.parse(existing.received_at);
  // Defensive: an unparseable received_at from a corrupt row treats
  // it as "definitely stale" so we take over rather than blocking
  // forever on an in-flight verdict we can't trust.
  if (Number.isNaN(receivedTime)) {
    return { action: "take_over", ageMs: staleMs + 1 };
  }

  const ageMs = now.getTime() - receivedTime;
  if (ageMs >= staleMs) {
    return { action: "take_over", ageMs };
  }
  return { action: "in_flight", ageMs };
}
