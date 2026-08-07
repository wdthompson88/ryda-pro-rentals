-- Partner accounts — the account layer of the Fleet Partner Program.
--
-- Numbering note: authored as 0038 on feat/dt-partner-signup and
-- RENUMBERED to 0042 during branch reconciliation with the Stripe
-- operator roster work (0041_partners_and_rental_payments). It now
-- COMPOSES with 0041: partner_accounts is the user-keyed application
-- front door, and the partner_id column below bridges an approved
-- application to its company-keyed operators row (public.partners),
-- which is where Stripe Express onboarding and payment links live.
--
-- TWO CONSEQUENCES OF THAT RENUMBER, both handled:
--
--  1. Any environment that applied the old 0038_partner_accounts.sql
--     already has this table WITHOUT partner_id (the bridge did not
--     exist yet). `create table if not exists` is a no-op there, so the
--     column is added separately below — otherwise the admin route's
--     select 500s, the UI prints "run migration 0042", running it
--     changes nothing, and the hint loops forever.
--  2. Version 0038 may already be recorded on such a machine while the
--     merged tree maps 0038 to a DIFFERENT file
--     (0038_contact_messages_allow_rental.sql), which a version-keyed
--     apply would then skip. 0043_contact_messages_rental_recheck.sql
--     re-asserts that constraint idempotently under a fresh number so
--     the fix lands either way. Do not renumber 0038 — it has been
--     applied under both meanings.
--
-- /partners (marketing) pitches rental operators on listing their
-- fleet with RYDA. This table turns that pitch into a real account
-- flow: an operator signs up at /signup?as=partner (or applies from
-- /partner while signed in), which creates one row here with status
-- 'pending'. Admins review on /admin/partners; 'approved' unlocks the
-- /partner dashboard.
--
-- Trust model (same lesson as admin-auth.ts): the signup form can only
-- write user-editable user_metadata, so partner signup is a REQUEST.
-- Rows are created exclusively by server routes using the service-role
-- key, always with status 'pending'. Status changes happen only through
-- the admin-gated /api/admin/partners route. There is deliberately NO
-- insert/update RLS policy for regular users — a member cannot write
-- this table from the browser at all, which closes the self-promotion
-- hole by construction.
--
-- One row per user (PK = user_id): a partner account is a property of
-- the auth user, exactly like user_profiles.
--
-- Run-once safety: every DDL is `if not exists` / `or replace`, and
-- policies + trigger are dropped and recreated, so re-running this
-- file is a no-op. Anything ADDED to the table after the first release
-- of this file needs its own `alter table … add column if not exists`
-- as well as its line in the create — see partner_id below.

create table if not exists public.partner_accounts (
  user_id        uuid primary key references auth.users(id) on delete cascade,

  -- Application/profile details, editable by the partner via
  -- /api/partner/me (service-role write, never status).
  company_name   text not null,
  contact_name   text,
  -- Denormalized from auth.users.email at creation so the admin roster
  -- and future notifications don't need per-row auth lookups.
  contact_email  text,
  phone          text,
  website        text,
  -- Free-text bucket ('1-5', '6-15', '16-40', '40+') — validated in
  -- src/lib/partner.ts, kept text here so buckets can evolve without
  -- a migration.
  fleet_size     text,
  market         text not null default 'Miami',

  -- Review lifecycle. 'pending' → 'approved' | 'suspended'; a row
  -- never returns to 'pending' (enforced in the admin route).
  status         text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended')),
  -- Admin's note on the latest status change (audit detail also goes
  -- to admin_audit_log).
  status_note    text,
  approved_at    timestamptz,

  -- The approval bridge (unified partner program): set by the
  -- admin-gated /api/admin/partners route when an application is
  -- approved, pointing at the company-keyed operators row
  -- (public.partners, 0041) that Stripe onboarding and payment links
  -- run against. null until approved. Suspension keeps the link (the
  -- operator may carry payment history and is paused, never deleted);
  -- if the operators row is ever removed the link degrades to null
  -- rather than blocking the delete.
  partner_id     uuid references public.partners(id) on delete set null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The approval bridge, for environments that already had this table
-- from the old 0038_partner_accounts.sql (where the CREATE above is a
-- no-op). Same definition as the column in the create body; harmless
-- on a fresh database. Without this the column never appears, the
-- admin route's select fails on it, and the partial index below errors
-- out the whole run.
alter table public.partner_accounts
  add column if not exists partner_id uuid
  references public.partners(id) on delete set null;

-- updated_at auto-bump on row modification.
create or replace function public.partner_accounts_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists partner_accounts_updated_at on public.partner_accounts;
create trigger partner_accounts_updated_at
  before update on public.partner_accounts
  for each row execute function public.partner_accounts_set_updated_at();

alter table public.partner_accounts enable row level security;

-- Partners can read their own row (the /partner dashboard fetches via
-- the service-role API today, but the policy keeps a future browser
-- read path safe). No insert/update/delete policies for members —
-- see the trust-model note above.
drop policy if exists "partners can read own account" on public.partner_accounts;
create policy "partners can read own account"
  on public.partner_accounts
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admins (app_metadata.role = 'admin', service-role-only writable) get
-- full access — same expression as llc_entities (0022).
drop policy if exists partner_accounts_admin_all on public.partner_accounts;
create policy partner_accounts_admin_all
  on public.partner_accounts
  for all
  using ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' )
  with check ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' );

-- Admin roster sorts by application recency.
create index if not exists partner_accounts_created_at_idx
  on public.partner_accounts (created_at desc);

-- The bridge is looked up both ways: /api/partner/me derives the
-- partner-facing operator summary from partner_id, and suspension
-- checks whether any OTHER approved application still links to the
-- same operator before pausing it. Partial — most rows are pending
-- applications with a null link.
create index if not exists partner_accounts_partner_id_idx
  on public.partner_accounts (partner_id)
  where partner_id is not null;

comment on table public.partner_accounts is
  'Fleet Partner Program accounts: one row per auth user, admin-approved status lifecycle (pending/approved/suspended). Rows created server-side only.';

comment on column public.partner_accounts.partner_id is
  'Approval bridge to public.partners (0041): set when an admin approves the application; the linked row is the company-keyed operator that Stripe onboarding and payment links use.';
