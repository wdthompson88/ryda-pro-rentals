"use client";

// 90-day shared-calendar visualization per LLC the member is in.
// Surfaces "what days are mine vs my fellow members' vs available"
// — the audit's Finding 1 of the cohort-1-must-have list.
//
// DATA MODEL
// Reads bookings via supabase RLS (the policy already allows
// co-owners on the same LLC to see each other's bookings; see
// migration 0009_bookings.sql).
//
// PRIVACY
// Co-owner bookings render as "Co-owner" — no name leak. The
// member's own bookings show their own bookings explicitly.
//
// VISUAL
// 90-day strip per asset. Each day-cell colored by who has it:
//   ● red  = your booking
//   ● ink  = co-owner's booking
//   ○      = available
// Click a day jumps to /bookings/new with the date pre-selected.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Holding = {
  vehicle_symbol: string | null;
  boat_slug: string | null;
};

type BookingRow = {
  id: string;
  user_id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: string;
};

type AssetKey = string; // composite key: "v:f458" or "b:wajer-55s"

function assetKeyFor(b: { vehicle_symbol: string | null; boat_slug: string | null }): AssetKey | null {
  if (b.vehicle_symbol) return `v:${b.vehicle_symbol}`;
  if (b.boat_slug) return `b:${b.boat_slug}`;
  return null;
}

function assetLabel(key: AssetKey): string {
  const [type, slug] = key.split(":", 2);
  if (type === "v") return slug.toUpperCase();
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROLLING_DAYS = 90;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayList(): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < ROLLING_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    out.push(dateKey(d));
  }
  return out;
}

function inRange(day: string, start: string, end: string): boolean {
  return day >= start && day <= end;
}

export function LlcSharedCalendar() {
  const [me, setMe] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const supa = supabase!;
      const { data: userData } = await supa.auth.getUser();
      if (cancelled) return;
      if (!userData.user) {
        setHoldings([]);
        return;
      }
      setMe(userData.user.id);

      const [holdingsRes, bookingsRes] = await Promise.all([
        supa
          .from("share_holdings")
          .select("vehicle_symbol, boat_slug")
          .is("transferred_at", null),
        // RLS includes bookings on assets the caller has shares in,
        // so this query naturally returns my-bookings + co-owner
        // bookings + nothing else.
        supa
          .from("bookings")
          .select(
            "id, user_id, vehicle_symbol, boat_slug, start_date, end_date, status",
          )
          .gte("end_date", new Date().toISOString().slice(0, 10))
          .in("status", ["pending", "confirmed", "in-progress"])
          .order("start_date", { ascending: true })
          .limit(200),
      ]);

      if (cancelled) return;
      if (holdingsRes.error) {
        setLoadErr(holdingsRes.error.message);
        return;
      }
      setHoldings((holdingsRes.data ?? []) as Holding[]);
      setBookings((bookingsRes.data ?? []) as BookingRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group bookings by asset key.
  const byAsset = useMemo(() => {
    const map = new Map<AssetKey, BookingRow[]>();
    for (const b of bookings) {
      const k = assetKeyFor(b);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return map;
  }, [bookings]);

  // Distinct asset keys this member holds — drives the per-LLC rows.
  const myAssetKeys = useMemo<AssetKey[]>(() => {
    if (!holdings) return [];
    const keys = new Set<AssetKey>();
    for (const h of holdings) {
      const k = assetKeyFor(h);
      if (k) keys.add(k);
    }
    return Array.from(keys).sort();
  }, [holdings]);

  if (loadErr) {
    return (
      <p className="text-xs text-red">
        Couldn&apos;t load calendar: {loadErr}
      </p>
    );
  }

  if (!holdings) {
    return <p className="text-xs text-mute">Loading calendar…</p>;
  }

  if (myAssetKeys.length === 0) {
    return (
      <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-center">
        <p className="text-sm text-ink-soft">
          The shared calendar appears here once you co-own a share in
          an LLC. Until then, the marketing portfolio at{" "}
          <Link href="/portfolio" className="text-ink underline-offset-4 hover:underline">
            /portfolio
          </Link>{" "}
          shows what&apos;s available.
        </p>
      </div>
    );
  }

  const days = dayList();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs text-ink-soft">
          Next 90 days across every LLC you&apos;re in. Member bookings
          render in <span className="font-medium text-red">red</span>;
          co-owner bookings render in{" "}
          <span className="font-medium text-ink">ink</span>{" "}
          (anonymized).
        </p>
        <Link
          href="/bookings/new"
          className="text-xs font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Book a date →
        </Link>
      </div>

      {myAssetKeys.map((key) => {
        const assetBookings = byAsset.get(key) ?? [];
        return (
          <div
            key={key}
            className="rounded-2xl border border-rule bg-surface p-5"
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-lg text-ink">
                {assetLabel(key)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-mute">
                {assetBookings.filter((b) => b.user_id === me).length} of
                yours
                {" · "}
                {assetBookings.filter((b) => b.user_id !== me).length}{" "}
                co-owner
              </p>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(90,1fr)] gap-px overflow-hidden rounded-lg bg-rule">
              {days.map((day) => {
                const mineHere = assetBookings.find(
                  (b) =>
                    b.user_id === me &&
                    inRange(day, b.start_date, b.end_date),
                );
                const othersHere = assetBookings.find(
                  (b) =>
                    b.user_id !== me &&
                    inRange(day, b.start_date, b.end_date),
                );
                let bg = "bg-cream";
                let title = day;
                if (mineHere) {
                  bg = "bg-red";
                  title = `${day} · your booking (${mineHere.status})`;
                } else if (othersHere) {
                  bg = "bg-ink";
                  title = `${day} · co-owner booking (${othersHere.status})`;
                }
                const dow = new Date(day).getUTCDay();
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <div
                    key={day}
                    className={`relative h-8 ${bg} ${
                      isWeekend && bg === "bg-cream"
                        ? "after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-cream-2"
                        : ""
                    }`}
                    title={title}
                  />
                );
              })}
            </div>

            <div className="mt-3 flex items-baseline justify-between text-[10px] uppercase tracking-wider text-mute">
              <span>{days[0]}</span>
              <span>30d</span>
              <span>60d</span>
              <span>{days[days.length - 1]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
