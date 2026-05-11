-- LLC member votes — formal supermajority decisions per the OA.
--
-- Audit Finding #8 (member journey): the Operating Agreement
-- specifies 75% supermajority for material decisions (sale,
-- replacement, modifications, deficit assessments >$2.5k/share),
-- but there's no surface for members to actually cast a vote.
-- This migration is the data layer for the member voting UI.
--
-- Design notes:
--
-- Vote lifecycle: open → (passed | failed | withdrawn).
--   - 'open' = ballots are being collected, deadline not yet reached
--   - 'passed' = closes_at reached AND yes_shares / eligible_shares >= threshold_pct
--   - 'failed' = closes_at reached AND below threshold
--   - 'withdrawn' = admin closed before deadline (e.g. proposer
--     pulled it after objection)
--   Status transitions are computed by a server-side cron OR
--   on read (whichever is cheaper); not done in this migration.
--
-- Eligibility snapshot: eligible_share_total is captured at vote-
-- open time (when the row is inserted) by summing the active
-- share_holdings against the LLC's underlying asset. This freezes
-- the denominator so a transfer mid-vote doesn't shift the math.
-- For MVP: the holder-at-ballot-time gets to vote with whatever
-- shares they currently hold. Real-world OAs typically use a
-- "record date" (a fixed snapshot of who held shares at vote-open),
-- which is more legally robust — punted to a follow-up.
--
-- KNOWN LIMITATION (codex round-1 MEDIUM): share rollover can
-- double-count. Sequence: holder A votes yes with 2 shares, then
-- transfers those 2 shares to holder B, then B votes yes with the
-- same 2 shares. Both ballots remain in llc_vote_ballots and both
-- shares_at_ballot count toward the tally — turnout/yes can
-- exceed 100% of the frozen eligible_share_total. Pre-Miami
-- launch, share transfers are admin-mediated and rare, so this
-- is acceptable. Real-world fix: when a transfer is recorded,
-- void the seller's open ballots OR adopt a true record-date
-- model. The /votes UI surfaces this in copy so members
-- understand the MVP semantics.
--
-- Ballot rules:
--   - One ballot per (vote_id, user_id). Re-submit overwrites
--     (a member can change their mind before close).
--   - shares_at_ballot is snapshotted at submission so admin can
--     audit the tally without re-querying historical share state.
--   - 'choice' is yes/no/abstain. Abstain counts toward turnout
--     but not toward yes-percentage (the threshold is yes_shares
--     / eligible_share_total, NOT / shares_voted — abstain doesn't
--     reduce the denominator).
--
-- Append-only?
--   - Votes are append-only; admin can mark withdrawn but not delete.
--   - Ballots are mutable (re-submission overwrites) until close.
--   - After close, no inserts/updates allowed (DB-level via
--     status check in WITH CHECK).

create extension if not exists pgcrypto;

-- 1) Vote types ---------------------------------------------------

-- Reserved set so the UI can render type-specific guidance.
-- 'general' is the catch-all for one-off decisions outside the
-- OA's enumerated supermajority triggers.
-- Codex round-1 catch: enum existence checks include typnamespace
-- so we don't accidentally skip creation when another schema has
-- a same-named enum. Public-schema-scoped existence is what we
-- care about.
do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'llc_vote_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.llc_vote_type as enum (
      'sale',
      'replacement',
      'modification',
      'deficit_assessment',
      'general'
    );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'llc_vote_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.llc_vote_status as enum (
      'open',
      'passed',
      'failed',
      'withdrawn'
    );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'llc_vote_choice'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.llc_vote_choice as enum (
      'yes',
      'no',
      'abstain'
    );
  end if;
end$$;

-- 2) Votes table --------------------------------------------------

