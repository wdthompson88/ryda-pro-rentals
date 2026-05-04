"use client";

// /account/membership — current tier, renewal, and the list of
// share-LLCs the member belongs to. Tier is stub data until we add a
// membership_tiers table. Holdings list is real — queries
// share_holdings via supabase-js (RLS scopes to the calling user).

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { VEHICLES } from "@/lib/market-data";
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

      {/* Tier — pre-launch state. Tiered subscriptions (Friend /
          Founder / Founder+) ship with the Miami launch when the
          membership_tiers table lands. Until then we render an
          honest pre-launch state — NOT a fake "RYDA Core · Free"
          card that would mislead members who paid for one of the
          tiers post-launch. UI/UX review #3. */}
      <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
              Membership tier
            </p>
            <p className="mt-2 font-display text-3xl text-ink">Pre-launch member</p>
            <p className="mt-1 text-sm text-ink-soft">
              Tiered membership (Friend, Founder, Founder+) opens with the
              Miami launch in Q3 2026. Your tier and renewal will appear here
              once subscriptions go live.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Link
              href="/membership"
              className="inline-flex h-11 items-center justify-center rounded-full border border-ink bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red"
            >
              See tier benefits →
            </Link>
          </div>
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <Perk text="Co-own shares in any RYDA LLC" />
          <Perk text="Book time on every asset you hold" />
          <Perk text="Member-events invitations at launch" />
          <Perk text="Tier perks unlock at Miami launch" />
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

      {/* Renewal / billing card — bridge copy until subscriptions
          ship. Manage payment methods (cards, ACH) is a real flow
          via Stripe Customer Portal. */}
      <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
        <h2 className="font-display text-lg text-ink">Billing</h2>
        <p className="mt-1 text-xs text-mute">
          Manage saved cards, default payment method, and download receipts in
          the Stripe Customer Portal.
        </p>
        <Link
          href="/account/payments"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red"
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

// Stat helper retired with the hardcoded "Annual fee / Next renewal /
// Status" trio. Will return when real subscriptions land.
