"use client";

// HealthBadge — small live status indicator that polls /api/health
// every 60s and renders a pill: "All systems operational" /
// "Degraded · <which>" / "Offline".
//
// Used in the footer as an honest "we know how the lights are" signal,
// pre-launch substitute for status.ryda.pro (which requires a paid
// statuspage account and a custom subdomain). After the real status
// page launches, swap this for a link to status.ryda.pro.
//
// The /api/health endpoint masks probe details on production (round 1
// audit fix), so this widget only knows up/degraded/down — not which
// dependency or why. That's fine for member-facing surface.

import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "degraded" | "down";
type Health = {
  ok: boolean;
  checks: Record<string, { ok: boolean; ms?: number; detail?: string }>;
};

const POLL_MS = 60_000;

export function HealthBadge() {
  const [status, setStatus] = useState<Status>("loading");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setStatus("down");
          setDetails("Status endpoint unreachable.");
          return;
        }
        const j = (await res.json()) as Health;
        if (cancelled) return;
        if (j.ok) {
          setStatus("ok");
          setDetails(null);
        } else {
          // Degraded: figure out which one (without exposing the
          // probe.detail field on prod, which is masked).
          const failing = Object.entries(j.checks)
            .filter(([, c]) => !c.ok)
            .map(([name]) => name);
          setStatus("degraded");
          setDetails(failing.length ? failing.join(", ") : "unknown");
        }
      } catch {
        if (cancelled) return;
        setStatus("down");
        setDetails("Status endpoint unreachable.");
      }
    }

    void poll();
    timeoutId = setInterval(() => void poll(), POLL_MS) as unknown as ReturnType<typeof setTimeout>;

    return () => {
      cancelled = true;
      if (timeoutId) clearInterval(timeoutId);
    };
  }, []);

  if (status === "loading") return null;

  const dotColor =
    status === "ok"
      ? "bg-success"
      : status === "degraded"
        ? "bg-warn"
        : "bg-red";

  const label =
    status === "ok"
      ? "All systems operational"
      : status === "degraded"
        ? `Degraded${details ? ` · ${details}` : ""}`
        : "Status unknown";

  return (
    <span
      className="inline-flex items-center gap-2 text-xs text-mute"
      role="status"
      aria-live="polite"
      title={status === "ok" ? "Last checked just now" : details ?? undefined}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotColor}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
