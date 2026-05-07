"use client";

// /admin/comparables — list of all hand-curated vehicle comparables,
// grouped by vehicle. The valuation moat: hand-curated 3-5 comps per
// listing, refreshed quarterly from classic.com / BaT / RM Sotheby's,
// displayed publicly with full attribution.
//
// Click into a vehicle to add/edit comps for that vehicle.

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { VEHICLES } from "@/lib/market-data";

type Row = {
  id: string;
  vehicle_symbol: string;
  sale_date: string;
  year_make_model: string;
  trim_notes: string | null;
  sale_price_cents: number;
  source_name: string;
  source_url: string;
  lot_number: string | null;
};

export default function ComparablesAdminList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/admin/comparables");
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { rows: Row[] };
        if (!cancelled) setRows(json.rows);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group by vehicle. Show every fleet vehicle (so the admin sees
  // which ones DON'T have comps yet, not just the ones that do).
  const grouped = VEHICLES.map((v) => ({
    symbol: v.symbol,
    name: `${v.year} ${v.name}`,
    rows: rows?.filter((r) => r.vehicle_symbol === v.symbol) ?? [],
  }));

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Admin · Comparable sales
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Hand-curated valuation comps
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          3-5 named comparable sales per vehicle, refreshed quarterly
          from classic.com, Bring a Trailer, RM Sotheby&apos;s, Mecum,
          and Gooding &amp; Co. Displayed publicly on each listing
          with full attribution.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red/40 bg-red/5 p-4 text-sm text-ink">
            {error}
          </div>
        )}

        <div className="mt-10 space-y-6">
          {grouped.map((g) => (
            <Link
              key={g.symbol}
              href={`/admin/comparables/${g.symbol}`}
              className="block rounded-2xl border border-rule bg-surface p-5 hover:border-ink"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                    #{g.symbol}
                  </p>
                  <p className="mt-1 font-display text-xl text-ink">{g.name}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider ${
                    g.rows.length >= 3
                      ? "bg-success/20 text-success-deep"
                      : g.rows.length > 0
                        ? "bg-marine/15 text-marine"
                        : "bg-red/15 text-red"
                  }`}
                >
                  {g.rows.length} comp{g.rows.length === 1 ? "" : "s"}
                </span>
              </div>
              {g.rows.length > 0 && (
                <p className="mt-3 text-xs text-ink-soft">
                  Most recent:{" "}
                  {new Date(g.rows[0].sale_date).toLocaleDateString()} ·{" "}
                  {g.rows[0].source_name} · $
                  {(g.rows[0].sale_price_cents / 100).toLocaleString()}
                </p>
              )}
              {g.rows.length === 0 && (
                <p className="mt-3 text-xs italic text-mute">
                  No comparables curated yet — click to add the first one.
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