create table if not exists public.llc_votes (
  id                    uuid primary key default gen_random_uuid(),
  llc_entity_id         uuid not null references public.llc_entities(id) on delete cascade,
  vote_type             public.llc_vote_type not null default 'general',
  title                 text not null check (length(title) >= 4 and length(title) <= 200),
  description           text not null check (length(description) >= 10 and length(description) <= 8000),
  -- Threshold as percent (0-100, inclusive of decimals as integer
  -- basis points × 100 would be more robust but YAGNI for now).
  -- 75 = 75%, the OA-typical supermajority. Stored per-vote so a
  -- 'general' vote can use a simpler 51% rule if needed.
  threshold_pct         numeric(5,2) not null default 75
    check (threshold_pct > 0 and threshold_pct <= 100),
  -- Snapshot at vote-open: total outstanding shares of the LLC's
  -- underlying asset that are eligible to vote. Frozen so transfers
  -- mid-vote don't shift the denominator.
  eligible_share_total  integer not null check (eligible_share_total > 0),
  opens_at              timestamptz not null default now(),
  closes_at             timestamptz not null check (closes_at > opens_at),
  status                public.llc_vote_status not null default 'open',
  -- Admin who created the vote. Helps trace governance lineage.
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists llc_votes_llc_idx on public.llc_votes (llc_entity_id);
create index if not exists llc_votes_open_idx on public.llc_votes (status, closes_at)
  where status = 'open';

-- updated_at maintenance.
create or replace function public.touch_llc_votes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_llc_votes_updated_at on public.llc_votes;
create trigger trg_llc_votes_updated_at
  before update on public.llc_votes
  for each row execute function public.touch_llc_votes_updated_at();

-- 3) Ballots table ------------------------------------------------

create table if not exists public.llc_vote_ballots (
  id                  uuid primary key default gen_random_uuid(),
  vote_id             uuid not null references public.llc_votes(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  choice              public.llc_vote_choice not null,
  -- Snapshot the voter's share count at submission time. This is
  -- what counts toward the tally. Re-submission overwrites this
  -- with the then-current value.
  shares_at_ballot    integer not null check (shares_at_ballot > 0),
  submitted_at        timestamptz not null default now(),
  -- A note the voter can attach to their ballot. Optional. Useful
  -- for documenting the rationale for a 'no' vote.
  rationale           text check (rationale is null or length(rationale) <= 2000),

  -- Exactly one ballot per (vote, user). Re-submission UPDATEs.
  unique (vote_id, user_id)
);

create index if not exists llc_vote_ballots_vote_idx on public.llc_vote_ballots (vote_id);
create index if not exists llc_vote_ballots_user_idx on public.llc_vote_ballots (user_id);

-- 4) RLS ----------------------------------------------------------

alter table public.llc_votes enable row level security;
alter table public.llc_vote_ballots enable row level security;

-- Members of an LLC can READ all votes for that LLC. Reuses the
-- is_llc_member() function from migration 0035.
drop policy if exists llc_votes_read_members on public.llc_votes;
create policy llc_votes_read_members on public.llc_votes
  for select
  to authenticated
  using (public.is_llc_member(llc_entity_id));

-- Only admins (service-role) create votes. No member-facing INSERT
-- policy. (Future: allow LLC members to propose votes; for MVP,
-- admins do it via service-role tooling.)

-- Ballots: members can READ ballots for any vote in an LLC they
-- belong to (so the tally is transparent — each member sees who
-- voted what; no secret ballots in an LLC).
drop policy if exists llc_vote_ballots_read_members on public.llc_vote_ballots;
create policy llc_vote_ballots_read_members on public.llc_vote_ballots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.llc_votes v
      where v.id = vote_id
        and public.is_llc_member(v.llc_entity_id)
    )
  );

-- Codex round-1 HIGH catch: the previous direct-INSERT policy let
-- a member spoof shares_at_ballot to any positive integer via the
-- supabase-js client, bypassing the API's server-derived count.
-- The previous direct-UPDATE policy let a member move their ballot
-- to a different vote_id (incl. closed votes in another LLC) by
-- only checking user_id in WITH CHECK.
--
-- Fix: deny direct INSERT/UPDATE for authenticated callers
-- entirely. All ballot writes route through the cast_llc_vote()
-- RPC (defined below), which derives shares_at_ballot from
-- share_holdings server-side and re-validates open/membership
-- atomically. The route's POST also calls this RPC; service-role
-- still bypasses RLS for admin tooling.
--
-- (We don't need INSERT/UPDATE policies — the absence of permissive
-- policies for authenticated role denies by default once RLS is
-- enabled. Keeping the policies removed makes intent explicit.)
drop policy if exists llc_vote_ballots_insert_members on public.llc_vote_ballots;
drop policy if exists llc_vote_ballots_update_members on public.llc_vote_ballots;

-- No DELETE — once cast, a ballot stays for audit. Members who
-- want to "revoke" a vote re-submit (via cast_llc_vote) with
-- choice='abstain'.

