-- LLC formation tracking. Every car or boat that gets co-owned
-- lives inside a single-purpose LLC formed via a vendor (Firstbase
-- as of launch, possibly Northwest at scale). This table holds the
-- per-LLC state we care about, plus a webhook-event audit trail
-- mirrored from the vendor for reconciliation.
--
-- Design notes:
--   * Provider-agnostic columns (formation_provider, provider_id)
--     so we can swap Firstbase for Atlas/Northwest without schema
--     change. The translation layer lives in src/lib/llc-formation.
--   * One row per LLC. Vehicles ↔ LLCs are 1:1 today; if RYDA ever
--     forms a multi-asset LLC the table extends with a join.
--   * Status enum mirrors the lifecycle in types.ts. Default "draft"
--     so admin can stage formations before submitting.
--   * Webhook idempotency: separate table (llc_formation_events)
--     with a unique-on-event-id constraint absorbs vendor retries
--     without triggering side-effects twice. Same pattern as
--     stripe_events / migration 0020.
--   * No RLS public access. Service role + admin role only.
--     Operators view via /admin/llc; members never see this table.

create extension if not exists pgcrypto;

-- 1) Main LLC entities table -------------------------------------

create table if not exists public.llc_entities (
  id uuid primary key default gen_random_uuid(),

  -- Asset linkage. Exactly one of these must be non-null. Use a
  -- check constraint rather than a polymorphic FK because the
  -- vehicle_symbol / boat_slug strings are stable across deploys
  -- and the actual rows live in code (market-data.ts / boat-data.ts),
  -- not in another DB table.
  vehicle_symbol text,
  boat_slug text,

  -- Display + identity
  llc_name text not null,
  state_of_formation text not null check (state_of_formation in ('FL','DE','WY','CA','NY')),

  -- Provider linkage. provider_id is the vendor's primary id for
  -- the entity (e.g., Firstbase company_id). application_id is
  -- the vendor's workflow id when distinct from the entity id.
  formation_provider text not null default 'firstbase'
    check (formation_provider in ('firstbase','manual')),
  provider_id text,
  provider_application_id text,

  -- Lifecycle. Mirrors FormationStatus enum in types.ts.
  formation_status text not null default 'draft'
    check (formation_status in (
      'draft','submitted','filed','approved','completed','failed'
    )),

  -- Populated as the formation progresses (via webhook or manual
  -- refresh from the admin UI).
  ein text,
  registered_agent_name text,
  registered_agent_address jsonb,
  formation_date date,
  formation_completed_at timestamptz,

  -- Idempotency key sent on createFormation. If a subsequent
  -- request arrives with the same key we look up the existing row
  -- rather than re-submit to the vendor.
  idempotency_key text unique,

  -- Audit
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Asset-linkage XOR constraint: exactly one of (vehicle_symbol,
  -- boat_slug) must be set.
  constraint llc_asset_xor check (
    (vehicle_symbol is not null and boat_slug is null)
      or (vehicle_symbol is null and boat_slug is not null)
  )
);

-- One LLC per vehicle / boat. Two rows for the same asset would
-- mean we tried to form duplicate SPVs — that's a bug, not a
-- valid state. Partial-unique because each side can be null.
create unique index if not exists llc_entities_vehicle_unique
  on public.llc_entities (vehicle_symbol)
  where vehicle_symbol is not null;
create unique index if not exists llc_entities_boat_unique
  on public.llc_entities (boat_slug)
  where boat_slug is not null;

-- One LLC per provider_id. Hard-prevents cross-vehicle id
-- confusion (paste mistake in the admin UI).
create unique index if not exists llc_entities_provider_id_unique
  on public.llc_entities (formation_provider, provider_id)
  where provider_id is not null;

create index if not exists llc_entities_status_idx
  on public.llc_entities (formation_status);

-- updated_at maintenance trigger -------------------------------

create or replace function public.touch_llc_entities_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_llc_entities_updated_at on public.llc_entities;
create trigger trg_llc_entities_updated_at
  before update on public.llc_entities
  for each row execute function public.touch_llc_entities_updated_at();

-- 2) Webhook events audit -----------------------------------------

create table if not exists public.llc_formation_events (
  -- Vendor's event id. UNIQUE — re-deliveries of the same event
  -- become no-ops via the conflict check in the route handler.
  event_id text primary key,
  formation_provider text not null,
  event_type text not null,
  provider_id text,
  -- Linked to the LLC entity row (nullable because we may receive
  -- an event before we've associated the provider_id with a row;
  -- backfilled by the handler).
  llc_entity_id uuid references public.llc_entities(id) on delete set null,
  payload jsonb,
  received_at timestamptz not null default now(),
  -- Whether the handler successfully applied side-effects. Lets
  -- ops re-process events with applied=false for incident recovery.
  applied boolean not null default false,
  applied_at timestamptz
);

create index if not exists llc_formation_events_provider_id_idx
  on public.llc_formation_events (formation_provider, provider_id);
create index if not exists llc_formation_events_unapplied_idx
  on public.llc_formation_events (applied)
  where applied = false;

-- 3) RLS ----------------------------------------------------------

alter table public.llc_entities enable row level security;
alter table public.llc_formation_events enable row level security;

-- Admins read+write. Service role bypasses RLS automatically.
-- Members never see these tables — even their own LLC's formation
-- details surface through /api/account/* which queries via service
-- role with hand-curated projections.

drop policy if exists llc_entities_admin_all on public.llc_entities;
create policy llc_entities_admin_all on public.llc_entities
  for all
  using (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  )
  with check (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists llc_formation_events_admin_all on public.llc_formation_events;
create policy llc_formation_events_admin_all on public.llc_formation_events
  for all
  using (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  )
  with check (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

-- 4) Helpful comments ---------------------------------------------

comment on table public.llc_entities is
  'One row per single-purpose LLC formed by RYDA via a formation vendor (Firstbase, etc). Provider-agnostic columns; translation layer in src/lib/llc-formation.';
comment on table public.llc_formation_events is
  'Audit trail of webhook events from the formation vendor. Idempotency-keyed by event_id (PK). Mirrors the stripe_events pattern from migration 0020.';
