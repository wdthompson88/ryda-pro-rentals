-- 0049: notifications — the in-app notification feed, and the two rules
-- that make a notification worth believing.
-- (RYDA_RENTAL_BUILD_LOOP.md phase 0C. Claims 0049; 0048 is the
-- configurable fee-engine PR.)
--
-- WHAT THIS IS
-- RYDA has exactly one notification channel today: src/lib/notify.ts,
-- a Resend wrapper that sends the TEAM an email. There is nowhere for a
-- renter to see that their request was answered, and nowhere for an
-- operator to see that a request arrived. 0047 gave the rental flow a
-- lifecycle; this file gives that lifecycle somewhere to be announced.
--
-- THE PATTERN, AND THE ONE PLACE IT IS DELIBERATELY NOT COPIED
-- The build loop says to donate Mainstable's shape:
-- notifications(user_id, type, title, link, read) + a notify() helper +
-- a fan-out. The columns are borrowed almost verbatim. The INSERT
-- POLICY IS NOT.
--
-- Mainstable lets any authenticated user insert a notification, because
-- its flows are peer-to-peer: party A notifies party B directly from
-- the browser. The cost of that convenience is that any authenticated
-- user can also write a row into ANY OTHER user's feed, with any title
-- and any link. On a marketplace where the feed is where a renter finds
-- out whether their booking was approved, that is a forgery surface:
-- an attacker drops "Your booking is confirmed — collect the keys at
-- <address>" into a stranger's feed, and the feed itself is the thing
-- that makes it credible.
--
-- So RYDA has NO insert policy at all. Every notification is written by
-- a service-role route (src/lib/notifications.ts), beside the business
-- write that earns it. There is no path from a browser into someone
-- else's feed, and no path from a browser into the caller's OWN feed
-- either — a notification a user can write to themselves is a
-- self-screenshot, which is the same lie one hop shorter.
--
-- THE SECOND RULE: read_at IS THE ONLY THING A USER MAY WRITE — AND
-- EVEN THAT IS THE DATABASE'S CLOCK, NOT THEIRS (section 3).
-- RLS scopes a user's UPDATE to their own rows, which is necessary and
-- not sufficient: within their own row nothing in RLS stops them
-- rewriting `title`. A user who can restyle "Your request was declined"
-- into "Your request was approved" on a row the server actually sent
-- them has a screenshot that survives inspection — the id is real, the
-- timestamp is real, the row is genuinely theirs. Section 3 makes every
-- column except read_at immutable at the trigger, and section 4 grants
-- UPDATE on the read_at column alone. Two layers, because the grant
-- protects only the `authenticated` role and the trigger protects the
-- row from every writer including a careless service-role route.
--
-- Marking a notification UNREAD again is allowed. It is the user's own
-- feed and their own reading state, and re-flagging something to come
-- back to is a feature, not an attack.
--
-- Nothing here touches co-ownership, and nothing here touches
-- user_profiles.notif_* — those columns are notification PREFERENCES
-- (which channels may reach you) and this table is notification
-- CONTENT. They meet later, when a digest job decides what to email;
-- they are not the same thing and must not be merged.

