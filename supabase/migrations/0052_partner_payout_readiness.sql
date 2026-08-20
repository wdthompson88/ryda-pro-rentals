-- 0052: partners learns whether an operator can actually BE PAID.
-- (RYDA_RENTAL_BUILD_LOOP.md phase 3B / decision D4. Claims 0052; 0051 is
-- the rental_payments platform rail.)
--
-- THE SIGNAL THAT WAS MISSING, and why the one we had is the wrong one.
--
-- partners.stripe_onboarded_at is stamped by /api/admin/partners when
-- Stripe reports `charges_enabled` on the connected account. That is the
-- correct gate for the INQUIRY rail (0041), where the operator's own
-- account takes the customer's card — an operator who cannot charge
-- cannot be sent a payment link.
--
-- D4 asks a different question. On the booking rail RYDA charges, holds,
-- and then TRANSFERS to the operator after a clean return. What matters
-- there is whether the account can RECEIVE and whether Stripe will pay
-- that balance out to their bank — and an account can be
-- charges_enabled while payouts are disabled, which happens routinely:
-- verification pending, a document expiring, a bank account rejected
-- after the fact. Using stripe_onboarded_at as the payout gate would
-- therefore approve transfers into accounts whose money then sits frozen
-- in a Stripe balance nobody is watching, with the operator told they
-- were paid.
--
-- So this migration stores what Stripe actually says about payouts, and
-- when it last said it.
--
-- WHY STORE IT AT ALL rather than calling Stripe at payout time.
-- The payout route SHOULD re-check before moving money and will. But the
-- RECONCILIATION view — "what does RYDA owe, to whom, and what is
-- blocking each one" — is a list, and answering it by retrieving every
-- operator's account from Stripe on every page load is a rate-limited
-- round trip per row that fails as a unit. A stored answer makes the
-- blocked list renderable from one query, and payout_status_at makes its
-- staleness visible instead of implied.
--
-- These are a CACHE of Stripe's state, never a source of truth. Nothing
-- may pay an operator on the strength of these columns alone.

alter table public.partners
  add column if not exists payouts_enabled boolean not null default false;

alter table public.partners
  add column if not exists details_submitted boolean not null default false;

-- The `transfers` capability, verbatim from Stripe ('active', 'pending',
-- 'inactive'). Distinct from payouts_enabled and both are needed:
-- capability governs whether RYDA may send money INTO the account,
-- payouts_enabled whether Stripe will send it ON to the operator's bank.
-- A transfer into an account with an inactive transfers capability is
-- rejected outright; a transfer into one with payouts disabled succeeds
-- and then sits.
--
-- Free text rather than a CHECK: this mirrors a third-party vocabulary
-- that Stripe may extend, and a value we do not recognise must not fail
-- the webhook that is trying to tell us about it. The payout gate treats
-- anything other than 'active' as not-payable, so an unknown value fails
-- CLOSED.
alter table public.partners
  add column if not exists transfers_capability text;

-- When Stripe last told us. Null means "never asked", which the
-- reconciliation view renders differently from "asked, and the answer was
-- no" — the first is a RYDA problem, the second is the operator's.
alter table public.partners
  add column if not exists payout_status_at timestamptz;

-- Partial index: the reconciliation sweep asks for operators that are NOT
-- payable far more often than it asks for the roster, and blocked
-- operators are the small set.
create index if not exists partners_payouts_blocked_idx
  on public.partners (id)
  where payouts_enabled = false;

comment on column public.partners.payouts_enabled is
  'Stripe''s account.payouts_enabled, cached. Whether Stripe will pay this connected account''s balance out to their bank. NOT the same as stripe_onboarded_at, which tracks charges_enabled and gates the 0041 direct-charge rail — an account can be charges_enabled with payouts disabled.';

comment on column public.partners.details_submitted is
  'Stripe''s account.details_submitted, cached. The operator finished the Express onboarding form.';

comment on column public.partners.transfers_capability is
  'Stripe''s capabilities.transfers, verbatim (active/pending/inactive). Governs whether RYDA may transfer INTO the account at all. Unchecked free text so an unrecognised value cannot fail the webhook; the payout gate treats anything but ''active'' as not payable, so unknown fails closed.';

comment on column public.partners.payout_status_at is
  'When Stripe last reported the three columns above. Null means never asked — which the reconciliation view distinguishes from asked-and-refused, because the first is RYDA''s problem to fix.';
