-- Concurrency idempotency for share_purchase fulfillment.
--
-- The Stripe webhook can deliver `checkout.session.completed` more than
-- once: networking glitches, manual replays from the dashboard, or two
-- concurrent edge invocations during a redrive. Without these
-- constraints, a race between two simultaneous deliveries that both
-- read status='pending' would:
--   - flip status twice (harmless)
--   - insert N share_holdings rows twice → duplicate ownership
--   - insert duplicate llc_amendments rows → buyer gets two welcome emails
--
-- The webhook now:
--   1. Uses an atomic compare-and-set on share_purchases.status
--      (`update ... where status='pending'`). Only one delivery wins.
--   2. Inserts holdings + amendment with `upsert(... ignoreDuplicates)`
--      against the unique indexes below, so even if the atomic gate
--      were bypassed (e.g. operator manually set status), duplicates
--      can't happen.
--   3. Stamps share_purchases.fulfilled_at at the end of the
--      successful path. A redelivery that finds status='paid' AND
--      fulfilled_at IS NULL → repairs the partial fulfillment by
--      re-running the holdings/amendment/email steps.
--
-- Run once in Supabase SQL editor. Idempotent — re-running is safe.

-- 1. Fulfillment timestamp on share_purchases. Lets the webhook
-- distinguish "Stripe confirmed payment but our follow-on work is still
-- pending" from "everything is done." See webhook /api/share-purchase/webhook.
alter table public.share_purchases
  add column if not exists fulfilled_at timestamptz;

-- 2. share_holdings: per-share sequential index. We create one row per
-- share so a future transfer can target an individual share. With this
-- column + the unique index below, redeliveries can't double-insert.
alter table public.share_holdings
  add column if not exists share_index integer;

-- Backfill existing holdings: number them 1..N within their purchase
-- by acquired_at then id (stable, deterministic). New inserts from the
-- webhook generate share_index in code.
with numbered as (
  select
    id,
    row_number() over (partition by purchase_id order by acquired_at, id) as idx
  from public.share_holdings
  where purchase_id is not null
)
update public.share_holdings sh
set share_index = numbered.idx
from numbered
where sh.id = numbered.id and sh.share_index is null;

-- One row per (purchase, share_index). Concurrent webhook deliveries
-- that both try to insert the same series 1..N collide on the second
-- insert and we ignoreDuplicates in the JS client.
create unique index if not exists share_holdings_purchase_share_idx
  on public.share_holdings (purchase_id, share_index)
  where purchase_id is not null and share_index is not null;

-- 3. llc_amendments: at most one row per (purchase, document_type).
-- A welcome packet, member-register amendment, and signed-OA amendment
-- are each their own row, but each type can only exist once per
-- purchase.
create unique index if not exists llc_amendments_purchase_doctype_idx
  on public.llc_amendments (purchase_id, document_type);
