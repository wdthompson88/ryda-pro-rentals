-- Adds claim-then-mark-processed bookkeeping to dropbox_sign_events.
--
-- Background: migration 0024 introduced the dedup table. The route
-- evolved over 6 codex rounds to "mutation-first, dedup-second" (so
-- a transient mutation failure leaves no dedup row and the retry
-- re-attempts cleanly). That works but has two residuals:
--
--  1. Two concurrent legitimate deliveries of the same event can
--     both pass HMAC + state-check + run the mutation BEFORE either
--     records the dedup row. Idempotent UPDATEs + state-machine
--     guards make this safe today, but it's "imperfect at-most-once".
--
--  2. A worker that crashes mid-mutation (after starting the UPDATE
--     but before returning) leaves no dedup row, so retry runs the
--     mutation again. Same mitigation as #1.
--
-- This migration shifts to "claim-then-process":
--   * processed_at: NULL while a worker is mid-flight, set to NOW()
--     after the mutation succeeds.
--   * Existing received_at column doubles as the claim timestamp.
--
-- Route logic (see api/documents/webhook/route.ts after this lands):
--   - INSERT dedup row (processed_at=NULL) BEFORE running the mutation
--   - If 23505 conflict:
--       processed_at IS NOT NULL  → 200 ack (already done)
--       processed_at IS NULL AND received_at > 5min ago → take over
--         (another worker crashed; restart the in-flight processing)
--       processed_at IS NULL AND received_at ≤ 5min ago → 503 (let
--         the active worker finish; Dropbox will retry)
--   - On mutation success: UPDATE processed_at = NOW()
--   - On mutation failure: DELETE the dedup row so a retry can re-
--     claim immediately (no 5-minute wait)
--
-- Run-once safe: idempotent ALTER + index.

alter table public.dropbox_sign_events
  add column if not exists processed_at timestamptz;

-- Claim ownership token. Each worker that claims (INSERT or
-- take-over UPDATE) generates a UUID and writes it here. All
-- subsequent CAS operations (mark-processed, take-over reclaim,
-- failure DELETE) include `.eq("claim_token", ourToken)` so a
-- stale worker can't trample an active worker's claim.
-- Codex round-2 caught the missing ownership token: without it,
-- two parallel take-over workers could both reclaim the same row,
-- the original could mark-processed after a take-over, etc.
alter table public.dropbox_sign_events
  add column if not exists claim_token uuid;

-- Index for the "stuck in-flight" detector. A future janitor cron
-- could run "DELETE FROM dropbox_sign_events WHERE processed_at
-- IS NULL AND received_at < now() - interval '24 hours'" to keep
-- the table from filling up with abandoned claims (the route
-- already auto-recovers via take-over after 5min, so 24h is the
-- "definitely abandoned" cutoff).
create index if not exists dropbox_sign_events_unprocessed_idx
  on public.dropbox_sign_events (processed_at, received_at)
  where processed_at is null;

-- Backfill: rows from before this migration ran represent events
-- we processed BEFORE the claim-then-mark pattern existed. Mark
-- them all processed so the new logic doesn't trigger take-over
-- on legacy rows.
update public.dropbox_sign_events
  set processed_at = received_at
  where processed_at is null;
