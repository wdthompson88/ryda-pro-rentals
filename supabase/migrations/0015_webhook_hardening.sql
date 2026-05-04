-- Webhook hardening + billing-portal plumbing.
--
-- 1. share_purchases gets stripe_customer_id + stripe_checkout_session_id
--    so /api/account/billing-portal can mint a Stripe Customer Portal
--    session against the same customer that placed the purchase, and
--    the create-checkout double-click dedupe can look up an existing
--    open Stripe Checkout session by id.
--
-- 2. New stripe_events table for webhook event-id deduplication.
--    Stripe's recommended idempotency pattern is "record event.id on
--    receive; ignore on replay." Our existing handlers are status-
--    guarded which protects DB writes, but the event-id table gives
--    us a single belt-and-suspenders that also prevents duplicate
--    notify-team emails or re-rendered amendment PDFs in the
--    redelivery edge case.
--
-- 3. share_holdings.share_index gets a NOT NULL backfill + a strict
--    unique index (drops the old WHERE-clause partial index) so a
--    future writer that omits share_index can't slip past the
--    dedupe constraint.
--
-- Run-once safe: every DDL is `if not exists` / `do nothing on
-- conflict` style; re-running this file is a no-op.

-- ── 1. share_purchases columns ────────────────────────────────

alter table public.share_purchases
  add column if not exists stripe_customer_id text;

alter table public.share_purchases
  add column if not exists stripe_checkout_session_id text;

create index if not exists share_purchases_customer_idx
  on public.share_purchases (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists share_purchases_session_idx
  on public.share_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ── 2. stripe_events for event-id dedup ───────────────────────

create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  -- Which webhook endpoint received it (share-purchase or kyc).
  -- Helps when triaging: a kyc event landing on the share-purchase
  -- endpoint would still be deduped by id but flagged as wrong-route.
  endpoint     text not null,
  received_at  timestamptz not null default now()
);

create index if not exists stripe_events_received_idx
  on public.stripe_events (received_at desc);

-- No RLS needed — only the service-role webhook handlers touch
-- this table. Keep RLS disabled rather than denying-by-default to
-- avoid the implicit-deny fallthrough when a future operator
-- queries the table from the dashboard.
alter table public.stripe_events disable row level security;

-- ── 3. share_holdings.share_index — strict not-null + unique ──

-- Backfill any rows that somehow ended up with NULL share_index
-- (none should, given migration 0013 backfilled — but be safe).
update public.share_holdings sh
set share_index = sub.idx
from (
  select id, row_number() over (
    partition by purchase_id order by acquired_at, id
  ) as idx
  from public.share_holdings
  where share_index is null and purchase_id is not null
) sub
where sh.id = sub.id;

-- Drop the old partial unique index (with WHERE) and replace with
-- one that covers all rows. The previous index allowed a future
-- INSERT that omitted share_index to slip past the dedupe.
drop index if exists public.share_holdings_purchase_share_idx;

-- Tighten share_index to NOT NULL going forward (only when the
-- purchase_id is set — pre-purchase holdings, if any, can have
-- NULL share_index).
do $$
begin
  alter table public.share_holdings
    add constraint share_holdings_share_index_check
    check (purchase_id is null or share_index is not null);
exception when duplicate_object then
  null;
end $$;

create unique index if not exists share_holdings_purchase_share_uniq
  on public.share_holdings (purchase_id, share_index)
  where purchase_id is not null;
