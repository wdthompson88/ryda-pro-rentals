-- LLC messages — one thread per LLC, members of that LLC can read +
-- write. Replaces the marketing placeholder at /messages with real
-- co-owner messaging.
--
-- Audit Finding #7 (member journey): the /messages page has been
-- a "coming soon" placeholder since launch. Pre-launch is fine for
-- the marketing site, but Miami launch requires real co-owner
-- coordination (rolling stop, peak-week handoff, "I dinged the
-- bumper, here's what I did" disclosure). One thread per LLC is
-- the minimum viable surface — direct DMs and topic channels can
-- come later.
--
-- Membership model:
--   - A user is a "member" of an LLC if they hold an active
--     share (share_holdings row with transferred_at IS NULL) AND
--     the LLC's vehicle_symbol or boat_slug matches the share's.
--   - Membership is checked at message-write time via a security-
--     definer function (the join is non-trivial across two tables
--     and an asset-key XOR; doing it in RLS USING clauses would
--     be slow and hard to audit).
--   - Reads are gated by the same function so a member who later
--     transfers their share immediately loses read access to the
--     thread (deliberate — keeps confidential operational chat
--     scoped to current owners).
--
-- Append-only:
--   - No UPDATE or DELETE policies. Co-owners can't edit or delete
--     each other's messages; they also can't edit their own. This
--     is deliberate for chain-of-custody (e.g., "did you actually
--     say you'd pay for that scratch?"). If someone wants a
--     correction they post a follow-up.
--   - Admins (service-role) can DELETE for compliance / abuse
--     escalations via the admin tooling.

create extension if not exists pgcrypto;

-- 1) Helper function: is the CURRENT user a member of this LLC? --
--
-- Security-definer because the body needs to read share_holdings
-- + llc_entities, both of which are RLS-restricted (share_holdings
-- to the owning user; llc_entities to admins). The function reads
-- both tables on behalf of the caller and returns a boolean.
--
-- Codex round-1 catch: the previous signature took an explicit
-- p_user_id, which made the function a membership oracle — any
-- authenticated user could query whether ANOTHER user was in any
-- LLC. We now derive the user id from auth.uid() inside the
-- function so the caller can only ever introspect their own
-- membership.
--
-- search_path is locked to '' (codex round-1 best-practice nudge)
-- — every table reference is fully schema-qualified below, so the
-- function isn't vulnerable to a search_path injection from a
-- compromised role.

-- Defensive drop of the prior 2-arg signature in case it was ever
-- applied during dev (codex round-2 catch). Without this, a re-run
-- of an earlier dev DB would leave the old oracle function in
-- place as an overload alongside the new safe 1-arg version.
drop function if exists public.is_llc_member(uuid, uuid);

create or replace function public.is_llc_member(
  p_llc_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.share_holdings sh
    join public.llc_entities lle
      on (
        (lle.vehicle_symbol is not null and sh.vehicle_symbol = lle.vehicle_symbol)
        or
        (lle.boat_slug is not null and sh.boat_slug = lle.boat_slug)
      )
    where sh.user_id = auth.uid()
      and sh.transferred_at is null
      and lle.id = p_llc_entity_id
  );
$$;

revoke all on function public.is_llc_member(uuid) from public;
grant execute on function public.is_llc_member(uuid) to authenticated;

-- 2) Messages table -----------------------------------------------

create table if not exists public.llc_messages (
  id              uuid primary key default gen_random_uuid(),
  llc_entity_id   uuid not null references public.llc_entities(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- Message body. 4000-char ceiling absorbs reasonable trip-planning
  -- detail without becoming a free-form file upload surface (we'd
  -- want a separate file_url column for that).
  body            text not null check (length(body) >= 1 and length(body) <= 4000),
  created_at      timestamptz not null default now()
);

-- Indexes for the two access patterns:
--   - thread render: messages WHERE llc_entity_id = ? ORDER BY created_at DESC LIMIT 50
--   - polling: messages WHERE llc_entity_id = ? AND created_at > <since> ORDER BY created_at ASC
-- Single composite covers both (DESC scan for first page, range scan for poll).
create index if not exists llc_messages_thread_idx
  on public.llc_messages (llc_entity_id, created_at desc);
create index if not exists llc_messages_user_idx
  on public.llc_messages (user_id);

-- 3) RLS ----------------------------------------------------------

alter table public.llc_messages enable row level security;

-- READ: a member of the LLC can read all messages in that LLC's
-- thread. Non-members and post-transfer ex-members get nothing.
drop policy if exists llc_messages_read_members on public.llc_messages;
create policy llc_messages_read_members on public.llc_messages
  for select
  to authenticated
  using (public.is_llc_member(llc_entity_id));

-- WRITE: a member can INSERT their own messages. Two checks:
--   1. user_id MUST equal auth.uid() (no impersonation)
--   2. they must currently be a member of the target LLC
drop policy if exists llc_messages_insert_members on public.llc_messages;
create policy llc_messages_insert_members on public.llc_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_llc_member(llc_entity_id)
  );

-- No UPDATE or DELETE policies — append-only by design (see file
-- header comment). Service role bypasses RLS for admin tooling.

-- 4) Helpful comments ---------------------------------------------

comment on table public.llc_messages is
  'Append-only co-owner messages, one thread per LLC. Membership gated by is_llc_member() against active share_holdings.';
comment on function public.is_llc_member(uuid) is
  'Returns true if the CURRENT user (auth.uid()) currently holds an active share in the LLC. Security-definer so it can read RLS-restricted share_holdings + llc_entities tables on the caller''s behalf. Codex round-1 catch: previously took p_user_id as a param which made it a membership oracle for arbitrary users; now derives from auth.uid() internally.';
