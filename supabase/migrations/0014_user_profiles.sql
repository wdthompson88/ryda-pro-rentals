-- User profiles — the editable per-member data the account section
-- shows + saves. Distinct from auth.users (which Supabase owns; email
-- + password live there, accessed via supabase.auth APIs).
--
-- Why a real table instead of auth.users.user_metadata:
--   1. Cross-user queries (admin tools that list "members in FL")
--   2. RLS-joinable with bookings + share_holdings for richer policies
--   3. Robust against email-change edge cases that can drop metadata
--
-- One row per user, lazily created on first edit (the page upserts so
-- a fresh sign-up doesn't need a backfill trigger).
--
-- RLS: a member can read + insert + update their own row. Inserts use
-- the same upsert path so the policy needs WITH CHECK on both.
--
-- Run-once safety: every DDL is `if not exists` / `or replace`, and
-- the trigger is dropped+recreated so re-running this file is a no-op.

create table if not exists public.user_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,

  -- Personal — what shows on the LLC member register, insurance
  -- certificates, and "Welcome <name>" headers. full_name is the
  -- canonical/legal name; preferred_name is the casual one.
  full_name        text,
  preferred_name   text,
  phone            text,
  date_of_birth    date,

  -- Mailing/shipping address. Used for white-glove delivery, tax
  -- documents (K-1s), and insurance binding.
  address_line1    text,
  address_line2    text,
  city             text,
  state            text,
  postal_code      text,
  country          text default 'US',

  -- Avatar URL — Supabase Storage path or external URL. The account
  -- page renders a placeholder + initial when null.
  avatar_url       text,

  -- Notification preferences. The toggles can be enriched later
  -- (transactional vs. marketing split, quiet hours, etc.).
  notif_email_digest      text not null default 'weekly'
    check (notif_email_digest in ('off', 'daily', 'weekly')),
  notif_sms_enabled       boolean not null default false,
  notif_push_enabled      boolean not null default true,
  notif_marketing_enabled boolean not null default true,
  notif_booking_updates   boolean not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at auto-bump on row modification.
create or replace function public.user_profiles_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.user_profiles_set_updated_at();

alter table public.user_profiles enable row level security;

-- Each policy is dropped+recreated so re-running this file doesn't
-- fail with "policy already exists."
drop policy if exists "users can read own profile" on public.user_profiles;
create policy "users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can insert own profile" on public.user_profiles;
create policy "users can insert own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users can update own profile" on public.user_profiles;
create policy "users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- (No delete policy — accounts are deleted via auth.users cascade.)
