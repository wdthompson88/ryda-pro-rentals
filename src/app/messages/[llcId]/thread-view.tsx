"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";

// Per-LLC thread UI. Owns three concerns:
//   1. Initial fetch of the most-recent N messages
//   2. Polling every 30s for new ones (passes ?since=<lastTs>)
//   3. Send box that posts a new message and optimistically appends
//
// Polling cadence (30s) trades freshness for cost. At launch we
// don't have realtime turned on; if the message volume warrants it
// later, swap this loop for a Supabase Realtime channel subscription
// on llc_messages with a filter on llc_entity_id.

const POLL_INTERVAL_MS = 30_000;
const BODY_MAX = 4000;

type Message = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "no-auth" }
  | { kind: "no-supabase" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string }
  | { kind: "ready"; messages: Message[] };

export function ThreadView({ llcId }: { llcId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Auto-scroll to the latest message on first load + on send.
  // We don't auto-scroll during polled refreshes (would yank the
  // viewport while a member is reading). We scroll only if the
  // bottom is already in view OR after a successful send.
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollOnNextRender = useRef<boolean>(true);

  // The timestamp of the newest message we've seen — passed as
  // ?since= on the next poll so we only fetch the delta.
  const lastSeenAt = useRef<string | null>(null);

  // Internal helper — returns the polling URL with the right
  // since cursor, or the bare URL on first load.
  const buildUrl = useCallback(
    (since: string | null): string => {
      const base = `/api/account/llcs/${encodeURIComponent(llcId)}/messages`;
      return since ? `${base}?since=${encodeURIComponent(since)}` : base;
    },
    [llcId],
  );

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) setState({ kind: "no-supabase" });
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (!cancelled) setState({ kind: "no-auth" });
        return;
      }
      try {
        const r = await authedFetch(buildUrl(null));
        if (r.status === 401) {
          if (!cancelled) setState({ kind: "no-auth" });
          return;
        }
        if (r.status === 403) {
          if (!cancelled) setState({ kind: "forbidden" });
          return;
        }
        if (!r.ok) {
          if (!cancelled)
            setState({
              kind: "error",
              message: `Failed to load thread (${r.status}).`,
            });
          return;
        }
        const json = (await r.json()) as { messages: Message[] };
        if (cancelled) return;
        const msgs = json.messages ?? [];
        lastSeenAt.current = msgs.at(-1)?.created_at ?? null;
        setState({ kind: "ready", messages: msgs });
      } catch (err) {
        if (!cancelled)
          setState({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Could not reach the server.",
          });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [buildUrl]);

  // Polling loop. Only runs once we're in "ready" state — there's
  // nothing to poll into for the other states.
  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const r = await authedFetch(buildUrl(lastSeenAt.current));
        // 401/403 mid-session means the membership state changed
        // (share transferred away, session expired). Surface it as
        // a state change so the UI can react instead of silently
        // failing forever.
        if (r.status === 401) {
          if (!cancelled) setState({ kind: "no-auth" });
          return;
        }
        if (r.status === 403) {
          if (!cancelled) setState({ kind: "forbidden" });
          return;
        }
        if (!r.ok) return; // soft-fail other errors so the loop survives transient blips
        const json = (await r.json()) as { messages: Message[] };
        if (cancelled || !json.messages || json.messages.length === 0) return;
        lastSeenAt.current = json.messages.at(-1)?.created_at ?? lastSeenAt.current;
        setState((prev) =>
          prev.kind === "ready"
            ? {
                kind: "ready",
                messages: dedupAppend(prev.messages, json.messages),
              }
            : prev,
        );
      } catch {
        // Network blip; let the interval try again.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.kind, buildUrl]);

  // Auto-scroll on first ready render + after sends.
  useEffect(() => {
    if (state.kind === "ready" && scrollOnNextRender.current) {
      scrollOnNextRender.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [state]);

  const onSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = draft.trim();
      if (body.length === 0 || body.length > BODY_MAX) return;
      setSending(true);
      setSendError(null);
      try {
        const r = await authedFetch(buildUrl(null), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        if (!r.ok) {
          const errBody = await r.json().catch(() => ({ error: "Failed." }));
          setSendError(
            (errBody as { error?: string }).error ?? `Send failed (${r.status}).`,
          );
          return;
        }
        const json = (await r.json()) as { message: Message };
        // Optimistically append; the next poll will dedup if it
        // arrives before this state update settles. Codex round-1
        // catch: do NOT advance lastSeenAt.current to the sender's
        // own message timestamp. Another co-owner's message could
        // have landed between our last poll and our send with an
        // earlier created_at; advancing past it would cause the
        // next ?since=<senderTs> poll to permanently skip it.
        // The poll cursor only advances when a poll actually
        // returns rows.
        setState((prev) =>
          prev.kind === "ready"
            ? {
                kind: "ready",
                messages: dedupAppend(prev.messages, [json.message]),
              }
            : prev,
        );
        setDraft("");
        scrollOnNextRender.current = true;
        // Trigger the scroll-to-bottom on next render explicitly.
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        setSendError(
          err instanceof Error ? err.message : "Could not reach the server.",
        );
      } finally {
        setSending(false);
      }
    },
    [draft, buildUrl],
  );

  return (
    <div className="mt-6">
      <h1 className="font-display text-3xl font-light text-ink sm:text-4xl">
        Co-owner thread
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Append-only. Visible to current shareholders of this LLC only.
      </p>

      {state.kind === "loading" && (
        <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
          Loading thread…
        </div>
      )}

      {state.kind === "no-supabase" && (
        <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
          Messaging requires the live backend.
        </div>
      )}

      {state.kind === "no-auth" && (
        <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
          Sign-in required. Your session may have expired —{" "}
          <a
            className="underline hover:text-ink"
            href={`/signin?next=/messages/${encodeURIComponent(llcId)}`}
          >
            sign in again
          </a>
          .
        </div>
      )}

      {state.kind === "forbidden" && (
        <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
          You aren&apos;t a current member of this LLC&apos;s thread.
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-6 rounded-2xl border border-red/40 bg-red/5 p-6 text-sm text-red">
          {state.message}
        </div>
      )}

      {state.kind === "ready" && (
        <>
          <ul className="mt-6 space-y-4">
            {state.messages.length === 0 && (
              <li className="rounded-2xl border border-dashed border-rule bg-cream-2/40 p-6 text-center text-sm text-mute">
                No messages yet. Be the first to post.
              </li>
            )}
            {state.messages.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-rule bg-surface p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink">
                    {m.author_name}
                  </p>
                  <time
                    dateTime={m.created_at}
                    className="text-[11px] text-mute"
                  >
                    {formatTimestamp(m.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                  {m.body}
                </p>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>

          <form
            onSubmit={onSend}
            className="mt-8 rounded-2xl border border-rule bg-surface p-4"
          >
            <label
              htmlFor="thread-draft"
              className="block text-xs font-medium uppercase tracking-wider text-mute"
            >
              Post a message
            </label>
            <textarea
              id="thread-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={BODY_MAX}
              rows={3}
              placeholder="Coordinate handoffs, surface ops issues, disclose anything a co-owner should know."
              className="mt-2 w-full resize-y rounded-xl border border-rule bg-cream-2/40 p-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-mute">
                {draft.length} / {BODY_MAX}
              </p>
              <button
                type="submit"
                disabled={
                  sending || draft.trim().length === 0 || draft.length > BODY_MAX
                }
                className="inline-flex h-10 items-center justify-center rounded-full bg-red px-5 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending…" : "Post →"}
              </button>
            </div>
            {sendError ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red/40 bg-red/5 px-3 py-2 text-xs text-red"
              >
                {sendError}
              </p>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}

// Append messages to the existing list, deduped by id, sorted by
// created_at ASC. Codex round-2 catch: previously just concatenated,
// which broke ordering when an optimistic POST echo was followed by
// a polled batch containing a message with an earlier timestamp
// (concurrent send by another member). Sort after dedupe to keep
// the rendered order chronological regardless of arrival order.
function dedupAppend(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((m) => m.id));
  const additions = incoming.filter((m) => !seen.has(m.id));
  if (additions.length === 0) return existing;
  const merged = [...existing, ...additions];
  merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return merged;
}

// Cheap relative-ish timestamp formatter. Anything older than 24h
// shows a date; newer renders as "5m ago" / "just now". Avoids
// pulling in date-fns for one helper.
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const ageMs = Date.now() - d.getTime();
  const sec = Math.floor(ageMs / 1000);
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
