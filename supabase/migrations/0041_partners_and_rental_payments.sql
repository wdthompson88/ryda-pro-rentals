-- 0041: partners + rental_payments — schema for the fee-only rental
-- payment rail (Stripe Connect DIRECT charges).
--
-- Founder decision: the customer pays a Checkout link created ON the
-- operator's Express connected account. The rental price settles
-- straight to the operator and never enters RYDA's balance; RYDA's
-- commission rides along as application_fee_amount (per-partner
-- commission_rate, default 15%). Chargebacks/refunds are the
-- operator's. No destination charges, no transfers through the
-- platform balance — so these tables record fees and state, never
-- custody of rental money.
--
-- Flow: rental_inquiries (0039/0040) → operator confirms price
-- off-platform → admin sends a payment link (rental_payments row,
-- status 'pending') → customer pays → Connect webhook flips the row
-- to 'paid' and the inquiry to 'booked'.

-- ── partners ─────────────────────────────────────────────────────────
-- One row per operations partner. `name` matches the partner brand
-- string used in code (partner-fleet.ts `partner` field /
-- partner-contacts.ts map) so code-level lookups and DB rows agree;
-- partner-contacts.ts stays the email fallback until contact_email is
-- filled in here. stripe_account_id is the Express connected account
-- (acct_…), null until onboarding completes.

create table if not exists public.partners (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null unique,
  contact_email        text,
  market               text not null default 'Miami',
  commission_rate      numeric(4,3) not null default 0.150
                         check (commission_rate >= 0 and commission_rate <= 0.5),
  stripe_account_id    text unique,
  stripe_onboarded_at  timestamptz,
  status               text not null default 'active'
                         check (status in ('active','paused')),
  created_at           timestamptz not null default now()
);

-- Seed the distinct partner names currently in partner-fleet.ts
-- (today that's GM LUXE only). Idempotent: re-running never resets a
-- row that ops has since edited (commission, email, Stripe account).
insert into public.partners (name, market)
values
  ('GM LUXE', 'Miami')
on conflict (name) do nothing;

-- ── rental_payments ──────────────────────────────────────────────────
-- One row per payment link sent for an inquiry. amount_cents is the
-- operator-confirmed rental price; application_fee_cents is RYDA's
-- cut, computed once by computeRentalFee (src/lib/fees.ts) at link
-- creation and frozen here so a later commission_rate change never
-- rewrites history. A re-quote after expiry/cancel is a NEW row —
-- 'paid' rows are immutable financial records.

create table if not exists public.rental_payments (
  id                          uuid primary key default gen_random_uuid(),
  inquiry_id                  uuid not null references public.rental_inquiries(id) on delete restrict,
  partner_id                  uuid not null references public.partners(id),
  amount_cents                integer not null check (amount_cents > 0),
  currency                    text not null default 'usd',
  application_fee_cents       integer not null check (application_fee_cents >= 0),
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text,
  status                      text not null default 'pending'
                                check (status in ('pending','paid','expired','canceled')),
  pay_link_url                text,
  pay_link_sent_at            timestamptz,
  paid_at                     timestamptz,
  created_at                  timestamptz not null default now()
);

create index if not exists rental_payments_inquiry_id_idx
  on public.rental_payments (inquiry_id);
create index if not exists rental_payments_partner_id_idx
  on public.rental_payments (partner_id);
create index if not exists rental_payments_status_idx
  on public.rental_payments (status);
create index if not exists rental_payments_created_at_idx
  on public.rental_payments (created_at desc);

-- One live pending link per inquiry — the DB backstop for the
-- concurrent "Send payment link" race (two admins, same few hundred
-- ms). The route treats a 23505 here as "another admin won": it
-- expires its own orphaned Checkout session and returns the winner's
-- link, or 409s if the amounts diverge.
create unique index if not exists rental_payments_one_pending_per_inquiry
  on public.rental_payments (inquiry_id)
  where status = 'pending';

-- Status guard: the only legal transitions are pending → paid /
-- expired / canceled. 'paid' is terminal (webhook-verified money —
-- nothing may un-pay it), and expired/canceled rows are dead ends by
-- design: a revived deal gets a fresh row and a fresh Checkout
-- session. Same-status updates pass through so the webhook can stamp
-- stripe_payment_intent_id / pay_link_sent_at without tripping the
-- guard. (Trigger pattern per 0016/0032.)
create or replace function public.rental_payments_enforce_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if old.status <> 'pending'
       or new.status not in ('paid', 'expired', 'canceled') then
      raise exception 'illegal rental_payments status transition: % -> %',
        old.status, new.status;
    end if;
  end if;

  -- Financial identity is set at insert and never edited: the amount,
  -- fee, currency, and inquiry/partner linkage are frozen for the
  -- row's entire life (a re-quote is a NEW row, never an edit).
  if new.amount_cents is distinct from old.amount_cents
     or new.application_fee_cents is distinct from old.application_fee_cents
     or new.currency is distinct from old.currency
     or new.inquiry_id is distinct from old.inquiry_id
     or new.partner_id is distinct from old.partner_id then
    raise exception 'rental_payments: financial fields are immutable';
  end if;

  -- Once paid, the Stripe ids and timestamp freeze too — the row is a
  -- financial record of money that moved; nothing may rewrite it.
  if old.status = 'paid'
     and (new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
          or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
          or new.paid_at is distinct from old.paid_at) then
    raise exception 'rental_payments: paid rows are immutable';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists rental_payments_status_guard on public.rental_payments;
create trigger rental_payments_status_guard
  before update on public.rental_payments
  for each row execute function public.rental_payments_enforce_status();

-- ── RLS ──────────────────────────────────────────────────────────────
-- Enabled with NO anon/authenticated policies on either table:
-- service-role only. partners holds ops-sensitive commercial terms
-- (commission rates, Stripe account ids, contact emails) that must
-- never reach the browser — customers only ever see "a vetted Miami
-- operator". rental_payments is written exclusively by the admin
-- send-link route and the Connect webhook, both service-role. The
-- member-facing "my bookings" surface comes later and will add a
-- scoped select policy in its own migration.

alter table public.partners enable row level security;
alter table public.rental_payments enable row level security;
