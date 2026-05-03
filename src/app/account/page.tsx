"use client";

// /account — Overview tab. The dashboard hub: a welcome line, the
// quick stats strip, and a recent-activity feed. Other sections live
// at /account/profile, /account/security, etc. (sidebar in layout).
//
// Reads the user's email + display name from Supabase auth so the
// "Welcome back" line is real (not the placeholder it used to be).
// All other numbers are still placeholder until /portfolio,
// /bookings, and /messages are wired to live data.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AccountOverviewPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const meta = data.user.user_metadata ?? {};
      setDisplayName(
        meta.preferred_name ||
          meta.full_name ||
          (data.user.email ? data.user.email.split("@")[0] : null),
      );
      if (data.user.created_at) {
        const d = new Date(data.user.created_at);
        setMemberSince(
          d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        );
      }
    });
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
          {memberSince ? `Member since ${memberSince}` : "RYDA member"} · RYDA Blue · Miami
        </p>
      </header>

      {/* Quick stats. Will swap to live numbers once /portfolio +
          /bookings APIs return per-user counts. */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Stat label="Cars co-owned" value="2" sub="Ferrari 296 + McLaren 750S" />
          <Stat label="Days used this year" value="14" sub="Of 68 entitled" />
          <Stat label="Days remaining" value="54" sub="Across all shares" />
          <Stat label="Upcoming bookings" value="3" sub="Next: May 12" />
        </div>
      </section>

      {/* Quick-jump cards into the busy parts of the member area.
          Each card opens a member-area route. Cards without a route
          show "Available at launch" and are non-clickable. */}
      <section>
        <h2 className="font-display text-xl text-ink">Jump to</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="My Cars" desc="2 vehicles · 2 shares each" href="/portfolio" />
          <Card title="Bookings" desc="3 upcoming · next May 12" href="/bookings" />
          <Card title="Messages" desc="2 unread" href="/messages" />
          <Card title="Profile" desc="Name, contact, address" href="/account/profile" />
          <Card title="Login & security" desc="Email, password, sessions" href="/account/security" />
          <Card title="Verification" desc="KYC, driving record" href="/account/verification" />
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="font-display text-xl text-ink">Recent activity</h2>
        <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
          <Activity label="Booking confirmed" detail="Ferrari 296 GTB · May 12 – May 14" date="2 hours ago" />
          <Activity label="Inspection report posted" detail="McLaren 750S Spider · 2,140 mi" date="Yesterday" />
          <Activity label="Quarterly mgmt fee paid" detail="$3,540, Ferrari 296 LLC" date="3 days ago" />
          <Activity label="Welcome to RYDA Blue" detail="Annual membership active" date="2 weeks ago" />
          <Activity label="Co-ownership share confirmed" detail="McLaren 750S, 2 of 10 shares" date="3 weeks ago" />
        </ul>
      </section>

      {/* Upcoming charges */}
      <section>
        <h2 className="font-display text-xl text-ink">Upcoming charges</h2>
        <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
          <Charge label="White-glove delivery (Apr 28)" amount="—" sub="Blue tier, included" />
          <Charge label="Q3 management fee · Ferrari 296" amount="$3,540" sub="Due Jul 1, 2026" />
          <Charge label="Q3 management fee · McLaren 750S" amount="$3,450" sub="Due Jul 1, 2026" />
          <Charge label="Annual insurance · Ferrari 296" amount="$3,666" sub="Due Sep 15, 2026" />
        </ul>
      </section>

      <p className="text-xs text-mute">
        Sample dashboard · Member-area features ship at Miami launch.
        See <Link href="/membership" className="text-red hover:text-red-deep">/membership</Link> for what's included.
      </p>
    </div>
  );
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

function Charge({ label, amount, sub }: { label: string; amount: string; sub: string }) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{sub}</p>
      </div>
      <p className="font-medium text-ink tabular-nums">{amount}</p>
    </li>
  );
}
