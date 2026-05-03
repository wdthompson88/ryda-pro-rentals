-- Share purchases — tracks every "claim a share" intent from the BuyFlow.
-- One row per Stripe Checkout session. Status flows: pending → paid →
-- closed (LLC amendment + welcome packet sent) or pending → canceled
-- (user abandoned / Stripe session expired).
--
-- Run once in Supabase SQL editor.

create table if not exists public.share_purchases (
  id                uuid primary key default gen_random_uuid(),
  -- Auth user who initiated the purchase (Supabase auth.users.id).
  -- Nullable for the rare case of an admin-issued share, but every
  -- BuyFlow-driven row sets this on creation.
  user_id           uuid references auth.users(id) on delete set null,
  -- Email captured at checkout time, in case the user_id is later
  -- reset and we need a contact channel for support.
  email             text not null,
  name              text not null,
  -- Asset identifiers — exactly one of (vehicle_symbol, boat_slug)
  -- must be set. We don't FK these (the asset catalog lives in the
  -- code, not the DB) but the check constraint enforces XOR.
  vehicle_symbol    text,
  boat_slug         text,
  -- Number of LLC shares being claimed. Doctrine: 2-share minimum
  -- per person, max 10 per LLC.
  shares            integer not null check (shares >= 2 and shares <= 10),
  -- Snapshot of unit price at checkout time so historical rows still
  -- reconcile if the catalog price drifts later.
  price_per_share   integer not null check (price_per_share > 0),
  acquisition_fee   integer not null default 0,
  total_cents       integer not null check (total_cents > 0),
  currency          text not null default 'usd',
  -- Stripe correlation. session_id is set when create-checkout runs;
  -- payment_intent_id is set by the webhook when the session completes.
  stripe_session_id text,
  stripe_payment_intent_id text,
  status            text not null default 'pending' check (
    status in ('pending', 'paid', 'closed', 'canceled', 'failed')
  ),
  -- Free-form member-facing notes (e.g. "Wire arrived 2026-05-15") so
  -- the support team has a single column to leave audit trails.
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint asset_xor check (
    (vehicle_symbol is not null and boat_slug is null)
    or (vehicle_symbol is null and boat_slug is not null)
  )
);

create index if not exists share_purchases_user_idx on public.share_purchases (user_id);
create index if not exists share_purchases_email_idx on public.share_purchases (email);
create index if not exists share_purchases_status_idx on public.share_purchases (status);
create index if not exists share_purchases_session_idx on public.share_purchases (stripe_session_id);
create index if not exists share_purchases_created_at_idx on public.share_purchases (created_at desc);

alter table public.share_purchases enable row level security;

-- Authenticated users can read their own purchases (the dashboard
-- + tracker rely on this). They cannot insert directly — the API
-- route uses the service-role key to write rows after signing-checks.
create policy "users can read own share purchases"
  on public.share_purchases
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies for anon or authenticated; the
-- API routes use the service-role key to bypass RLS for writes.
