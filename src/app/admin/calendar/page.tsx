"use client";

// /admin/calendar — month-grid booking visualizer.
//
// Renders a calendar grid for a selectable month with every booking
// drawn as a span over its date range. Filters by asset (cars + boats
// pulled from the static fleet constants). Click a booking pill to
// drill into the row details.
//
// Data: GET /api/admin/bookings/calendar?from=…&to=…&asset=…
// Auth: server route enforces requireAdmin.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type Booking = {
  id: string;
  user_id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  mode: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
};

type AssetOption = {
  key: string; // "car:296gtb" | "boat:wajer-55s"
  label: string;
};

function buildAssetOptions(): AssetOption[] {
  const cars: AssetOption[] = VEHICLES.map((v) => ({
    key: `car:${v.symbol.toLowerCase()}`,
    label: `${v.symbol} · ${v.name}`,
  }));
  const boats: AssetOption[] = BOATS.map((b) => ({
    key: `boat:${b.slug}`,
    label: `${b.hullId} · ${b.name}`,
  }));
  return [...cars, ...boats].sort((a, b) => a.label.localeCompare(b.label));
}

export default function AdminCalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );
  const [asset, setAsset] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const assetOptions = useMemo(buildAssetOptions, []);

  const { from, to, days } = useMemo(() => computeMonth(month), [month]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ from, to });
        if (asset) params.set("asset", asset);
        const res = await authedFetch(
          `/api/admin/bookings/calendar?${params.toString()}`,
        );
        if (cancelled) return;
        if (res.status === 403) {
          setError(
            "Your account doesn't have admin access. Ask another admin to flip your role.",
          );
          return;
        }
        if (!res.ok) {
          throw new Error(`Lookup failed (${res.status}).`);
        }
        const j = (await res.json()) as { bookings: Booking[] };
        setBookings(j.bookings ?? []);
        setError(null);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, asset]);

  // Group bookings by asset (vehicle_symbol or boat_slug)
  const byAsset = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = b.vehicle_symbol ?? b.boat_slug ?? "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(b);
    }
    return m;
  }, [bookings]);

  function shiftMonth(delta: number) {
    const [y, mo] = month.split("-").map(Number);
    const d = new Date(y, mo - 1 + delta, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Admin · Calendar
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Booking calendar.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Month view of every booking across the fleet. Filter by asset
            to drill into one hull. Click a booking pill to copy its id.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2 text-xs">
            <Link
              href="/admin"
              className="rounded-full border border-rule bg-cream-2 px-3 py-1 font-medium text-ink-soft hover:border-ink hover:text-ink"
            >
              ← Triage
            </Link>
          </nav>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-rule bg-cream-2/60 px-4 py-3 text-sm">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-surface text-ink-soft hover:border-ink hover:text-ink"
              aria-label="Previous month"
            >
              ←
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 rounded-lg border border-rule bg-surface px-3 text-sm text-ink"
            />
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-surface text-ink-soft hover:border-ink hover:text-ink"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <span className="text-mute/40">·</span>
          <label className="inline-flex items-center gap-2 text-xs">
            <span className="text-mute">Asset</span>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="h-8 rounded-lg border border-rule bg-surface px-2 text-sm text-ink"
            >
              <option value="">All</option>
              {assetOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="ml-auto text-xs text-mute">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"} ·{" "}
            {from} → {to}
          </span>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red/40 bg-red/5 p-6 text-sm text-red">
            {error}
          </div>
        ) : loading ? (
          <p className="text-sm text-mute">Loading…</p>
        ) : byAsset.size === 0 ? (
          <p className="rounded-xl border border-rule bg-surface px-5 py-8 text-center text-sm text-mute">
            No bookings in this window.
          </p>
        ) : (
          <div className="space-y-4">
            {Array.from(byAsset.entries()).map(([assetKey, list]) => (
              <AssetRow
                key={assetKey}
                assetKey={assetKey}
                bookings={list}
                days={days}
                from={from}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function AssetRow({
  assetKey,
  bookings,
  days,
  from,
}: {
  assetKey: string;
  bookings: Booking[];
  days: number;
  from: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-surface">
      <div className="flex items-center justify-between border-b border-rule bg-cream-2/40 px-4 py-2">
        <p className="text-sm font-medium text-ink">{assetKey}</p>
        <p className="text-[11px] text-mute">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</p>
      </div>
      <div className="min-w-[800px] px-4 py-4">
        <div
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${days}, minmax(20px, 1fr))`,
            gridAutoRows: "minmax(22px, auto)",
            rowGap: 4,
            columnGap: 0,
          }}
        >
          {Array.from({ length: days }, (_, i) => (
            <div
              key={`day-${i}`}
              className="text-center text-[9px] text-mute"
              style={{ gridColumn: `${i + 1} / span 1`, gridRow: 1 }}
            >
              {i + 1}
            </div>
          ))}
          {bookings.map((b, idx) => {
            const startCol = clamp(daysBetween(from, b.start_date) + 1, 1, days);
            const endCol = clamp(daysBetween(from, b.end_date) + 1, 1, days);
            const span = Math.max(1, endCol - startCol + 1);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(b.id).catch(() => {});
                }}
                title={`${b.mode} · ${b.start_date} → ${b.end_date} · ${b.status} · user ${b.user_id.slice(0, 8)}`}
                className={`rounded px-2 py-0.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80 ${pillTone(b.status)}`}
                style={{
                  gridColumn: `${startCol} / span ${span}`,
                  gridRow: idx + 2,
                }}
              >
                <span className="truncate">
                  {b.mode} · {b.user_id.slice(0, 6)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pillTone(status: string): string {
  if (status === "confirmed" || status === "completed")
    return "bg-success/15 text-success-deep";
  if (status === "canceled" || status === "rejected" || status === "expired")
    return "bg-mute/15 text-mute line-through";
  if (status === "pending") return "bg-amber-500/20 text-amber-800";
  return "bg-marine/15 text-marine-deep";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function computeMonth(month: string): { from: string; to: string; days: number } {
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const last = new Date(y, mo, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    from: fmt(first),
    to: fmt(last),
    days: last.getDate(),
  };
}
