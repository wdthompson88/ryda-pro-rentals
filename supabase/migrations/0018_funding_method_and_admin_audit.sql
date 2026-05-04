-- Two adjacent additions for the launch punch-list:
--
-- 1. share_purchases.funding_method — records which payment path
--    the buyer chose (card / ach / wire / crypto / liquidity /
--    finance). Pre-launch, only card + ach went through Stripe;
--    wire/crypto/liquidity/finance just advanced the UI to the
--    confirm step without creating a row, so ops never knew. Now
--    every funding path inserts a 'pending' row with the chosen
--    method recorded; ops gets a notifyTeam ticket + wire
--    instructions email.
--
-- 2. admin_audit_log — durable record of every admin mutation
--    (KYC override, manual refund issuance, transfer ack, etc.).
--    Required so we can answer "who flipped this row?" months
--    after the fact. Service-role-only writable; admins read via
--    /admin or Supabase dashboard.
--
-- Both `if not exists` so re-running is idempotent.

-- ── 1. funding_method column ──────────────────────────────────

alter table public.share_purchases
  add column if not exists funding_method text default 'card'
    check (funding_method in (
      'card',
      'ach',
      'wire',
      'crypto',
      'liquidity',
      'finance'
    ));

create index if not exists share_purchases_funding_method_idx
  on public.share_purchases (funding_method, status);

-- Backfill existing rows that don't have a funding_method. Most
-- pre-this-migration rows came through Stripe Checkout (card/ach);
-- if stripe_session_id is set, infer card. Otherwise leave null
-- for ops to triage.
update public.share_purchases
set funding_method = 'card'
where funding_method is null and stripe_session_id is not null;

-- ── 2. admin_audit_log ────────────────────────────────────────

create table if not exists public.admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  -- Who took the action. References auth.users; on user delete we
  -- preserve the row by setting null so the audit trail survives.
  admin_user_id   uuid references auth.users(id) on delete set null,
  -- What they did. e.g. "kyc_override", "refund_issued",
  -- "transfer_ack", "booking_canceled", "resend_amendment".
  action          text not null,
  -- What it was done to. e.g. ("share_purchase", "<uuid>"),
  -- ("kyc_verification", "<uuid>"), ("share_transfer", "<uuid>").
  target_type     text not null,
  target_id       text,
  -- Free-form context — old + new values, member reason, etc.
  details         jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id);
create index if not exists admin_audit_log_admin_idx
  on public.admin_audit_log (admin_user_id);
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

-- RLS: only admins (via service-role API routes) read/write. We
-- don't expose this table to authenticated members directly.
alter table public.admin_audit_log enable row level security;
-- No policies = nothing for authenticated reaches. Service role
-- bypasses RLS so the admin API routes can still write.
