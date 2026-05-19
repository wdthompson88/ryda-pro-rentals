"use client";

// Compact recent-admin-actions panel for the triage dashboard.
// Fetches /api/admin/audit?limit=10 and renders an inline timeline.
// Each row is clickable through to /admin/audit for the full filterable
// view. The panel re-fetches on the same refresh tick as the dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api-fetch";

type AuditRow = {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export function AuditSummary({ refreshNonce }: { refreshNonce: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/admin/audit?limit=10");
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(`Lookup failed (${res.status}).`);
        }
        const j = (await res.json()) as { rows: AuditRow[] };
        setRows(j.rows ?? []);
        setError(null);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load audit.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink">Recent admin actions</h2>
        <Link
          href="/admin/audit"
          className="text-xs font-medium text-marine hover:text-marine-deep"
        >
          Full audit log →
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-rule bg-surface">
        {loading ? (
          <p className="px-5 py-6 text-sm text-mute">Loading…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-mute">
            No admin actions recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-rule">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline gap-2 px-5 py-3 text-sm"
              >
                <span className="text-xs text-mute" suppressHydrationWarning>
                  {fmt(r.created_at)}
                </span>
                <span className="font-medium text-ink">{r.action}</span>
                <span className="text-mute">on</span>
                <span className="font-mono text-xs text-ink-soft">
                  {r.target_type}
                  {r.target_id ? `/${r.target_id.slice(0, 8)}` : ""}
                </span>
                {r.admin_user_id && (
                  <span className="ml-auto text-[11px] text-mute">
                    by {r.admin_user_id.slice(0, 8)}
                  </span>
                )}
                {r.details && Object.keys(r.details).length > 0 && (
                  <details className="basis-full pl-1 pt-1">
                    <summary className="cursor-pointer text-[11px] text-mute hover:text-ink-soft">
                      details
                    </summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-cream-2 p-2 text-[11px] text-ink-soft">
                      {JSON.stringify(r.details, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function fmt(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
