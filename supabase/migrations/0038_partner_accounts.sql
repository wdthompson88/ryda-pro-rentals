-- Partner accounts — the account layer of the Fleet Partner Program.
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
-- file is a no-op.

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

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

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

comment on table public.partner_accounts is
  'Fleet Partner Program accounts: one row per auth user, admin-approved status lifecycle (pending/approved/suspended). Rows created server-side only.';
