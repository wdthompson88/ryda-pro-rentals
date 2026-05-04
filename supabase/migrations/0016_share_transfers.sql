-- Share transfers — peer-to-peer share movement between verified
-- members per the Operating Agreement's transfer provisions
-- (12-month minimum hold, mutual KYC, RYDA acknowledgment).
--
-- Lifecycle:
--   1. Holder initiates: insert row with status='requested' and a
--      to_user_email (we resolve the user_id when they accept).
--   2. Recipient signs in, acknowledges + KYC-checks: status flips
--      to 'pending_ryda_review' (no payment captured yet — peer
--      transfers in v1 are zero-cash; cash transfers come later).
--   3. RYDA legal acknowledges: status flips to 'completed' and
--      we move the share_holdings row to the new user_id (set
--      transferred_at + transferred_to_user_id on the OLD row;
--      insert a NEW row for the recipient with the same purchase_id
--      + a NEW share_index in their namespace).
--   4. Either party rejects: status='rejected'.
--
-- For v1 we ship the schema + the request endpoint only; the
-- accept + admin-acknowledge endpoints land when the legal flow is
-- finalized.
--
-- RLS: a member can read transfers where they're either the
-- initiator OR the named recipient. Service role handles the
-- actual share_holdings move.

create table if not exists public.share_transfers (
  id                  uuid primary key default gen_random_uuid(),

  -- Which holding is being transferred. We snapshot the asset +
  -- share count at request time so a later mutation on share_holdings
  -- doesn't change the transfer's terms.
  holding_id          uuid not null references public.share_holdings(id) on delete restrict,
  vehicle_symbol      text,
  boat_slug           text,
  shares              integer not null check (shares >= 1 and shares <= 10),

  -- Initiator + intended recipient. recipient_user_id is filled in
  -- when the recipient accepts (so we don't need a verified user
  -- to invite; we just need a deliverable email).
  from_user_id        uuid not null references auth.users(id) on delete cascade,
  to_user_email       text not null,
  to_user_id          uuid references auth.users(id) on delete set null,

  status              text not null default 'requested' check (status in (
    'requested',
    'accepted',
    'pending_ryda_review',
    'completed',
    'rejected',
    'expired'
  )),

  -- Free-text from the initiator. Surfaced to the recipient and to
  -- ops review.
  member_note         text,

  -- Ops/legal note added at review time.
  ryda_review_note    text,

  -- Auto-expiry — if the recipient doesn't accept in 14 days, the
  -- transfer expires. A janitor / cron will eventually flip these.
  expires_at          timestamptz not null
                      default (now() + interval '14 days'),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint asset_xor check (
    (vehicle_symbol is not null and boat_slug is null)
    or (vehicle_symbol is null and boat_slug is not null)
  )
);

create index if not exists share_transfers_from_idx
  on public.share_transfers (from_user_id);
create index if not exists share_transfers_to_idx
  on public.share_transfers (to_user_id);
create index if not exists share_transfers_to_email_idx
  on public.share_transfers (lower(to_user_email));
create index if not exists share_transfers_status_idx
  on public.share_transfers (status);

-- updated_at trigger (re-using the per-table pattern from 0014).
create or replace function public.share_transfers_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists share_transfers_updated_at on public.share_transfers;
create trigger share_transfers_updated_at
  before update on public.share_transfers
  for each row execute function public.share_transfers_set_updated_at();

alter table public.share_transfers enable row level security;

drop policy if exists "users can read own outgoing transfers" on public.share_transfers;
create policy "users can read own outgoing transfers"
  on public.share_transfers
  for select
  to authenticated
  using (from_user_id = auth.uid());

drop policy if exists "users can read incoming transfers" on public.share_transfers;
create policy "users can read incoming transfers"
  on public.share_transfers
  for select
  to authenticated
  using (
    to_user_id = auth.uid()
    or lower(to_user_email) = lower((auth.jwt() ->> 'email'))
  );

-- Inserts go through the service-role API only (the request route
-- enforces ownership of the holding before inserting). No direct
-- insert / update / delete from authenticated.
