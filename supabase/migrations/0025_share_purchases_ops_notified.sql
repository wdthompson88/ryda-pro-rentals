-- Track when ops was last notified about a stuck-paid purchase row.
--
-- Background: the hourly /api/cron/reconcile-pending-purchases
-- detects Stripe-paid-but-our-DB-still-pending rows and pings ops
-- to manually replay the webhook. Without this column, the same
-- stuck row triggers a notify-team email every hour until manual
-- replay completes — alert fatigue, masks fresh stuck rows.
--
-- Codex final-review NEW_REGRESSION catch.
--
-- Cron behavior: notify only when ops_notified_at is NULL or
-- older than 24h. Once notified, set it to now(). Re-resolution
-- (manual replay → status flips to 'completed') means the row
-- drops out of the cron's pending-row scope automatically.
--
-- Run-once safe.

alter table public.share_purchases
  add column if not exists ops_notified_at timestamptz;

-- Index helps the cron filter "rows we haven't notified about
-- recently" quickly without a full scan.
create index if not exists share_purchases_pending_unnotified_idx
  on public.share_purchases (status, ops_notified_at)
  where status = 'pending';
