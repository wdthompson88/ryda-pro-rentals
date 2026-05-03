-- KYC verifications — one row per Stripe Identity verification session
-- the member starts. Webhook flips status when Stripe finishes.
--
-- A member can have multiple rows (e.g. retries after a failed scan).
-- The "current" verification is the most recent verified row per user.
-- /api/kyc/start always inserts a new row; the BuyFlow checks for an
-- existing verified row before opening a new session.
--
-- Run once in Supabase SQL editor.

create table if not exists public.kyc_verifications (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  -- Stripe correlation. We get the verification_session id back from
  -- create() and store it; the webhook reconciles by id when
  -- identity.verification_session.verified fires.
  stripe_verification_id   text not null unique,
  status                   text not null default 'requires_input' check (
    status in (
      'requires_input',     -- created, awaiting user upload
      'processing',         -- Stripe is reviewing
      'verified',           -- success
      'requires_action',    -- needs manual review
      'canceled'            -- user abandoned or expired
    )
  ),
  -- Optional risk fields populated when Stripe verifies. Stored as
  -- jsonb so we don't have to re-migrate every time Stripe adds a
  -- check type.
  verified_outputs         jsonb,
  failure_code             text,
  failure_reason           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists kyc_user_idx on public.kyc_verifications (user_id);
create index if not exists kyc_status_idx on public.kyc_verifications (status);
create index if not exists kyc_user_active_idx on public.kyc_verifications (user_id, status)
  where status = 'verified';

alter table public.kyc_verifications enable row level security;

create policy "users can read own kyc rows"
  on public.kyc_verifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- Inserts/updates go through service-role only (the webhook + the
-- /api/kyc/start route).
