-- Tighten Stripe-events dedup to be per-endpoint instead of global.
--
-- Background: stripe_events.id was the PK in migration 0015, with
-- `endpoint` recorded as a normal column. Effect: if a Stripe event
-- (e.g. an identity.verification_session.verified) was misrouted /
-- duplicated to the share-purchase webhook, the share-purchase
-- handler would record the id (with endpoint='share-purchase') and
-- the KYC webhook's later dedup-check `WHERE id = $1` would treat
-- the row as already-seen and skip the legitimate KYC processing.
--
-- Fix: convert PK to (id, endpoint). Each endpoint gets its own
-- dedup namespace. Code change in the webhook routes is paired with
-- this migration: the SELECT now filters by both id AND endpoint.
-- Codex round-3 catch.
--
-- Backfill: existing rows already have endpoint set (NOT NULL since
-- 0015) so the migration is purely a key-shape change.
--
-- This migration is reversible by running:
--   alter table public.stripe_events drop constraint stripe_events_pkey;
--   alter table public.stripe_events add primary key (id);

-- 1. Drop the old single-column PK.
alter table public.stripe_events
  drop constraint if exists stripe_events_pkey;

-- 2. Recreate as compound PK on (id, endpoint).
alter table public.stripe_events
  add primary key (id, endpoint);

-- 3. Helpful index for the new dedup query shape.
create index if not exists stripe_events_id_endpoint_idx
  on public.stripe_events (id, endpoint);
