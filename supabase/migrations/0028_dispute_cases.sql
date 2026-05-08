-- Stripe dispute / chargeback tracking.
--
-- Why now (LAUNCH BLOCKER per payment-integration agent):
-- Stripe automatically closes disputes in the bank's favor after
-- 7-20 days if no evidence is submitted. RYDA shares are $130K+,
-- so a single defaulted dispute is catastrophic financially +
-- reputationally. Without this table, an incoming
-- charge.dispute.created webhook has nowhere to land — ops
-- never sees the alert, evidence never gets submitted, dispute
-- closes against us by default.
--
-- Schema mirrors the spec in
-- .launch-prep/security/dispute-chargeback-playbook.md.
--
-- RLS: members can read their own dispute_cases (so a future
-- /account/disputes page can show "we received a dispute on
-- your purchase, here's the status"). Admins can do anything.
-- Service role (the webhook handler) bypasses RLS.

create table if not exists public.dispute_cases (
  id                    uuid primary key default gen_random_uuid(),
  -- Stripe's dispute ID — unique across the platform; lets the
  -- handler dedup duplicate updated/closed events that target the
  -- same dispute.
  stripe_dispute_id     text not null unique,

  -- The share_purchase the dispute is filed against. References
  -- share_purchases.id (uuid). On purchase deletion (which we
  -- shouldn't do but defensively), cascade so we don't leave
  -- orphan disputes.
  purchase_id           uuid not null references public.share_purchases(id) on delete cascade,

  -- The user who originally made the purchase. Useful for
  -- per-member dispute history (repeat-disputers warrant
  -- enhanced scrutiny). NULLABLE because ON DELETE SET NULL
  -- preserves dispute history after a member account is deleted
  -- (compliance / audit trail outlives user lifecycle). Codex
  -- round-2 catch: NOT NULL + ON DELETE SET NULL was contradictory.
  user_id               uuid references auth.users(id) on delete set null,

  -- Dispute economics
  amount_cents          integer not null,
  currency              text not null default 'usd',

  -- Stripe's reason code (fraudulent, product_not_received, etc.)
  reason                text,

  -- Lifecycle status from Stripe — driven by webhook events:
  --   warning_needs_response (early warning, may not become a dispute)
  --   needs_response         (active; ops must submit evidence)
  --   under_review           (Stripe is reviewing our submission)
  --   won                    (terminal — we kept the funds)
  --   lost                   (terminal — bank ruled against us)
  --   charge_refunded        (terminal — we proactively refunded)
  status                text not null,

  -- Stripe's deadline for our evidence submission. NULL until
  -- the first webhook event sets it.
  evidence_due_by       timestamptz,

  -- Evidence package state
  evidence_submitted_at timestamptz,
  evidence_notes        text,

  -- Outcome (terminal state only)
  outcome               text check (outcome in ('won', 'lost', 'withdrawn') or outcome is null),
  outcome_at            timestamptz,

  -- Ops bookkeeping
  ops_alerted_at        timestamptz,
  member_contacted_at   timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Lookup by purchase (for the /account UI showing a member their
-- own dispute) and by status (for the /admin/disputes triage
-- queue, which only cares about non-terminal cases).
create index if not exists dispute_cases_purchase_idx
  on public.dispute_cases (purchase_id);
create index if not exists dispute_cases_status_idx
  on public.dispute_cases (status)
  where outcome is null;
create index if not exists dispute_cases_user_idx
  on public.dispute_cases (user_id);

-- Quick "is this purchase under dispute" lookup. The refund route
-- will check share_purchases.dispute_status before allowing a
-- refund (you cannot refund a disputed charge — Stripe rejects).
alter table public.share_purchases
  add column if not exists dispute_status text
  check (dispute_status in ('disputed', 'dispute_won', 'dispute_lost') or dispute_status is null);

-- RLS: members can read their own; admins via service role.
alter table public.dispute_cases enable row level security;

drop policy if exists "members_read_own_disputes" on public.dispute_cases;
create policy "members_read_own_disputes"
  on public.dispute_cases
  for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS, so the webhook + admin routes have
-- full access without policy gymnastics.
