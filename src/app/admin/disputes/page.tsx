"use client";

// /admin/disputes — Stripe dispute / chargeback triage queue.
//
// Driven by /api/admin/disputes (admin-gated). Default view shows
// open disputes (no outcome yet) sorted by evidence_due_by ASC so
// the most urgent floats to the top. Tabs let ops switch to "all"
// or "closed" history.
//
// This is a v1 read view. Action buttons (mark evidence submitted,
// add ops note) come in a follow-up — for now ops triages here +
// uploads evidence directly in Stripe dashboard, then logs back
// here for the audit trail.

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

type DisputeRow = {
  id: string;
  stripe_dispute_id: string;
  purchase_id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  reason: string | null;
  status: string;
  evidence_due_by: string | null;
  evidence_submitted_at: string | null;
  outcome: string | null;
  outcome_at: string | null;
  ops_alerted_at: string | null;
  member_contacted_at: string | null;
  created_at: string;
  share_purchases: {
    email: string | null;
    name: string | null;
    shares: number;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    total_cents: number | null;
  } | null;
};

type Filter = "open" | "all" | "closed";

function formatUsd(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

function urgencyBadge(row: DisputeRow): { label: string; tone: string } {
  if (row.outcome) {
    return { label: row.outcome, tone: "bg-cream-2 text-ink-soft" };
  }
  if (!row.evidence_due_by) {
    return { label: row.status, tone: "bg-cream-2 text-ink" };
  }
  const due = new Date(row.evidence_due_by).getTime();
  const now = Date.now();
  const hoursLeft = Math.round((due - now) / 3_600_000);
  if (hoursLeft < 24) return { label: `${hoursLeft}h left`, tone: "bg-red text-cream" };
  if (hoursLeft < 72) return { label: `${hoursLeft}h left`, tone: "bg-red/30 text-red" };
  return {
    label: `${Math.round(hoursLeft / 24)}d left`,
    tone: "bg-marine/20 text-marine",
  };
}

export default function AdminDisputesPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    authedFetch(`/api/admin/disputes?status=${filter}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as { rows?: DisputeRow[] };
        if (!cancelled) {
          setRows(json.rows ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Load failed");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
            >
              ← Admin
            </Link>
            <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
              Disputes &amp; chargebacks
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Stripe dispute cases. Most-urgent first. Submit evidence
              via Stripe dashboard; log notes here for audit trail.
            </p>
          </div>
          <div className="flex gap-2">
            {(["open", "all", "closed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-medium uppercase tracking-wider ${
                  filter === f
                    ? "bg-ink text-cream"
                    : "border border-rule bg-surface text-ink-soft hover:border-ink-soft"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-rule bg-surface">
          {loading && (
            <p className="p-8 text-sm text-ink-soft">Loading…</p>
          )}
          {error && (
            <p className="p-8 text-sm text-red">Error: {error}</p>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="p-8 text-sm text-ink-soft">
              {filter === "open"
                ? "No open disputes. (This is the desired state.)"
                : "No disputes match this filter."}
            </p>
          )}
          {!loading && !error && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-cream-2 text-left text-xs uppercase tracking-wider text-mute">
                <tr>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stripe ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const badge = urgencyBadge(row);
                  return (
                    <tr key={row.id} className="border-t border-rule">
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">
                          {row.share_purchases?.name ?? "—"}
                        </p>
                        <p className="text-xs text-mute">
                          {row.share_purchases?.email ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>
                          {row.share_purchases?.vehicle_symbol ??
                            row.share_purchases?.boat_slug ??
                            "—"}
                        </p>
                        <p className="text-xs text-mute">
                          {row.share_purchases?.shares ?? "—"} share
                          {(row.share_purchases?.shares ?? 0) > 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatUsd(row.amount_cents, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {row.reason ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{row.status}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <a
                          href={`https://dashboard.stripe.com/disputes/${row.stripe_dispute_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-marine hover:underline"
                        >
                          {row.stripe_dispute_id.slice(0, 16)}…
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