-- 5) Ballot submission RPC ---------------------------------------
--
-- Single security-definer entry point for ballots. Derives
-- shares_at_ballot server-side from share_holdings (the caller
-- can't spoof). Re-validates open/deadline/membership atomically
-- so TOCTOU between the route's gate and the upsert is closed.
--
-- Returns the (possibly updated) ballot row, or raises an
-- exception with a clear message that the route can surface.

create or replace function public.cast_llc_vote(
  p_vote_id uuid,
  p_choice public.llc_vote_choice,
  p_rationale text default null
)
returns public.llc_vote_ballots
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_vote public.llc_votes%rowtype;
  v_shares int;
  v_result public.llc_vote_ballots%rowtype;
begin
  if v_user is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;

  if p_rationale is not null and length(p_rationale) > 2000 then
    raise exception 'Rationale must be at most 2000 characters.' using errcode = '22023';
  end if;

  -- Fetch + lock the vote row to serialize concurrent ballots
  -- against status/deadline transitions on this vote.
  select * into v_vote
  from public.llc_votes
  where id = p_vote_id
  for share;

  -- Codex round-2 LOW catch: do membership + share check BEFORE
  -- vote-status checks. Otherwise a non-member with a guessed/leaked
  -- vote_id could distinguish "not found" from "closed" from "open
  -- but you have no shares" — a metadata oracle. By gating on
  -- membership first and raising the same generic error for both
  -- not-found-vote and not-a-member, the RPC reveals nothing about
  -- a vote's existence to non-members.
  if not found then
    raise exception 'Vote not found or not accessible.' using errcode = '42501';
  end if;

  -- Membership + share count, derived from share_holdings. Uses
  -- the same join that is_llc_member() uses, but also returns the
  -- share count so we can write it into shares_at_ballot.
  select coalesce(sum(sh.shares), 0) into v_shares
  from public.share_holdings sh
  join public.llc_entities lle
    on (
      (lle.vehicle_symbol is not null and sh.vehicle_symbol = lle.vehicle_symbol)
      or
      (lle.boat_slug is not null and sh.boat_slug = lle.boat_slug)
    )
  where sh.user_id = v_user
    and sh.transferred_at is null
    and lle.id = v_vote.llc_entity_id;

  if v_shares <= 0 then
    -- Same generic message as 'vote not found' so a non-member
    -- can't tell which one we hit.
    raise exception 'Vote not found or not accessible.' using errcode = '42501';
  end if;

  -- Now safe to surface vote-state errors to confirmed members.
  if v_vote.status <> 'open' then
    raise exception 'Vote is not open.' using errcode = 'P0001';
  end if;
  if v_vote.closes_at <= now() then
    raise exception 'Vote has reached its deadline.' using errcode = 'P0001';
  end if;

  -- Upsert the ballot. shares_at_ballot is derived, not user-supplied.
  insert into public.llc_vote_ballots
    (vote_id, user_id, choice, shares_at_ballot, rationale, submitted_at)
  values
    (p_vote_id, v_user, p_choice, v_shares,
     case when p_rationale is null or length(trim(p_rationale)) = 0
          then null else trim(p_rationale) end,
     now())
  on conflict (vote_id, user_id) do update
    set choice = excluded.choice,
        shares_at_ballot = excluded.shares_at_ballot,
        rationale = excluded.rationale,
        submitted_at = excluded.submitted_at
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.cast_llc_vote(uuid, public.llc_vote_choice, text) from public;
grant execute on function public.cast_llc_vote(uuid, public.llc_vote_choice, text) to authenticated;

comment on function public.cast_llc_vote(uuid, public.llc_vote_choice, text) is
  'Single entry point for ballot submission. Derives shares_at_ballot from share_holdings (callers cannot spoof). Validates open/deadline/membership atomically with FOR SHARE lock on the vote row. Replaces the direct INSERT/UPDATE policies on llc_vote_ballots, which previously allowed a member to spoof their share count via supabase-js (codex round-1 HIGH catch).';

-- 5) Comments -----------------------------------------------------

comment on table public.llc_votes is
  'Formal LLC member votes. Created by admins via service-role; tally is computed in the API layer from llc_vote_ballots. eligible_share_total is snapshotted at open to freeze the denominator.';
comment on table public.llc_vote_ballots is
  'Per-member ballots. shares_at_ballot snapshotted at submission. Re-submission UPDATEs the existing row (UNIQUE (vote_id, user_id)). No DELETE — abstain instead.';
