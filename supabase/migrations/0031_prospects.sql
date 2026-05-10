-- Prospects table — founding-cohort sales-motion CRM.
--
-- Why now (per docs/RYDA_STRATEGIC_AUDIT.md and the May 2026 site
-- audit): the next 14 days run an MVP test where Stefano makes 25
-- warm calls to convert into 5 wired refundable deposits on the
-- first Ferrari. Today, those calls land in:
--   - Stefano's memory
--   - Maybe a personal spreadsheet
--   - The contact_messages table (only inbound web)
--
-- That breaks at ~25 prospects because Dave can't see who Stefano
-- called yesterday, follow-ups fall through, no conversion analysis,
-- and there's no audit trail when the seed-round investors ask for
-- the cohort funnel. This table is the smallest possible CRM sized
-- for the 100-member founding cohort, not 100,000.
--
-- Distinct from contact_messages (inbound web form), investor_inquiries
-- (separate audience), and waitlist (older lead pre-marketing-site).
-- This is for OUTBOUND sales motion + qualified inbound that converts
-- to a phone conversation.
--
-- RLS: admin-only read/write via service role from /api/admin/* routes.
-- No public/member read access — prospects are pre-customers and their
-- info is internal sales data, not member data.

create table if not exists public.prospects (
  id                    uuid primary key default gen_random_uuid(),

  -- Identity
  full_name             text not null,
  email                 text,
  phone                 text,

  -- Where this prospect came from. Free text by design — we'll let
  -- the team write descriptive sources ("Stefano warm intro from
  -- Evercore", "Cars & Coffee Wynwood May 12", "Bucknell alumni
  -- LinkedIn") rather than enum a closed list. Reporting can group
  -- after the fact.
  source                text not null,

  -- Funnel stage. Short enum so the kanban-style views and
  -- reporting are clean.
  --   cold          — identified, no contact attempt yet
  --   contacted     — outreach sent (call attempted, email sent, intro made)
  --   call_booked   — scheduled discovery call on the calendar
  --   call_done     — discovery call happened
  --   interested    — explicit verbal/written interest, no money yet
  --   deposit_held  — refundable deposit wired (the MVP-test pass criterion)
  --   wired         — full share buy-in wired into LLC escrow
  --   joined_llc    — terminal success: OA signed, member of an active LLC
  --   declined      — terminal: not interested, not now, not ever
  stage                 text not null default 'cold'
                          check (stage in (
                            'cold', 'contacted', 'call_booked', 'call_done',
                            'interested', 'deposit_held', 'wired',
                            'joined_llc', 'declined'
                          )),

  -- Which car / share count this prospect is interested in. Optional
  -- because some prospects come in cold without a specific car in
  -- mind. Free text rather than a foreign key into vehicles because
  -- the prospect might say "any Ferrari" or "boats" — we don't want
  -- to lose that nuance to schema strictness.
  car_of_interest       text,
  shares_of_interest    smallint check (shares_of_interest is null or shares_of_interest > 0),

  -- Which founder is the primary owner of this prospect's relationship.
  -- References auth.users so we can show owner avatar/name in the UI
  -- and report by-owner conversion. NULLABLE so a prospect can sit
  -- unassigned briefly between founders.
  owner_user_id         uuid references auth.users(id) on delete set null,

  -- Last touch + next action — drive the "follow-ups falling through"
  -- problem. last_touch_at updates on every call/email log; next_action
  -- is the date by which the owner intends to contact again.
  last_touch_at         timestamptz,
  last_touch_note       text,
  next_action_at        timestamptz,
  next_action_note      text,

  -- Free-text notes that accumulate across every conversation. Append-
  -- only convention enforced by the API layer, not the schema, so
  -- correction edits are still possible.
  notes                 text,

  -- Estimated check size — informational, not for forecasting (too
  -- early-stage for that). NULL when unknown.
  estimated_check_cents bigint,

  -- Bookkeeping
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Soft-delete column. We don't hard-delete prospects because
  -- declined-this-round prospects may convert in cohort 2 or year 2;
  -- we want the prior-conversation history available. Filter on
  -- archived_at IS NULL in default queries.
  archived_at           timestamptz
);

-- Indexes the queue/list views need.
-- Stage filter (kanban + admin list) is by far the most common.
create index if not exists prospects_stage_idx
  on public.prospects (stage)
  where archived_at is null;

-- "What needs my attention this week" — sorted by next_action_at,
-- only non-terminal stages.
create index if not exists prospects_next_action_idx
  on public.prospects (next_action_at)
  where archived_at is null
    and next_action_at is not null
    and stage not in ('joined_llc', 'declined');

-- By owner, for "my prospects" view per founder.
create index if not exists prospects_owner_idx
  on public.prospects (owner_user_id)
  where archived_at is null;

-- updated_at autotouch trigger (matches pattern of dispute_cases,
-- share_purchases, etc.).
drop trigger if exists prospects_set_updated_at on public.prospects;

create or replace function public.prospects_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger prospects_set_updated_at
  before update on public.prospects
  for each row
  execute function public.prospects_set_updated_at();

-- RLS: this is admin-only data. No public, no member access.
-- The /api/admin/prospects routes use the service-role client to
-- bypass RLS, after the requireAdmin gate has authenticated the
-- caller. There are no SELECT policies at all because there's no
-- legitimate non-service-role read pattern.
alter table public.prospects enable row level security;

-- Defense-in-depth: even if RLS is somehow bypassed, no anon role
-- has GRANTs on this table.
revoke all on public.prospects from anon;
revoke all on public.prospects from authenticated;

-- Comments for the next reader / next migration's context.
comment on table public.prospects is
  'Founding-cohort outbound sales CRM. Admin-only via /api/admin/prospects routes. Distinct from contact_messages (inbound web), investor_inquiries (separate audience), waitlist (pre-marketing-site).';
comment on column public.prospects.stage is
  'Funnel stage. cold → contacted → call_booked → call_done → interested → deposit_held → wired → joined_llc | declined.';
comment on column public.prospects.archived_at is
  'Soft-delete. Prospects who declined this round may convert in cohort 2 — keep history.';
