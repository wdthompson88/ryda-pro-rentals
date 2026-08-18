"use client";

// Client-side state for the in-app notification feed (migration 0049).
//
// Two hooks and one event, because two components need the same number
// and they are not on the same branch of the tree:
//
//   useNotificationFeed()          the feed itself (/account/notifications)
//   useUnreadNotificationCount()   the nav badge (account-nav.tsx)
//
// The badge lives in the sidebar and the feed lives in the content
// column, so a shared parent would be the /account layout — and putting
// notification state there would make every account page pay for a
// context it does not use. Instead each hook owns its own fetch, and a
// window CustomEvent tells the other one that something changed. That
// is a deliberately small coupling: no provider, no context, no store,
// and a component that forgets to listen is stale rather than broken.
//
// THE EVENT SAYS WHO SENT IT, and a hook ignores its own. Without that,
// the feed's own "mark read" came straight back through the listener it
// had registered, refetched page 1, and threw away every page the reader
// had pulled in with "Show older" — the list jumping back to the top
// under someone who was three pages down reading.
//
// Both hooks take `enabled` for the same reason useRentalProfile does:
// the /account layout gates auth, but useAuthStatus starts at 'loading'
// and firing before a session exists buys a guaranteed 401.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import type { NotificationView } from "@/lib/notifications";

export type { NotificationView };

/** Broadcast so the other hook re-reads. Same-tab only, by design. */
const CHANGED_EVENT = "ryda:notifications-changed";

/**
 * Who fired it. THE EVENT CARRIES ITS SOURCE so a hook can ignore its
 * own echo — without that, marking one row read reloads page 1 of the
 * feed that just marked it, and every page pulled in with "Show older"
 * is discarded under the reader. The badge, being a different source,
 * still hears it and re-counts.
 */
type ChangeDetail = { source?: string };

function announceChange(source: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ChangeDetail>(CHANGED_EVENT, { detail: { source } }),
  );
}

function useChangeSubscription(onChange: () => void, selfId: string) {
  // The listener is registered once and reads the latest callback
  // through a ref, so a caller passing an inline closure does not
  // re-subscribe on every render.
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  }, [onChange]);

  // selfId comes from useId and is stable for the life of the
  // component, so naming it here re-subscribes never — it is in the deps
  // because it is read, not because it changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const listener = (event: Event) => {
      const source = (event as CustomEvent<ChangeDetail>).detail?.source;
      // My own echo. Whatever changed, this hook already applied it
      // optimistically and reconciled the count from the response.
      if (source && source === selfId) return;
      handler.current();
    };
    window.addEventListener(CHANGED_EVENT, listener);
    return () => window.removeEventListener(CHANGED_EVENT, listener);
  }, [selfId]);
}

export type NotificationFeedStatus = "loading" | "ready" | "error";

export type NotificationFeed = {
  status: NotificationFeedStatus;
  /** False in the pre-0049 window: the table is not there yet. */
  configured: boolean;
  notifications: NotificationView[];
  unreadCount: number;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  refresh: () => void;
  loadMore: () => void;
  /** Optimistic; reconciled from the server's unreadCount. */
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  busy: boolean;
};

type FeedResponse = {
  configured?: boolean;
  notifications?: NotificationView[];
  unreadCount?: number;
  nextCursor?: string | null;
  error?: string;
};

