"use client";

// /account — Overview tab. The dashboard hub: a welcome line, the
// quick stats strip, and a recent-activity feed. Other sections live
// at /account/requests, /account/profile, etc. (sidebar in layout).
//
// Real data:
//   - Display name + account-created date from auth.users + user_profiles
//   - Stats + activity from the caller's rental_inquiries rows, read
//     through useRentalProfile (GET /api/rental-inquiry, session-gated,
//     own rows only, newest first) — the same source /account/requests
//     renders, so the two tabs can never disagree.
//
// This page used to aggregate share_holdings, bookings, share_purchases
// and llc_amendments. Those are co-ownership tables and no longer have
// application code behind them.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStatus } from "@/lib/use-auth-status";
import {
  useRentalProfile,
  type RentalInquiry,
} from "@/lib/use-rental-profile";

// Pipeline states that still have a future in them. `booked` is a
// confirmed trip; `lost` is closed and counts toward neither.
const OPEN_STATUSES = new Set(["new", "sent"]);

// Labels for the activity feed, kept in step with the status chips on
// /account/requests. `sent` means RYDA has passed the lead on — a
// request that is still `new` is sitting with the RYDA team, so the
// two states are never collapsed into one reassurance.
const ACTIVITY_LABEL: Record<string, string> = {
  new: "Request sent",
  sent: "Routed to an operator",
  booked: "Booking confirmed",
  lost: "Request closed",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountOverviewPage() {
  const { status: authStatus } = useAuthStatus();
  const { loading: inquiriesLoading, inquiries } = useRentalProfile(
    authStatus === "authed",
  );

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [accountOpened, setAccountOpened] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled || !userData.user) return;

      // Display name from user_profiles (preferred → full → email
      // prefix → null). If no profile row yet, falls through.
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("preferred_name, full_name")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (cancelled) return;
      setDisplayName(
        profile?.preferred_name ||
          profile?.full_name ||
          (userData.user.email ? userData.user.email.split("@")[0] : null),
      );
      if (userData.user.created_at) {
        const d = new Date(userData.user.created_at);
        setAccountOpened(
          d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = authStatus === "loading" || inquiriesLoading;

  // Derived stats. All three read off the same rows the requests tab
  // shows, so a member never sees a count that its own list contradicts.
  const openCount = inquiries.filter((i) => OPEN_STATUSES.has(i.status)).length;
  const bookedCount = inquiries.filter((i) => i.status === "booked").length;
  const upcoming = nextUpcoming(inquiries);

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
          {accountOpened ? `Account opened ${accountOpened}` : "Your RYDA account"}
        </p>
      </header>

      {/* Quick stats — the member's own rental pipeline. Empty state
          when they haven't sent a request yet. */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat
            label="Open requests"
            value={loading ? "…" : String(openCount)}
            sub={
              loading
                ? undefined
                : openCount > 0
                  ? "Not closed yet"
                  : "Browse the fleet"
            }
          />
          <Stat
            label="Trips booked"
            value={loading ? "…" : String(bookedCount)}
            sub={loading ? undefined : bookedCount > 0 ? "All time" : "None yet"}
          />
          <Stat
            label="Next pickup"
            value={
              loading ? "…" : upcoming ? prettyShortDate(upcoming.start_date) : "—"
            }
            sub={loading ? undefined : (upcoming?.vehicle_label ?? "Nothing scheduled")}
          />
        </div>
      </section>

      {/* Quick-jump cards into the surviving member-area routes. */}
      <section>
        <h2 className="font-display text-xl text-ink">Jump to</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Rental requests"
            desc={
              loading
                ? "Loading…"
                : inquiries.length > 0
                  ? `${inquiries.length} request${inquiries.length === 1 ? "" : "s"} · ${openCount} open`
                  : "Where each request stands"
            }
            href="/account/requests"
          />
          <Card title="Browse the fleet" desc="Cars available in Miami" href="/rent" />
          <Card title="Profile" desc="Name, contact, address" href="/account/profile" />
          <Card
            title="Login & security"
            desc="Email, password, sessions"
            href="/account/security"
          />
          {/* Labels state what the destination page actually holds.
              "KYC, driving record" claimed a driving-record check that
              does not exist, and "Cards, bank ACH" claimed RYDA holds
              payment instruments — /account/payments opens by denying
              exactly that. */}
          <Card
            title="Verification"
            desc="Stripe Identity check"
            href="/account/verification"
          />
          <Card title="Payments" desc="How a rental is paid" href="/account/payments" />
        </div>
      </section>

      {/* Recent activity — the five most recent rental requests, newest
          first (the API already sorts, so no re-sort here). */}
      <section>
        <h2 className="font-display text-xl text-ink">Recent activity</h2>
        {loading ? (
          <p className="mt-4 text-sm text-mute">Loading activity…</p>
        ) : inquiries.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center">
            <p className="text-sm text-ink-soft">
              No activity yet.{" "}
              <Link href="/rent" className="text-red hover:text-red-deep">
                Request a car
              </Link>{" "}
              and it&apos;ll land here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            {inquiries.slice(0, 5).map((i) => (
              <Activity
                key={i.id}
                label={ACTIVITY_LABEL[i.status] ?? i.status}
                detail={`${i.vehicle_label} · ${prettyShortDate(i.start_date)} – ${prettyShortDate(i.end_date)}`}
                date={formatRelativeDate(i.created_at)}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-mute">
        Your price is always the operator&apos;s price. See{" "}
        <Link href="/how-it-works" className="text-red hover:text-red-deep">
          how it works
        </Link>
        .
      </p>
    </div>
  );
}

// Soonest not-yet-finished trip among requests that are still live.
// A `lost` request is never upcoming no matter what its dates say.
function nextUpcoming(inquiries: RentalInquiry[]): RentalInquiry | null {
  const today = todayIso();
  const live = inquiries
    .filter((i) => i.status !== "lost" && i.end_date >= today)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  return live[0] ?? null;
}

// "Mar 4" — date-only strings are rendered at noon so a UTC parse
// can't roll them back a day in a western timezone.
function prettyShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "2 hours ago" style timestamp — caps at "Yesterday" / "N days ago"
// for the recent-activity feed; full date past 30 days.
function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
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

// Every card links somewhere. The old optional-href branch rendered
// "Available at launch" for cards with no destination; there are none,
// and Miami is live, so the branch is gone and href is required.
function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
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
