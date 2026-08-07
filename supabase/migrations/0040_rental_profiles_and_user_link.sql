-- 0040: link rental inquiries to accounts + rental profiles.
-- The rentals-first funnel is account-first but never loses a lead: signup
-- uses email confirmation (no immediate session), so anonymous inserts stay
-- the normal path (0039). When a valid session IS present the API stamps
-- user_id and maintains a rental_profiles row for autofill on the next
-- inquiry.

alter table public.rental_inquiries
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists rental_inquiries_user_id_idx
  on public.rental_inquiries (user_id);

-- Tighten 0039's anon insert policy now that rows carry a user_id the
-- member dashboard trusts. WITH CHECK (true) would let anyone holding
-- the public anon key POST /rest/v1/rental_inquiries with an arbitrary
-- user_id and plant attacker-controlled rows in a victim's request
-- history. Anon rows are unlinked by definition; linkage only ever
-- happens server-side (service role) where the session is verified.
drop policy "anon can insert rental inquiries" on public.rental_inquiries;
create policy "anon can insert rental inquiries"
  on public.rental_inquiries
  for insert
  to anon
  with check (user_id is null);

-- Authenticated users can read back their own inquiry history ("my
-- requests" on the account page). No authenticated INSERT policy on
-- purpose: every insert goes through the API's service-role client,
-- so a client-side insert path would be pure extra attack surface.
create policy "authenticated can read own rental inquiries"
  on public.rental_inquiries
  for select
  to authenticated
  using (user_id = auth.uid());

-- Rental profile: one row per account, written on inquiry submit so repeat
-- renters get name/phone autofill and a persisted marketing consent bit.
-- Deliberately tiny — the inquiry rows keep their own denormalized copy of
-- name/phone because a lead must survive the profile (and the account)
-- being deleted.
create table if not exists public.rental_profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  phone             text,
  market            text not null default 'Miami',
  marketing_opt_in  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.rental_profiles enable row level security;

-- Owner-only. No anon policies → anon cannot touch profiles at all.
create policy "own rental profile select"
  on public.rental_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "own rental profile insert"
  on public.rental_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "own rental profile update"
  on public.rental_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
