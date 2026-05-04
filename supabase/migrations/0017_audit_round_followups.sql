-- Audit-round follow-ups. Three columns + one index that were
-- applied inline via the Management API during the audit-fix loop;
-- codifying them here so a fresh-environment migration replay
-- (staging, new dev DB, restore-from-backup) lands the same shape
-- production has been running on.
--
-- All `if not exists` so production runs as a no-op.

-- 1. user_profiles.stripe_customer_id — the canonical home for the
-- per-user Stripe Customer id (set by /api/account/billing-portal
-- on first portal open OR /api/share-purchase/create-checkout on
-- first paid checkout). Saved cards accumulate on ONE customer
-- per member.
alter table public.user_profiles
  add column if not exists stripe_customer_id text;

create index if not exists user_profiles_stripe_customer_idx
  on public.user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- 2. share_purchases.paid_at — stamped exactly once on the
-- pending→paid transition by the share-purchase webhook. The
-- refund-window math anchors here so admin-driven row touches
-- can't shift the 7-day self-serve eligibility window.
alter table public.share_purchases
  add column if not exists paid_at timestamptz;

-- Backfill any existing 'paid' rows so refund logic doesn't treat
-- them as "never paid". Use updated_at as the best-effort proxy
-- for legacy rows.
update public.share_purchases
set paid_at = coalesce(paid_at, updated_at)
where status = 'paid' and paid_at is null;

-- 3. share_transfers — partial unique index on (holding_id) where
-- status is open. The /api/share-transfer/request route does a
-- read-then-insert; this DB-level guarantee closes the parallel-
-- request race (catches 23505 and surfaces the same 409 the
-- read-check produces).
create unique index if not exists share_transfers_open_per_holding
  on public.share_transfers (holding_id)
  where status in ('requested', 'accepted', 'pending_ryda_review');

-- 4. share_holdings.refunded_at — disambiguates "share refunded"
-- from "share transferred to another member." Both set
-- transferred_at to the timestamp (so existing active-share
-- filters keep working with one column check), but refund flow
-- additionally sets refunded_at so a future transfer-history UI
-- can distinguish the two terminal states. Without this, a
-- refund looks like "transferred to nobody."
alter table public.share_holdings
  add column if not exists refunded_at timestamptz;
