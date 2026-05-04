"use client";

// /account — Overview tab. The dashboard hub: a welcome line, the
// quick stats strip, and a recent-activity feed. Other sections live
// at /account/profile, /account/security, etc. (sidebar in layout).
//
// Real data:
//   - Display name + member-since from auth.users + user_profiles
//   - Stats from share_holdings + bookings (RLS scopes to caller)
//   - Activity feed = union of recent share_purchases + bookings
//     + llc_amendments, sorted by date

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  assetsCount: number;
  totalShares: number;
  upcomingBookings: number;
  nextBookingDate: string | null;
};

type ActivityItem = {
  key: string;
  label: string;
  detail: string;
  date: string;
};

export default function AccountOverviewPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
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

      // Display name from user_profiles (preferred → full → email
      // prefix → null). If no profile row yet, falls through.
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("preferred_name, full_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      setDisplayName(
        profile?.preferred_name ||
          profile?.full_name ||
          (userData.user.email
            ? userData.user.email.split("@")[0]
            : null),
      );
      if (userData.user.created_at) {
        const d = new Date(userData.user.created_at);
        setMemberSince(
          d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        );
      }

      // Holdings (active only) — distinct asset count + total shares.
      const { data: holdings } = await supabase
        .from("share_holdings")
        .select("vehicle_symbol, boat_slug, shares")
        .eq("user_id", userId)
        .is("transferred_at", null);
      if (cancelled) return;
      const assetKeys = new Set<string>();
      let totalShares = 0;
      for (const h of holdings ?? []) {
        if (h.vehicle_symbol) assetKeys.add("v:" + h.vehicle_symbol);
        if (h.boat_slug) assetKeys.add("b:" + h.boat_slug);
        totalShares += h.shares ?? 0;
      }

      // Upcoming bookings — active statuses, end_date >= today.
      const today = new Date().toISOString().slice(0, 10);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, start_date, end_date, status, vehicle_symbol, boat_slug")
        .eq("user_id", userId)
        .in("status", ["pending", "confirmed", "in-progress"])
        .gte("end_date", today)
        .order("start_date", { ascending: true });
      if (cancelled) return;

      const nextDate =
        bookings && bookings.length > 0 ? bookings[0].start_date : null;
      setStats({
        assetsCount: assetKeys.size,
        totalShares,
        upcomingBookings: bookings?.length ?? 0,
        nextBookingDate: nextDate,
      });

      // Activity feed: combine recent share_purchases + bookings +
      // llc_amendments. Cap at 5 most-recent across the union.
      const [purchasesRes, amendmentsRes] = await Promise.all([
        supabase
          .from("share_purchases")
          .select(
            "id, status, shares, vehicle_symbol, boat_slug, updated_at",
          )
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("llc_amendments")
          .select(
            "id, document_type, vehicle_symbol, boat_slug, created_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;

      const items: ActivityItem[] = [];
      for (const b of bookings ?? []) {
        const asset = b.vehicle_symbol || b.boat_slug || "asset";
        items.push({
          key: "b:" + b.id,
          label:
            b.status === "confirmed"
              ? "Booking confirmed"
              : b.status === "in-progress"
                ? "Booking active"
                : "Booking pending",
          detail: `${String(asset).toUpperCase()} · ${b.start_date} – ${b.end_date}`,
          date: b.start_date,
        });
      }
      for (const p of purchasesRes.data ?? []) {
        const asset = p.vehicle_symbol || p.boat_slug || "asset";
        const verb =
          p.status === "paid"
            ? "Share confirmed"
            : p.status === "pending"
              ? "Share pending"
              : p.status === "failed"
                ? "Share payment failed"
                : "Share " + p.status;
        items.push({
          key: "p:" + p.id,
          label: verb,
          detail: `${String(asset).toUpperCase()} · ${p.shares} share${p.shares > 1 ? "s" : ""}`,
          date: p.updated_at,
        });
      }
      for (const a of amendmentsRes.data ?? []) {
        const asset = a.vehicle_symbol || a.boat_slug || "asset";
        items.push({
          key: "a:" + a.id,
          label: "LLC amendment generated",
          detail: `${String(asset).toUpperCase()} · ${a.document_type.replace(/_/g, " ")}`,
          date: a.created_at,
        });
      }
      items.sort((x, y) => (y.date > x.date ? 1 : -1));
      setActivity(items.slice(0, 5));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Account
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          {displayName ? `Welcome back, ${displayName}.` : "Welcome back."}
        </h1>
        <p className="mt-2 text-sm text-mute">
          {memberSince ? `Member since ${memberSince}` : "RYDA member"} · Miami
        </p>
      </header>

      {/* Quick stats — pulled live from share_holdings + bookings.
          assetsCount = distinct vehicle/boat the member holds at
          least one active share in. Empty state when zero. */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat
            label="Assets co-owned"
            value={loading ? "…" : String(stats?.assetsCount ?? 0)}
            sub={
              !loading && (stats?.totalShares ?? 0) > 0
                ? `${stats?.totalShares} share${stats?.totalShares === 1 ? "" : "s"}`
                : "Browse the fleet"
            }
          />
          <Stat
            label="Upcoming bookings"
            value={loading ? "…" : String(stats?.upcomingBookings ?? 0)}
            sub={
              !loading && stats?.nextBookingDate
                ? `Next: ${new Date(stats.nextBookingDate).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}`
                : "None scheduled"
            }
          />
          <Stat label="Member status" value="Active" sub="See Membership" />
        </div>
      </section>

      {/* Quick-jump cards into member-area routes. Cards without a
          backing route show "Available at launch" and are
          non-clickable. */}
      <section>
        <h2 className="font-display text-xl text-ink">Jump to</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="My assets"
            desc={
              loading
                ? "Loading…"
                : (stats?.assetsCount ?? 0) > 0
                  ? `${stats?.assetsCount} co-owned · ${stats?.totalShares} shares`
                  : "Browse the fleet"
            }
            href="/account/membership"
          />
          <Card
            title="Bookings"
            desc={
              loading
                ? "Loading…"
                : (stats?.upcomingBookings ?? 0) > 0
                  ? `${stats?.upcomingBookings} upcoming`
                  : "Book a session"
            }
            href="/bookings"
          />
          <Card title="Profile" desc="Name, contact, address" href="/account/profile" />
          <Card title="Login & security" desc="Email, password, sessions" href="/account/security" />
          <Card title="Verification" desc="KYC, driving record" href="/account/verification" />
          <Card title="Documents" desc="Agreements, insurance certs" href="/account/documents" />
        </div>
      </section>

      {/* Recent activity — live union of bookings + share_purchases
          + llc_amendments, capped at 5 most-recent. Empty state
          when nothing has happened yet. */}
      <section>
        <h2 className="font-display text-xl text-ink">Recent activity</h2>
        {loading ? (
          <p className="mt-4 text-sm text-mute">Loading activity…</p>
        ) : activity.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center">
            <p className="text-sm text-ink-soft">
              No activity yet. Buy a share or book time on a co-owned asset to
              see things land here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            {activity.map((a) => (
              <Activity
                key={a.key}
                label={a.label}
                detail={a.detail}
                date={formatRelativeDate(a.date)}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-mute">
        Co-ownership and bookings ship live with the Miami launch. See{" "}
        <Link href="/membership" className="text-red hover:text-red-deep">
          /membership
        </Link>{" "}
        for what's included.
      </p>
    </div>
  );
}

// "2 hours ago" style timestamp — caps at "Yesterday" / "N days ago"
// for the recent-activity feed; full date past 30 days.
function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "Just now";
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))} h ago`;
  if (ms < 48 * 60 * 60_000) return "Yesterday";
  if (ms < 30 * 24 * 60 * 60_000)
    return `${Math.floor(ms / (24 * 60 * 60_000))} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </div>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href?: string }) {
  if (!href) {
    return (
      <div className="block rounded-2xl border border-rule bg-surface p-5">
        <p className="font-display text-base text-ink">{title}</p>
        <p className="mt-2 text-xs text-ink-soft">{desc}</p>
        <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-mute">
          Available at launch
        </p>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <p className="font-display text-base text-ink">{title}</p>
      <p className="mt-2 text-xs text-ink-soft">{desc}</p>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-red">
        Open →
      </p>
    </Link>
  );
}

function Activity({
  label,
  detail,
  date,
}: {
  label: string;
  detail: string;
  date: string;
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{detail}</p>
      </div>
      <p className="text-xs text-mute">{date}</p>
    </li>
  );
}

// Charge component removed — upcoming-charges section was sample
// data; will return when the Stripe billing-portal route lands
// real receipts.