-- ── 1) notifications ────────────────────────────────────────────────
--
-- WHY THE TYPE VOCABULARY IS A CHECK AND NOT FREE TEXT.
-- The feed renders each row from title/body/link, so a bad `type`
-- breaks nothing visually — which is exactly why it would rot. The
-- CHECK makes the vocabulary a contract: src/lib/notifications.ts
-- declares the same list as NOTIFICATION_TYPES, and the Vitest suite
-- beside it parses THIS FILE and fails if the two ever disagree. Same
-- technique 0047's status list uses, for the same reason: two copies of
-- a list in two languages that no compiler relates drift silently.
--
-- Adding a type is therefore a two-file edit plus a migration. That
-- friction is the point — a type is what a digest job groups on and
-- what a preference toggle will eventually mute, so it is a public
-- interface, not a log tag.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),

  -- The recipient. `cascade`, unlike rental_bookings.renter_user_id
  -- (0047), and the difference is the point: a booking is a financial
  -- record that must survive the account it belonged to. (The MERCHANT
  -- OF RECORD on a rental is the OPERATOR, not RYDA — money moves by
  -- Stripe Connect direct charges into the operator's balance and RYDA
  -- takes only its application fee — but RYDA still has to be able to
  -- show what was agreed, and O4's ~120 days of chargeback exposure is
  -- answered from the operator's Stripe account with the booking row as
  -- the evidence.) A notification is a MESSAGE about that record, not
  -- the record. Keeping an orphaned "your booking was approved" after
  -- the account it addressed is gone serves nobody and leaves a feed row
  -- no policy can ever match again.
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- Vocabulary asserted in section 1b, mirrored in
  -- src/lib/notifications.ts.
  type        text not null,

  -- What the feed shows. `title` is the whole notification for most
  -- rows; `body` is the optional second line. Neither is HTML and
  -- neither is escaped here — the feed renders them as text nodes, and
  -- any future email path must escape them itself (escapeHtml in
  -- src/lib/notify.ts).
  title       text not null,
  body        text,

  -- Where the row goes when clicked. Constrained to a SAME-ORIGIN
  -- relative path in section 1b — see the constraint for why a column
  -- that ends up in an href gets its own guard even though only
  -- server code writes it.
  link        text,

  -- Read state as an INSTANT, not a boolean. `read boolean` is the
  -- Mainstable spelling and it answers one fewer question: a timestamp
  -- gives "unread" (null) for free, and additionally supports "read 3
  -- days ago", a digest that skips anything already seen, and the
  -- partial index below, which a boolean cannot serve as cheaply.
  read_at     timestamptz,

  created_at  timestamptz not null default now()
);

-- ── 1b) Constraints, asserted OUTSIDE the create ────────────────────
--
-- `create table if not exists` is a no-op against an environment that
-- already took an earlier draft of this file — a no-op that exits 0 and
-- reports success while leaving the table without whatever the newer
-- draft added. 0047 documents the same trap. Every constraint that
-- carries a rule therefore lives here, in drop-then-add form, so
-- re-running this migration actually applies it.

-- THE VOCABULARY. Mirrored by NOTIFICATION_TYPES in
-- src/lib/notifications.ts; the test parses this constraint.
--
--   booking_requested        → to the OPERATOR. A renter asked for
--                              dates on one of their cars (0047 row
--                              created in 'requested').
--   booking_approved         → to the RENTER. The operator said yes;
--                              the booking is 'confirmed' and the dates
--                              are held. This is the first event at
--                              which D6 lets the operator be NAMED.
--   booking_declined         → to the RENTER. The operator said no.
--   booking_counter_offered  → to the RENTER. The operator proposed
--                              different dates, which 0047 models as a
--                              NEW 'requested' row with initiated_by =
--                              'operator'. Still pre-confirmation:
--                              still anonymous.
--   booking_counter_answered → to the OPERATOR. The renter answered
--                              that counter-offer.
--   booking_expiring_soon    → to whichever party owes the answer
--                              (rental_bookings.initiated_by decides).
--                              O5's 24h clock, with warning.
--   booking_expired          → to both parties. Nobody answered in
--                              time; rental_bookings.expires_at passed
--                              and the row is terminal.
--   booking_cancelled        → to the other party. A confirmed booking
--                              was called off (0047 requires
--                              cancelled_by, because O3 prices a renter
--                              and an operator cancellation
--                              differently).
--   account_notice           → everything that is not a booking event:
--                              verification outcomes, admin messages,
--                              the acceptance-check test notification.
--                              Deliberately ONE catch-all rather than a
--                              per-feature type, so the booking
--                              vocabulary stays the precise half.
alter table public.notifications
  drop constraint if exists notifications_type_known;
alter table public.notifications
  add constraint notifications_type_known
    check (type in (
      'booking_requested',
      'booking_approved',
      'booking_declined',
      'booking_counter_offered',
      'booking_counter_answered',
      'booking_expiring_soon',
      'booking_expired',
      'booking_cancelled',
      'account_notice'
    ));

