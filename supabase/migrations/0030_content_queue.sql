-- Autonomous social-publish queue.
--
-- Purpose: a content row lives here from "draft" → "approved" →
-- "scheduled" → "published" (or "failed" with retry_count). The
-- /api/cron/social-publisher route reads scheduled rows whose time
-- has come and dispatches to channel-specific connectors. Founder
-- approves drafts via /admin/content-queue (forthcoming) before
-- they flip to scheduled.
--
-- Why a queue table not a flat-files-only system:
--   - Multiple instances of the cron can claim work atomically
--     (CAS via status transition draft→processing).
--   - Failed posts stay visible with error_message for triage.
--   - Audit trail: every post has a row showing scheduled_at,
--     published_at, published_url.
--   - Founder approval gate: status='draft' rows never publish
--     even if scheduled_at is in the past.
--
-- Source content lives in /ryda-marketing/content/<channel>/<slug>.md
-- as markdown with YAML frontmatter. A separate ingest script
-- (ryda-marketing/scripts/sync-to-queue.ts) reads the markdown +
-- frontmatter and inserts into this table. That gives founder
-- + ops the option to edit content as files in git, OR directly
-- in the admin UI — both write to the same row.

create table if not exists public.content_queue (
  id                uuid primary key default gen_random_uuid(),

  -- Which channel this post targets. The cron dispatches to the
  -- corresponding connector in lib/social/connectors/.
  channel           text not null check (channel in (
    'linkedin', 'x', 'instagram', 'email', 'journal'
  )),

  -- Content fields. body is the channel-specific text (X tweet,
  -- LinkedIn post body, Instagram caption, email plain-text).
  -- title is for journal/email; null for X/IG.
  title             text,
  body              text not null,

  -- Optional asset reference. If set, the connector attaches the
  -- image when posting. Path is repo-relative
  -- (ryda-marketing/images/generated/<file>) — the cron resolves
  -- it via the deployed bucket / CDN.
  image_path        text,

  -- Hashtags as text[] for typed downstream usage.
  hashtags          text[] default array[]::text[],

  -- Targeting / threading metadata. JSON because each channel
  -- has different needs (X: in_reply_to, thread_count;
  -- LinkedIn: visibility; email: audience_id, segment;
  -- Instagram: cover_image, alt_text).
  metadata          jsonb default '{}'::jsonb,

  -- Lifecycle. State machine:
  --   draft → approved → scheduled → processing → published
  --                                          ↘ failed (retry_count++)
  -- 'processing' is a brief in-flight state during the cron's
  -- claim-then-publish window; CAS prevents two cron instances
  -- from publishing the same row.
  status            text not null default 'draft' check (status in (
    'draft', 'approved', 'scheduled', 'processing', 'published', 'failed'
  )),

  -- When the cron should attempt to publish. Required for
  -- 'scheduled' status; optional otherwise.
  scheduled_at      timestamptz,

  -- Published-state metadata.
  published_at      timestamptz,
  published_url     text,

  -- Failure tracking. The cron retries up to 3 times with
  -- exponential backoff (15min → 1hr → 6hr); after that, status
  -- flips to 'failed' and notifyTeam pages ops.
  retry_count       integer not null default 0,
  last_error        text,
  last_attempt_at   timestamptz,

  -- Authorship + provenance.
  created_by        uuid references auth.users(id) on delete set null,
  approved_by       uuid references auth.users(id) on delete set null,
  approved_at       timestamptz,
  source_file       text,  -- ryda-marketing/content/<channel>/<slug>.md if synced from disk

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- The cron's hot path: find ready-to-publish rows.
create index if not exists content_queue_scheduled_idx
  on public.content_queue (scheduled_at)
  where status = 'scheduled';

-- Admin queue view: see what's failing or stuck.
create index if not exists content_queue_status_idx
  on public.content_queue (status, updated_at desc);

-- Channel-scoped admin view: "show me all LinkedIn posts this week."
create index if not exists content_queue_channel_idx
  on public.content_queue (channel, scheduled_at desc);

-- RLS: only admins can read/write. Members never see this surface.
alter table public.content_queue enable row level security;

-- No member-facing policies; service role bypasses RLS for the
-- cron + admin routes.

-- Trigger to keep updated_at fresh.
create or replace function public.content_queue_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_queue_updated_at on public.content_queue;
create trigger content_queue_updated_at
  before update on public.content_queue
  for each row execute function public.content_queue_set_updated_at();
