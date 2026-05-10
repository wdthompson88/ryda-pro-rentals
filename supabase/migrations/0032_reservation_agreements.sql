-- Reservation agreements — the legal vehicle that turns an
-- "interested" prospect into a "deposit_held" prospect during the
-- founding-cohort MVP test.
--
-- Per docs/RYDA_STRATEGIC_AUDIT.md (May 2026), the MVP test wires
-- 5 refundable deposits ($5K each) on the same Ferrari before the
-- LLC is formed. Each deposit needs a 1-page reservation agreement
-- behind it that says:
--   - Member X is reserving N shares in a forthcoming LLC for Vehicle Y
--   - Member X has wired $D to RYDA's Wells Fargo escrow
--   - Refundable until LLC formation OR by [date], whichever first
--   - LLC forms when 5 reservations exist for this car
--
-- Today's flow is admin-mediated end-to-end:
--   1. Admin clicks "Send reservation" on a prospect → row created here,
--      PDF generated server-side, admin downloads + emails to prospect
--   2. Prospect signs PDF, returns it via email — admin uploads scan,
--      marks status='signed'
--   3. Wire arrives in Wells Fargo escrow, admin marks
--      status='deposit_received' (also auto-advances the prospect
--      to stage='deposit_held')
--   4. Either: 5 deposits collected → LLC formed → status='converted'
--      Or: cohort doesn't fill → status='refunded' (admin wires back)
--
-- When Dropbox Sign is wired for production (template ID env var
-- gets populated), the workflow shifts to the embedded-signing
-- pattern that share_purchases already uses. Until then, this is
-- the manual-but-tracked equivalent.
--
-- RLS: admin-only via service-role through /api/admin/* routes.

create table if not exists public.reservation_agreements (
  id                       uuid primary key default gen_random_uuid(),

  -- The prospect this reservation is for. ON DELETE CASCADE because
  -- archiving a prospect should also archive their pending
  -- reservation (they're a unit).
  prospect_id              uuid not null references public.prospects(id) on delete cascade,

  -- Which asset this reservation is against. Mirrors the
  -- vehicle_symbol / boat_slug pattern used in share_purchases —
  -- exactly one is non-null per row.
  vehicle_symbol           text,
  boat_slug                text,

  -- Number of shares being reserved (2-share minimum per member
  -- under the doctrine, but the schema accepts 1+ to avoid blocking
  -- a one-off founding-cohort deal that the team negotiates).
  shares_reserved          smallint not null check (shares_reserved > 0),

  -- Deposit amount in cents. Default $5,000 = 500_000 cents to
  -- match the MVP-test target. Stored as bigint to match other
  -- money columns in the project.
  deposit_amount_cents     bigint not null default 500000 check (deposit_amount_cents > 0),

  -- Lifecycle status:
  --   draft              — row exists, PDF generated, not yet sent to prospect
  --   sent               — admin has sent the PDF to the prospect
  --   signed             — prospect returned a signed agreement (uploaded)
  --   deposit_received   — wire arrived in escrow (THIS triggers the
  --                        auto-advance of the prospect to deposit_held)
  --   converted          — LLC formed and the deposit converted to a
  --                        share buy-in (terminal success)
  --   cancelled          — admin cancelled before signature
  --   refunded           — deposit returned to the prospect (terminal)
  status                   text not null default 'draft' check (status in (
                             'draft', 'sent', 'signed',
                             'deposit_received', 'converted',
                             'cancelled', 'refunded'
                           )),

  -- Lifecycle timestamps. Each one is set when its corresponding
  -- status transition fires.
  sent_at                  timestamptz,
  signed_at                timestamptz,
  deposit_received_at      timestamptz,
  converted_at             timestamptz,
  cancelled_at             timestamptz,
  refunded_at              timestamptz,

  -- Reservation expires at this date if cohort hasn't filled. After
  -- expiration the admin can either extend (new reservation) or
  -- refund. Default: 60 days from creation per typical Miami dealer
  -- right-of-first-refusal terms.
  expires_at               timestamptz not null default (now() + interval '60 days'),

  -- URL to the signed PDF, once the admin uploads it. Stored in a
  -- private Supabase Storage bucket; never publicly served. Optional
  -- because pre-signature reservations have no signed PDF yet.
  signed_pdf_url           text,

  -- Free-text admin notes — refund reason, anomalies, etc.
  notes                    text,

  -- Bookkeeping
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Exactly one of vehicle_symbol or boat_slug must be set.
  constraint reservation_agreements_one_asset_check
    check ((vehicle_symbol is not null) <> (boat_slug is not null))
);

-- Indexes the admin queue + per-prospect history need.
create index if not exists reservation_agreements_prospect_idx
  on public.reservation_agreements (prospect_id);

create index if not exists reservation_agreements_status_idx
  on public.reservation_agreements (status)
  where status not in ('converted', 'refunded', 'cancelled');

-- For the per-vehicle "how many reservations on this Ferrari?" check
-- that gates LLC-formation triggering.
create index if not exists reservation_agreements_vehicle_active_idx
  on public.reservation_agreements (vehicle_symbol, status)
  where vehicle_symbol is not null
    and status in ('signed', 'deposit_received');

create index if not exists reservation_agreements_boat_active_idx
  on public.reservation_agreements (boat_slug, status)
  where boat_slug is not null
    and status in ('signed', 'deposit_received');

-- updated_at autotouch trigger (matches prospects + dispute_cases).
drop trigger if exists reservation_agreements_set_updated_at
  on public.reservation_agreements;

create or replace function public.reservation_agreements_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reservation_agreements_set_updated_at
  before update on public.reservation_agreements
  for each row
  execute function public.reservation_agreements_set_updated_at();

-- RLS: admin-only via service-role bypass. No SELECT policies because
-- there's no legitimate non-admin read path for cohort-1 reservation
-- data. The /api/admin/* routes use requireAdmin() before any DB call.
alter table public.reservation_agreements enable row level security;

-- Defense-in-depth: revoke from anon + authenticated roles so even
-- if someone bypasses RLS via a misconfigured policy, no data leaks.
revoke all on public.reservation_agreements from anon;
revoke all on public.reservation_agreements from authenticated;

-- Comments for the next-reader / next-migration context.
comment on table public.reservation_agreements is
  'Founding-cohort reservation agreements (MVP test). One per prospect+vehicle. Admin-only via /api/admin/* routes. Distinct from share_purchases (post-LLC-formation) and contact_messages (inbound web form).';
comment on column public.reservation_agreements.status is
  'Lifecycle. draft → sent → signed → deposit_received → converted | cancelled | refunded.';
comment on column public.reservation_agreements.expires_at is
  '60-day default per Miami-dealer ROFR norms. Reservations past expires_at without progressing should be reviewed for refund or extension.';