-- SAME-ORIGIN LINKS ONLY.
--
-- Only service-role code writes this column, so "the input is trusted"
-- is true today — and it is exactly the assumption that stops being
-- true the first time a route interpolates something into a link, which
-- is the shape of every open-redirect bug ever filed. The value ends up
-- in an <a href> the user is told to click BY RYDA, on a screen that
-- has already authenticated them; a row reading "Your booking was
-- approved" that navigates off-site is a phishing primitive with RYDA's
-- own chrome around it.
--
-- The rules mirror safeNext() in src/lib/safe-next.ts, and
-- isSafeNotificationLink() in src/lib/notifications.ts mirrors them
-- again so a route can reject before the insert rather than after:
--   leading '/'      — a path, not a scheme and not a host
--   not '//'         — protocol-relative ('//evil.com' is absolute)
--   no backslash     — browsers normalize '\' to '/', so '/x\evil.com'
--                      can resolve cross-origin
--   no colon         — nothing legitimate here contains one, and it is
--                      what every dangerous scheme needs
--   no control chars — header/URL-bar smuggling
alter table public.notifications
  drop constraint if exists notifications_link_relative;
alter table public.notifications
  add constraint notifications_link_relative
    check (
      link is null
      or (
            left(link, 1) = '/'
        and left(link, 2) <> '//'
        and position('\' in link) = 0
        and position(':' in link) = 0
        and link !~ '[[:cntrl:]]'
        and length(link) between 1 and 512
      )
    );

-- A notification with an empty title renders as a blank clickable row.
-- The bounds also cap what one row can cost the feed query.
alter table public.notifications
  drop constraint if exists notifications_text_bounded;
alter table public.notifications
  add constraint notifications_text_bounded
    check (
          length(btrim(title)) between 1 and 200
      and (body is null or length(body) <= 2000)
    );

-- ── 2) Indexes ──────────────────────────────────────────────────────

-- The feed itself: "my notifications, newest first". Composite rather
-- than two single-column indexes so the sort is served by the index and
-- a chatty user's feed does not sort their whole history per page.
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- The unread badge, and the unread filter. Partial, for the same reason
-- 0047's expiry index is: unread is the small slice, and it is asked
-- for on every /account page load by the nav badge. A count over this
-- index never touches a read row.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- ── 3) Immutability trigger — read_at, and nothing else ─────────────
--
-- Guardrail 3.8: enforce state at the database, not just the route.
--
-- The column GRANT in section 4 already stops a browser session from
-- writing anything but read_at. This trigger exists because a grant is
-- scoped to a ROLE, and service_role has all of them: it stops the
-- OTHER half of the problem, which is a well-meaning server route
-- "fixing" the wording of a notification that has already been read.
-- Once a row is in a user's feed it is a record of what RYDA told them
-- and when. Editing it in place rewrites history under a timestamp that
-- claims otherwise. A correction is a NEW row — the same doctrine 0041
-- established for a re-quote and 0047 for a counter-offer.
--
-- user_id is in the list twice over: RLS's WITH CHECK stops a user
-- moving their own row into someone else's feed, and this stops
-- everything else from doing it, including service-role code.
--
-- AND read_at IS A CLOCK READING, NOT A CALLER'S OPINION.
-- "read_at is the only updatable column" is only half a rule: the grant
-- and the policy let a user set it, and until this trigger normalized it
-- they could set it to ANY value — 2019, or next year — on a row nobody
-- else can write. Everything downstream treats the column as an audit
-- fact ("when the recipient read it", the route comments, a digest that
-- skips already-seen rows), so a user-chosen timestamp is a record that
-- reads as evidence and is not. The trigger closes it:
--
--   null → not null   the DATABASE stamps now(); whatever value the
--                     caller sent is discarded (including the route's
--                     own new Date().toISOString(), which is one clock
--                     hop further from the truth than now() is).
--   not null → null   allowed, untouched. Marking something unread to
--                     come back to it is the user's own reading state,
--                     and a null carries no claim about when.
--   not null → other  refused by pinning it back to the original stamp.
--                     The first read is the one that happened; a second
--                     "mark read" is a no-op, not a fresh timestamp.
--
-- BEFORE UPDATE, so assigning to NEW is what lands. This is deliberately
-- a normalization rather than a `raise`: marking read must never fail a
-- user's click, and there is nothing for a caller to correct — the right
-- value was never theirs to send.
create or replace function public.notifications_enforce_immutable()
returns trigger as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.link is distinct from old.link
     or new.created_at is distinct from old.created_at then
    raise exception
      'notifications: read_at is the only updatable column (a correction is a NEW row)';
  end if;

  if new.read_at is not null then
    if old.read_at is null then
      new.read_at := now();
    else
      new.read_at := old.read_at;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists notifications_immutable_guard on public.notifications;
