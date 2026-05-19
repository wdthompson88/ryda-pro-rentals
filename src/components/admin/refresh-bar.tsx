"use client";

// Small toolbar that surfaces "when was this data last refreshed" +
// a manual refresh button + an auto-refresh toggle. The page passes
// in its reload() function; the bar handles cadence and busy state.
//
// Default cadence: 30s when auto-refresh is on. Matches the rhythm
// admins actually use — slow enough to avoid hammering the API, fast
// enough that pending purchases / open transfers stay close to live.

import { useEffect, useRef, useState } from "react";

const AUTO_REFRESH_MS = 30_000;

export function RefreshBar({
  onRefresh,
  loading,
  lastRefreshedAt,
}: {
  onRefresh: () => Promise<void> | void;
  loading: boolean;
  lastRefreshedAt: Date | null;
}) {
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0); // forces "x seconds ago" rerender
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!auto) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      void onRefresh();
    }, AUTO_REFRESH_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [auto, onRefresh]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  const ago = formatAgo(lastRefreshedAt, tick);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rule bg-cream-2/60 px-4 py-3 text-xs">
      <span className="text-mute">
        Updated <span className="font-medium text-ink-soft">{ago}</span>
      </span>
      <span className="text-mute/40">·</span>
      <button
        type="button"
        onClick={() => void onRefresh()}
        disabled={loading}
        className="inline-flex h-7 items-center rounded-full border border-rule bg-surface px-3 font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>
      <label className="inline-flex cursor-pointer items-center gap-2 text-mute">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-rule accent-marine"
        />
        Auto-refresh ({AUTO_REFRESH_MS / 1000}s)
      </label>
    </div>
  );
}

function formatAgo(d: Date | null, _tick: number): string {
  if (!d) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
