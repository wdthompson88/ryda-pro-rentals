-- Dropbox Sign webhook event-id deduplication.
--
-- Closes the last open security finding from the documents-webhook
-- attack chain (audits/02-security.md SAST round-2): the route now
-- HMAC-verifies (Sub-Batch A2) and rejects malformed payloads
-- (A2 follow-up), but a captured valid delivery can still be replayed
-- by an attacker because nothing prevents the same event from being
-- processed twice. With this table in place, the second attempt is a
-- no-op even if the HMAC still verifies.
--
-- Pattern mirrors stripe_events (migration 0015 + 0020 PK refinement)
-- so the two webhook handlers have a consistent dedup story.
--
-- Dedup key choice: composite (event_hash, signature_request_id).
--
-- Why composite: Dropbox Sign's event_hash is HMAC-SHA256 over
-- (event_time + event_type), NOT the full payload. So two legitimate
-- same-second events of the same type — for two *different*
-- signature requests — would share an event_hash and a single-column
-- PK on event_hash would falsely dedup the second one, dropping a
-- legitimate side effect on the floor. Codex round-1 catch.
--
-- The composite (event_hash, signature_request_id) catches replays
-- of the exact same delivery (same hash + same request) while
-- letting unrelated requests with a colliding hash through.
--
-- callback_test events (no signature_request_id) never reach this
-- table — the route short-circuits with the canonical "Hello API
-- Event Received" string before the dedup insert.
--
-- Known limitation (round-1 codex caveat (c)): the row is recorded
-- BEFORE the side effect runs. If the side-effect (UPDATE
-- document_signatures) crashes after the dedup insert succeeds, a
-- retry will see the dedup row and skip re-processing. Mitigation:
-- the side effect is an idempotent UPDATE to a fixed status, so the
-- failure mode is "row stays in previous status" — visible to the
-- ops team via the existing notify-team email when a signature
-- request flips to all_signed but document_signatures didn't move.
-- A proper claim-then-mark-processed pattern (with `processed_at`
-- column + in-flight detection) is the future-iteration fix.
--
-- RLS: disabled (matches stripe_events). Only the service-role
-- webhook handler writes here; admins can read via direct query.
--
-- Run-once safe: every DDL is `if not exists`.

create table if not exists public.dropbox_sign_events (
  -- Dropbox Sign's deterministic per-event HMAC tag. NOT NULL
  -- because the route only inserts after HMAC verification.
  event_hash             text not null,

  -- Which signature request the event was about. NOT NULL because
  -- the route short-circuits callback_test events (no reqId)
  -- before this table is touched.
  signature_request_id   text not null,

  -- Event type ('signature_request_all_signed' etc) — kept for
  -- triage clarity.
  event_type             text not null,

  -- Wall-clock from Dropbox Sign (string per their payload spec).
  -- Stored as-is (text) to avoid format-mismatch surprises if they
  -- ever ship microseconds.
  event_time             text not null,

  -- When *we* received it. Used for retention sweeps and ops
  -- forensics.
  received_at            timestamptz not null default now(),

  -- Composite dedup key: replays of the exact same (hash, request)
  -- pair conflict; legitimate same-second collisions across
  -- different requests pass through.
  primary key (event_hash, signature_request_id)
);

create index if not exists dropbox_sign_events_received_idx
  on public.dropbox_sign_events (received_at desc);

create index if not exists dropbox_sign_events_request_idx
  on public.dropbox_sign_events (signature_request_id);

alter table public.dropbox_sign_events disable row level security;