create trigger notifications_immutable_guard
  before update on public.notifications
  for each row execute function public.notifications_enforce_immutable();

-- ── 4) RLS + column privileges ──────────────────────────────────────
--
-- Guardrail 3.7 for this table: own-row SELECT, own-row UPDATE of
-- read_at, and no INSERT or DELETE from a browser at all.

alter table public.notifications enable row level security;

-- Null-safe by construction, the same way 0047's renter policy is: for
-- an anonymous caller auth.uid() is null and `user_id = null` is NULL
-- rather than true, so the policy matches no rows.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- Mark read / mark unread. USING gates which rows may be updated;
-- WITH CHECK gates what they may become, and omitting it would let a
-- user hand their own notification to another account. Both halves are
-- written out for that reason (the same note 0044 makes on its FOR ALL
-- policy).
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- NO insert policy and NO delete policy, on purpose — see the header.
-- Inserts belong to service-role routes (src/lib/notifications.ts).
-- Deletes belong to nobody yet: "dismiss" is a product decision, and
-- until it is made, marking read is the affordance. If dismissal ships,
-- prefer a dismissed_at column over a DELETE policy so a feed row
-- cannot be made to vanish from an audit.
--
-- Admins are deliberately absent too. Every other rental table carries
-- an `app_metadata.role = 'admin'` FOR ALL policy; this one does not,
-- because a notification feed is the most personal surface in the
-- product and no admin SCREEN reads it. Admin tooling that genuinely
-- needs to (a support agent checking whether a renter was told) goes
-- through a service-role route behind requireAdmin, where the access is
-- deliberate and loggable, rather than through an ambient policy.
--
-- COLUMN PRIVILEGES. Supabase grants ALL on new public tables to anon
-- and authenticated by default, and Postgres will not let a
-- column-level REVOKE carve an exception out of a table-level grant
-- (it warns and does nothing). So the table grant is withdrawn first
-- and the columns granted back — the same order 0047 documents.
revoke all on public.notifications from anon, authenticated;

grant select (
  id, user_id, type, title, body, link, read_at, created_at
) on public.notifications to authenticated;

-- The whole of "read_at is the only user-updatable column", as a
-- privilege. An UPDATE naming any other column fails with "permission
-- denied for column …" before RLS is even consulted.
grant update (read_at) on public.notifications to authenticated;

-- ── 5) Comments ─────────────────────────────────────────────────────

comment on table public.notifications is
  'In-app notification feed: one row per thing RYDA told one user. Written ONLY by service-role code (src/lib/notifications.ts) — unlike the Mainstable pattern this is donated from, authenticated users have no insert policy, because a feed anyone can write to is a forgery surface. Users may read their own rows and set read_at; every other column is immutable.';

comment on column public.notifications.type is
  'Notification vocabulary, mirrored by NOTIFICATION_TYPES in src/lib/notifications.ts and asserted against this CHECK by that module''s Vitest suite. booking_* events follow the 0047 lifecycle; account_notice is the single non-booking catch-all.';

comment on column public.notifications.link is
  'Same-origin relative path the feed navigates to on click, or null. Constrained to the safeNext() rules (leading /, not //, no backslash, no colon, no control characters) because the value lands in an href on a screen the user already trusts.';

comment on column public.notifications.read_at is
  'When the recipient read it; null = unread. An instant rather than a boolean so "read 3 days ago", a digest that skips already-seen rows, and the partial unread index all fall out for free. THE ONLY COLUMN a user may write — enforced twice, by the grant in section 4 and by notifications_enforce_immutable — and the VALUE is not theirs either: the trigger stamps now() on the unread -> read transition and pins every later write back to that first stamp, so this column is a clock reading rather than a caller-chosen timestamp. Clearing it to null (mark unread) is allowed and claims nothing.';

comment on function public.notifications_enforce_immutable() is
  'Freezes every column except read_at on UPDATE, and normalizes read_at itself: null -> now() on the first read, pinned to the original stamp on any later write, freely cleared to null for mark-unread. The column grant already stops a browser session from touching the other columns; this stops service-role code from rewriting the wording of a notification a user has already been shown, and stops anyone — user or route — from choosing what time they read it. A correction is a new row.';
