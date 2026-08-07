"use client";

// /bookings — member's booking dashboard. Real query against the
// `bookings` table for upcoming + past, joined with share_holdings
// to compute the per-asset entitlement bars.
//
// Pre-launch this page rendered hardcoded "Ferrari + McLaren" rows
// regardless of who was logged in. Now it reflects what the member
// actually owns + has booked.

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { supabase } from "@/lib/supabase";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type Booking = {
  id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  mode: string;
  start_date: string;
  end_date: string;
  days: number;
  type: string;
  handover: string;
  notes: string | null;
  status: string;
};

type Holding = {
  vehicle_symbol: string | null;
  boat_slug: string | null;
};

type AssetEntitlement = {
  key: string;
  name: string;
  daysAllowance: number;
  milesAllowance: number;
  daysUsed: number;
  milesUsed: number;
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "in-progress"]);

function assetLabel(b: Pick<Booking, "vehicle_symbol" | "boat_slug">): string {
  if (b.vehicle_symbol) {
    const v = VEHICLES.find((x) => x.symbol === b.vehicle_symbol);
    return v ? `${v.year} ${v.name}` : `RYDA ${b.vehicle_symbol}`;
  }
  if (b.boat_slug) {
    const x = BOATS.find((y) => y.slug === b.boat_slug);
    return x ? `${x.year} ${x.name}` : `RYDA ${b.boat_slug.toUpperCase()}`;
  }
  return "RYDA share";
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [entitlements, setEntitlements] = useState<AssetEntitlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled || !userData.user) {
        setLoading(false);
        return;
      }
      const userId = userData.user.id;

      const [holdingsRes, bookingsRes] = await Promise.all([
        supabase
          .from("share_holdings")
          .select("vehicle_symbol, boat_slug")
          .eq("user_id", userId)
          .is("transferred_at", null),
        supabase
          .from("bookings")
          .select(
            "id, vehicle_symbol, boat_slug, mode, start_date, end_date, days, type, handover, notes, status",
          )
          .eq("user_id", userId)
          .order("start_date", { ascending: true }),
      ]);
      if (cancelled) return;

      const holdings = (holdingsRes.data ?? []) as Holding[];
      const allBookings = (bookingsRes.data ?? []) as Booking[];
      setBookings(allBookings);

      // Per-asset entitlement: 1 share = vehicle.daysPerYear days
      // and milesPerYear miles. Sum allowance per asset over share
      // count; sum used over current-year active bookings.
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      const yearEnd = new Date(new Date().getFullYear() + 1, 0, 1).getTime();

      const sharesPerKey = new Map<string, number>();
      for (const h of holdings) {
        const key = h.vehicle_symbol
          ? "v:" + h.vehicle_symbol
          : "b:" + (h.boat_slug ?? "");
        sharesPerKey.set(key, (sharesPerKey.get(key) ?? 0) + 1);
      }

      const usedPerKey = new Map<string, { days: number; miles: number }>();
      for (const b of allBookings) {
        if (!ACTIVE_STATUSES.has(b.status) && b.status !== "completed") {
          continue;
        }
        const startMs = new Date(b.start_date).getTime();
        if (startMs < yearStart || startMs >= yearEnd) continue;
        const key = b.vehicle_symbol
          ? "v:" + b.vehicle_symbol
          : "b:" + (b.boat_slug ?? "");
        const cur = usedPerKey.get(key) ?? { days: 0, miles: 0 };
        cur.days += b.days ?? 0;
        // Estimate miles ~= days * 100 (matches the booking-flow
        // copy "X days · ~Y mi included"); a real telemetry feed
        // would replace this when the cars/boats land.
        cur.miles += (b.days ?? 0) * 100;
        usedPerKey.set(key, cur);
      }

      const ents: AssetEntitlement[] = [];
      for (const [key, shareCount] of sharesPerKey) {
        let daysAllowance = 0;
        let milesAllowance = 0;
        let name = key;
        if (key.startsWith("v:")) {
          const v = VEHICLES.find((x) => x.symbol === key.slice(2));
          if (!v) continue;
          name = `${v.year} ${v.name}`;
          daysAllowance = v.daysPerYear * shareCount;
          milesAllowance = v.milesPerYear * shareCount;
        } else {
          const b = BOATS.find((x) => x.slug === key.slice(2));
          if (!b) continue;
          name = `${b.year} ${b.name}`;
          daysAllowance = b.daysPerYear * shareCount;
          // Boats use engine-hour allowances rather than miles;
          // surfacing miles=0 here renders as a 0/0 bar that the
          // UI renders gracefully. We can swap to engine hours in
          // a follow-up once the boats catalog exposes that.
          milesAllowance = 0;
        }
        const used = usedPerKey.get(key) ?? { days: 0, miles: 0 };
        ents.push({
          key,
          name,
          daysAllowance,
          milesAllowance,
          daysUsed: used.days,
          milesUsed: used.miles,
        });
      }
      setEntitlements(ents);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Split active bookings by past vs future from today.
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.end_date >= todayIso && ACTIVE_STATUSES.has(b.status),
  );
  const past = bookings
    .filter((b) => b.end_date < todayIso || b.status === "completed")
    .reverse();

  return (
    <>
      <SiteHeader />
      <DemoBanner />

      {/* Hero / entitlement */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Bookings
          </p>
          <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
            Schedule across all your shares.
          </h1>
        </div>
      </section>

      {/* Entitlement bars (real, from share_holdings + bookings) */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">Your usage this year</h2>
          {loading ? (
            <p className="mt-4 text-sm text-mute">Loading…</p>
          ) : entitlements.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center">
              <p className="text-sm text-ink-soft">
                No co-ownership shares yet — entitlements show up here as soon
                as your first share lands. Browse the fleet:
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href="/portfolio"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-red"
                >
                  Cars
                </Link>
                <Link
                  href="/boats/portfolio"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
                >
                  Boats
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {entitlements.map((e) => (
                <Entitlement
                  key={e.key}
                  vehicle={e.name}
                  days={{ used: e.daysUsed, total: e.daysAllowance }}
                  miles={{ used: e.milesUsed, total: e.milesAllowance }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Action bar */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div />
            <Link
              href="/bookings/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              + Book time
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">Upcoming</h2>
          {loading ? (
            <p className="mt-4 text-sm text-mute">Loading…</p>
          ) : upcoming.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center text-sm text-ink-soft">
              No upcoming bookings.
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-rule bg-surface p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-lg text-ink">{assetLabel(b)}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        b.status === "confirmed"
                          ? "bg-success/10 text-success-deep"
                          : b.status === "in-progress"
                            ? "bg-warn/15 text-warn-deep"
                            : "bg-red/10 text-red"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <Field
                      label="Dates"
                      value={`${fmt(b.start_date)} – ${fmt(b.end_date)}`}
                    />
                    <Field label="Duration" value={`${b.days} days`} />
                    <Field
                      label="Handover"
                      value={
                        b.handover === "delivery"
                          ? "White-glove delivery"
                          : "Self-pickup"
                      }
                    />
                    <Field label="Type" value={b.type === "event" ? "Special event" : "Standard"} />
                  </div>
                  {b.notes && (
                    <p className="mt-3 text-xs text-mute">{b.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Past */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">Past trips</h2>
          {loading ? (
            <p className="mt-4 text-sm text-mute">Loading…</p>
          ) : past.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center text-sm text-ink-soft">
              No past trips yet.
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
              {past.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{assetLabel(p)}</p>
                    <p className="mt-0.5 text-xs text-mute">
                      {fmt(p.start_date)} – {fmt(p.end_date)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-mute">
                    <p>{p.days} days</p>
                    <p className="mt-0.5">{p.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

// ── view primitives ────────────────────────────────────────────

function fmt(iso: string): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function Entitlement({
  vehicle,
  days,
  miles,
}: {
  vehicle: string;
  days: { used: number; total: number };
  miles: { used: number; total: number };
}) {
  const dPct = days.total > 0 ? (days.used / days.total) * 100 : 0;
  const mPct = miles.total > 0 ? (miles.used / miles.total) * 100 : 0;
  return (
    <div className="rounded-xl border border-rule bg-surface p-6">
      <p className="font-display text-base text-ink">{vehicle}</p>
      <Bar label="Days" used={days.used} total={days.total} pct={dPct} suffix="days" />
      <Bar label="Miles" used={miles.used} total={miles.total} pct={mPct} suffix="mi" />
    </div>
  );
}

function Bar({
  label,
  used,
  total,
  pct,
  suffix,
}: {
  label: string;
  used: number;
  total: number;
  pct: number;
  suffix: string;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="tabular-nums text-ink">
          {used.toLocaleString()} / {total.toLocaleString()} {suffix}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rule">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-mute">
        {label}
      </p>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}