export function useNotificationFeed(enabled: boolean): NotificationFeed {
  // Identifies this hook's own broadcasts so it can skip them — see
  // ChangeDetail above.
  const selfId = useId();
  const [status, setStatus] = useState<NotificationFeedStatus>("loading");
  const [configured, setConfigured] = useState(true);
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);

  // Bumped to force a reload. Cheaper than threading an AbortController
  // through every caller, and the effect below already drops the result
  // of a superseded run.
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      setStatus((s) => (s === "ready" ? s : "loading"));
      try {
        const res = await authedFetch("/api/notifications?limit=20");
        const json = (await res.json().catch(() => ({}))) as FeedResponse;
        if (cancelled) return;

        if (!res.ok) {
          setError(json.error ?? "Could not load notifications.");
          setStatus("error");
          return;
        }

        setConfigured(json.configured !== false);
        setNotifications(json.notifications ?? []);
        setUnreadCount(json.unreadCount ?? 0);
        setCursor(json.nextCursor ?? null);
        setError(null);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setError("Could not reach the server.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  // ANOTHER component marked something read. Not this one: a self-echo
  // would reset `cursor` and throw away every page loaded with "Show
  // older", which is the one thing a feed must not do while it is being
  // read.
  useChangeSubscription(refresh, selfId);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    (async () => {
      try {
        const res = await authedFetch(
          `/api/notifications?limit=20&before=${encodeURIComponent(cursor)}`,
        );
        const json = (await res.json().catch(() => ({}))) as FeedResponse;
        if (!res.ok) {
          setError(json.error ?? "Could not load more.");
          return;
        }
        // Dedupe on id: the cursor is a timestamp, and a row written
        // between the two requests can legitimately appear twice.
        setNotifications((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [
            ...prev,
            ...(json.notifications ?? []).filter((n) => !seen.has(n.id)),
          ];
        });
        setUnreadCount(json.unreadCount ?? 0);
        setCursor(json.nextCursor ?? null);
      } catch {
        setError("Could not reach the server.");
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [cursor, loadingMore]);

  /**
   * Optimistic, then reconciled. The row goes read immediately because
   * the click that marks it usually also navigates away, and waiting on
   * a round trip to restyle a row nobody is looking at is theatre. The
   * server's unreadCount is authoritative when it lands.
   *
   * A failed mark is deliberately quiet: the worst outcome is a badge
   * that is one too low until the next refresh, and an error banner over
   * "we couldn't mark that as read" is noise on a surface whose whole
   * job is to be calm.
   */
  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await authedFetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as {
          unreadCount?: number;
        };
        if (res.ok && typeof json.unreadCount === "number") {
          setUnreadCount(json.unreadCount);
        }
        announceChange(selfId);
      } catch {
        // Silent; see above.
      } finally {
        setBusy(false);
      }
    },
    [selfId],
  );

  const markRead = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const now = new Date().toISOString();
      const wanted = new Set(ids);
      // Count from the rendered list, NOT from inside the updater. React
      // may invoke a state updater more than once for the same commit
      // (StrictMode, concurrent rendering), so a counter incremented in
      // there is multiplied and the badge decrements past what was
      // actually read. The updater below stays pure.
      const flipped = notifications.reduce(
        (count, n) => (wanted.has(n.id) && !n.readAt ? count + 1 : count),
        0,
      );
      setNotifications((prev) =>
        prev.map((n) =>
          wanted.has(n.id) && !n.readAt ? { ...n, readAt: now } : n,
        ),
      );
      if (flipped > 0) setUnreadCount((c) => Math.max(0, c - flipped));
      void post({ ids });
    },
    [notifications, post],
  );

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    );
    setUnreadCount(0);
    void post({ all: true });
  }, [post]);

  return {
    status,
    configured,
    notifications,
    unreadCount,
    error,
    hasMore: cursor !== null,
    loadingMore,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    busy,
  };
}

/**
 * Just the number, for the nav badge.
 *
 * Asks for one row rather than none because there is no count-only
 * endpoint: `limit=1` is the smallest payload that still carries
 * unreadCount, and the response is a single row plus an integer. A
 * dedicated /count route would save a few hundred bytes and cost a
 * second surface that can disagree with the feed about the same number.
 */
export function useUnreadNotificationCount(enabled: boolean): {
  unreadCount: number;
  configured: boolean;
} {
  const selfId = useId();
  const [unreadCount, setUnreadCount] = useState(0);
  const [configured, setConfigured] = useState(true);
  const [token, setToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/notifications?limit=1");
        if (!res.ok) return;
        const json = (await res.json().catch(() => ({}))) as FeedResponse;
        if (cancelled) return;
        setConfigured(json.configured !== false);
        setUnreadCount(json.unreadCount ?? 0);
      } catch {
        // Badge stays at 0. A nav that cannot count is not an error
        // state worth showing anyone.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, token]);

  // This hook never broadcasts (it only reads), so the self-id is here
  // for symmetry and for the day it does.
  useChangeSubscription(
    useCallback(() => setToken((n) => n + 1), []),
    selfId,
  );

  return { unreadCount, configured };
}
