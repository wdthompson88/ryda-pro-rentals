"use client";

// /account/membership — current tier, renewal, and the list of
// share-LLCs the member belongs to. Tier is stub data until we add a
// membership_tiers table. Holdings list is real — queries
// share_holdings via supabase-js (RLS scopes to the calling user).

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { VEHICLES, formatUSD } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type Holding = {
  id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  shares: number;
  acquired_at: string;
  transferred_at: string | null;
};

export default function MembershipPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("share_holdings")
        .select("id, vehicle_symbol, boat_slug, shares, acquired_at, transferred_at")
        .is("transferred_at", null)
        .order("acquired_at", { ascending: false });
      if (cancelled) return;
      setHoldings((data as Holding[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group holdings by asset so multiple shares of the same LLC show
  // as one "RYDA F296 LLC · 2 shares" line, not two separate rows.
  const grouped = new Map<
    string,
    { label: string; href: string; shares: number; assetType: "car" | "boat" }
  >();
  for (const h of holdings) {
    if (h.vehicle_symbol) {
      const v = VEHICLES.find((x) => x.symbol === h.vehicle_symbol);
      const key = `v:${h.vehicle_symbol}`;
      const cur = grouped.get(key);
      grouped.set(key, {
        label: v ? `RYDA ${v.symbol} LLC · ${v.year} ${v.name}` : `RYDA ${h.vehicle_symbol} LLC`,
        href: `/my-cars/${h.vehicle_symbol.toLowerCase()}`,
        shares: (cur?.shares ?? 0) + h.shares,
        assetType: "car",
      });
    } else if (h.boat_slug) {
      const b = BOATS.find((x) => x.slug === h.boat_slug);
      const key = `b:${h.boat_slug}`;
      const cur = grouped.get(key);
      grouped.set(key, {
        label: b ? `RYDA ${h.boat_slug.toUpperCase()} LLC · ${b.year} ${b.name}` : `RYDA ${h.boat_slug.toUpperCase()} LLC`,
        href: `/my-boats/${h.boat_slug}`,
        shares: (cur?.shares ?? 0) + h.shares,
        assetType: "boat",
      });
    }
  }
  const llcs = Array.from(grouped.values());

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Membership
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Your membership.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Tier, renewal, and every LLC you co-own a share of. Members can hold
          shares across multiple vehicles and boats simultaneously.
        </p>
      </header>

      {/* Tier ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
              Current tier
            </p>
            <p className="mt-2 font-display text-3xl text-ink">RYDA Blue</p>
            <p className="mt-1 text-sm text-ink-soft">
              $500/yr · Renews April 27, 2027
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Link
              href="/membership"
              className="inline-flex h-11 items-center justify-center rounded-full border border-ink bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red"
            >
              Upgrade to Black
            </Link>
            <Link
              href="/membership"
              className="text-xs text-ink-soft hover:text-ink"
            >
              Compare tiers →
            </Link>
          </div>
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <Perk text="1 white-glove delivery / year" />
          <Perk text="Booking lookahead: 90 days" />
          <Perk text="Member events: monthly meetups" />
          <Perk text="Priority on peak weekends" />
        </ul>
      </section>

      {/* LLCs / holdings ─────────────────────────── */}
      <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
        <h2 className="font-display text-lg text-ink">LLCs you co-own</h2>
        <p className="mt-1 text-xs text-mute">
          Each share is recorded in the LLC's member register. Shares are
          transferable to other verified members after a 12-month minimum hold.
        </p>
        <div className="mt-5">
          {loading ? (
            <p className="text-sm text-mute">Loading holdings…</p>
          ) : llcs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center">
              <p className="text-sm text-ink-soft">
                You don't co-own any RYDA shares yet.
              </p>
              <Link
                href="/markets"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                Browse the fleet →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-rule">
              {llcs.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{l.label}</p>
                    <p className="text-xs text-mute">
                      {l.shares} share{l.shares > 1 ? "s" : ""} · {l.assetType === "boat" ? "Boat" : "Car"}
                    </p>
                  </div>
                  <Link
                    href={l.href}
                    className="text-xs font-medium text-red hover:text-red-deep"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Renewal / billing card ──────────────────────── */}
      <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
        <h2 className="font-display text-lg text-ink">Renewal & billing</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Annual fee" value={formatUSD(500)} sub="RYDA Blue" />
          <Stat label="Next renewal" value="Apr 27, 2027" sub="Auto-renews" />
          <Stat label="Status" value="Active" sub="Paid through 2027" />
        </div>
        <Link
          href="/account/payments"
          className="mt-6 inline-flex text-xs font-medium text-red hover:text-red-deep"
        >
          Manage payment methods →
        </Link>
      </section>
    </div>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span aria-hidden className="text-red">·</span>
      <span>{text}</span>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-rule bg-cream-2/40 p-4">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-xl text-ink">{value}</p>
      {sub && <p className="text-xs text-mute">{sub}</p>}
    </div>
  );
}
