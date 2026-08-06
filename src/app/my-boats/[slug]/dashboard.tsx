"use client";

// Member-side owner dashboard for one boat. Real-data wired through
// /api/account/my-asset.
//
// Behavior by state:
//   - loading       → skeleton hero
//   - anon          → "sign-in required" CTA
//   - not-owner     → polite "you don't own this hull" empty state
//                     (kept generic so we don't leak which slugs exist)
//   - error         → error banner with retry
//   - owner         → full dashboard with real ownership, LLC, bookings,
//                     payments, co-owners. Fields not yet sourced from
//                     the DB (service history, group chat, telemetry)
//                     fall back to the existing demo placeholders.

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { SiteHeader } from "@/components/site-header";
import { BookingTiersExplainer } from "@/components/booking-tiers-explainer";
import { AssetCalendar } from "@/components/asset-calendar";
import { formatUSD, BOAT_BOOKING_POLICY, type Boat } from "@/lib/boat-data";
import { useMyAsset, type MyAssetData } from "@/components/member/use-my-asset";

export function MyBoatDashboard({ boat }: { boat: Boat }) {
  const { state, refresh } = useMyAsset(`boat:${boat.slug}`);

  if (state.status === "loading") return <Skeleton boat={boat} />;
  if (state.status === "anon") return <SignInPrompt />;
  if (state.status === "not-owner") return <NotOwner />;
  if (state.status === "error")
    return <ErrorBanner message={state.message} retry={refresh} />;

  return <Loaded boat={boat} data={state.data} />;
}

function Loaded({ boat, data }: { boat: Boat; data: MyAssetData }) {
  const isLead = useMemo(() => {
    // Proposal Coordinator = caller with the highest share count among
    // active co-owners. Ties resolve to first-acquired (earliest
    // acquired_at), but the API doesn't return that on copartners
    // today; fall back to share-count majority + caller-is-you.
    const me = data.copartners.find((c) => c.is_you);
    if (!me) return false;
    const maxShares = Math.max(...data.copartners.map((c) => c.shares));
    return me.shares === maxShares;
  }, [data.copartners]);

  const callerShares = data.ownership.shares;
  const yourDays = callerShares * boat.daysPerYear;
  const yourNm = callerShares * boat.nmPerYear;
  const yourAnnualCost = callerShares * boat.annualOpCost;

  // Days used + nm used: aggregate completed bookings for this user.
  // start_date / end_date are dates; days = (end - start + 1).
  const daysUsed = useMemo(() => {
    return data.bookings
      .filter((b) => b.status === "completed" || b.status === "confirmed")
      .reduce((acc, b) => {
        const start = Date.parse(b.start_date);
        const end = Date.parse(b.end_date);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return acc;
        return acc + Math.max(1, Math.round((end - start) / 86_400_000) + 1);
      }, 0);
  }, [data.bookings]);

  const plannedActive = useMemo(
    () =>
      data.bookings.filter(
        (b) => b.status === "pending" || b.status === "confirmed",
      ).length,
    [data.bookings],
  );

  const recentPayments = data.payments
    .filter((p) => p.status === "paid")
    .slice(0, 6);

  const upcomingBooking = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data.bookings
      .filter((b) => b.start_date >= today && b.status !== "canceled")
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  }, [data.bookings]);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/my-boats"
            className="text-xs font-medium uppercase tracking-[0.2em] text-marine hover:text-marine-deep"
          >
            ← My Boats
          </Link>
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-cream-2">
                <Image
                  src={boat.hero}
                  alt={`${boat.year} ${boat.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className={`object-cover ${boat.flipImage ? "-scale-x-100" : ""}`}
                  style={{ objectPosition: boat.imagePosition ?? "center" }}
                />
              </div>
            </div>
            <div className="lg:col-span-5">
              <p className="text-xs text-mute">
                {boat.brand} · {boat.year} · {boat.market}
              </p>
              <h1 className="mt-1 font-display text-4xl font-light text-ink sm:text-5xl">
                {boat.name}
              </h1>
              {isLead && (
                <span className="mt-3 inline-block rounded-full bg-marine px-3 py-1 text-xs font-medium text-cream">
                  ★ Proposal Coordinator
                </span>
              )}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <Stat
                  label="Your shares"
                  value={`${callerShares} of ${boat.shares}`}
                />
                <Stat
                  label="LLC status"
                  value={data.llc?.status ?? "Not formed"}
                />
                <Stat
                  label="Days used (yr)"
                  value={`${daysUsed} / ${yourDays}`}
                />
                <Stat
                  label="Nm allowance (yr)"
                  value={yourNm.toLocaleString()}
                />
                <Stat
                  label="Planned reservations"
                  value={`${plannedActive} of ${BOAT_BOOKING_POLICY.planned.activeLimitPerShare * callerShares} active`}
                />
                <Stat
                  label="Short-notice"
                  value={`Open · up to ${BOAT_BOOKING_POLICY.shortNotice.maxDaysAdvance} days out`}
                />
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/bookings/new"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-marine px-7 text-sm font-medium text-cream hover:bg-marine-deep"
                >
                  Book time →
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
                >
                  Message group
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-tab navigation */}
      <section className="sticky top-18 z-10 border-b border-rule bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 sm:px-10">
          {[
            ["Overview", "#overview"],
            ["Costs", "#costs"],
            ["Bookings", "#bookings"],
            ["Documents", "#documents"],
            ["Co-Owners", "#co-owners"],
            ["Boat Status", "#status"],
            ...(isLead ? [["Settings", "#settings"]] : []),
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 px-4 py-4 text-sm font-medium text-ink-soft hover:text-ink"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* Overview */}
      <Section id="overview" title="Overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            title="Your next booking"
            body={
              upcomingBooking
                ? `${upcomingBooking.start_date} → ${upcomingBooking.end_date} · ${upcomingBooking.status} (${upcomingBooking.mode})`
                : "No upcoming bookings yet."
            }
            cta={["See bookings", "/bookings"]}
          />
          <Card
            title="Group chat"
            body={
              data.copartners.length > 1
                ? `${data.copartners.length} co-owners in the LLC group thread.`
                : "Group chat opens once a second co-owner joins."
            }
            cta={["Open chat", "/messages"]}
          />
          <Card
            title="LLC status"
            body={
              data.llc
                ? `${data.llc.name} · ${data.llc.state}${data.llc.ein ? ` · EIN ${data.llc.ein}` : ""}${data.llc.formation_date ? ` · formed ${fmtDate(data.llc.formation_date)}` : ""}`
                : "LLC formation pending. You'll be notified when filing completes."
            }
            cta={["See documents", "#documents"]}
          />
        </div>
        <div className="mt-8">
          <h3 className="font-display text-lg text-ink">Recent activity</h3>
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            {buildActivity(data).slice(0, 6).map((a, i) => (
              <Activity
                key={`${a.kind}-${i}`}
                label={a.label}
                sub={a.sub}
                date={fmtRelative(a.date)}
              />
            ))}
            {buildActivity(data).length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-mute">
                No activity yet on this hull.
              </li>
            )}
          </ul>
        </div>
      </Section>

      {/* Costs */}
      <Section id="costs" title="Costs" alt>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BigStat
            label="Annual cost / share"
            value={formatUSD(boat.annualOpCost)}
            sub="All-in"
          />
          <BigStat
            label="Your annual carry"
            value={formatUSD(yourAnnualCost)}
            sub={`${callerShares} share${callerShares === 1 ? "" : "s"}`}
          />
          <BigStat
            label="Effective $/day"
            value={formatUSD(boat.effectiveDailyCost)}
            sub={`${boat.daysPerYear} days/yr usage`}
          />
        </div>
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink">
            Annual breakdown (your share)
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <Line
              label="Share buy-in (one-time)"
              value={formatUSD(boat.pricePerShare * callerShares)}
              note={
                data.ownership.acquired_at
                  ? `Acquired ${fmtDate(data.ownership.acquired_at)} · ${callerShares} share${callerShares === 1 ? "" : "s"}`
                  : ""
              }
            />
            <Line
              label="Slip + crew"
              value={formatUSD(Math.round(yourAnnualCost * 0.55))}
              note="Billed quarterly"
            />
            <Line
              label="Hull + liability insurance"
              value={formatUSD(Math.round(yourAnnualCost * 0.25))}
              note="Annual"
            />
            <Line
              label="Hurricane prep + reserve"
              value={formatUSD(Math.round(yourAnnualCost * 0.20))}
              note="Held at LLC"
            />
            <Line
              label="Total annual"
              value={formatUSD(yourAnnualCost)}
              note=""
              emphasis
            />
          </ul>
        </div>
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink">Recent payments</h3>
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            {recentPayments.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-mute">
                No payments recorded yet.
              </li>
            ) : (
              recentPayments.map((p) => (
                <Pmt
                  key={p.id}
                  label={`${p.shares} share${p.shares === 1 ? "" : "s"} · ${p.funding_method ?? "card"}`}
                  value={formatUSD(p.total_cents / 100)}
                  date={fmtDate(p.fulfilled_at ?? p.updated_at)}
                  status={p.status === "paid" ? "Paid" : p.status}
                />
              ))
            )}
          </ul>
        </div>
      </Section>

      {/* Bookings */}
      <Section id="bookings" title="Bookings">
        <div className="mb-6 flex items-end justify-between">
          <p className="text-sm text-ink-soft">Boat calendar</p>
          <Link
            href="/bookings/new"
            className="rounded-full bg-marine px-5 py-2 text-sm font-medium text-cream hover:bg-marine-deep"
          >
            + Book time
          </Link>
        </div>
        <AssetCalendar boatSlug={boat.slug} vertical="boats" />
        <div className="mt-6">
          <BookingTiersExplainer variant="compact" />
        </div>
      </Section>

      {/* Documents */}
      <Section id="documents" title="Documents" alt>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.llc ? (
            <>
              <Doc
                title={`LLC Operating Agreement — ${data.llc.name}`}
                date={data.llc.formation_date ?? "Pending"}
                size="—"
              />
              <Doc
                title={`Boat Title (${data.llc.name})`}
                date={data.llc.formation_date ?? "Pending"}
                size="—"
              />
              {data.llc.ein && (
                <Doc title={`IRS EIN Letter`} date="On file" size="—" />
              )}
            </>
          ) : (
            <li className="rounded-xl border border-rule bg-surface px-5 py-4 sm:col-span-2">
              <p className="text-sm text-ink-soft">
                LLC formation in progress. Documents will appear here once
                filing completes.
              </p>
            </li>
          )}
        </ul>
        <p className="mt-4 text-xs text-mute">
          Document downloads are wired through the document-signatures
          service. Use the account documents page for the full archive.
        </p>
      </Section>

      {/* Co-Owners */}
      <Section id="co-owners" title="Co-Owners">
        <p className="text-sm text-ink-soft">
          {data.copartners.length} member
          {data.copartners.length === 1 ? "" : "s"} on this LLC. Names are
          anonymized to initials per the Co-Owner Agreement.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.copartners.map((c) => (
            <Owner
              key={c.user_id_short}
              initials={c.initials}
              prof={`${c.shares} share${c.shares === 1 ? "" : "s"}`}
              badge={c.is_you ? "You" : undefined}
              lead={
                c.shares ===
                  Math.max(...data.copartners.map((x) => x.shares)) &&
                data.copartners.length > 1
              }
            />
          ))}
        </ul>
        <div className="mt-8 rounded-xl border border-rule bg-surface p-6">
          <p className="font-display text-base text-ink">Group chat</p>
          <p className="mt-2 text-sm text-ink-soft">
            {data.copartners.length > 1
              ? `${data.copartners.length} members in the thread.`
              : "Group chat unlocks when a second co-owner joins."}
          </p>
          <Link
            href="/messages"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-marine"
          >
            Open chat →
          </Link>
        </div>
      </Section>

      {/* Boat Status */}
      <Section id="status" title="Boat Status" alt>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BigStat
            label="Hailing port"
            value={boat.hailingPort}
            sub={boat.market}
          />
          <BigStat
            label="Engine hours"
            value={boat.currentEngineHours.toLocaleString()}
            sub={`Cap at ${boat.year < 2024 ? "2,000" : "2,000"} hrs`}
          />
          <BigStat
            label="Captain"
            value={boat.captainIncluded ? "Crewed default" : "Bareboat eligible"}
            sub={boat.captainIncluded ? "Included" : "USCG license required"}
          />
        </div>
        <p className="mt-6 text-xs text-mute">
          Live telemetry (location, engine hours, last-service distance)
          is on the post-launch roadmap. Snapshot values reflect the
          intake survey.
        </p>
      </Section>

      {/* Member proposals (Proposal Coordinator) */}
      {isLead && (
        <Section
          id="settings"
          title="Member proposals · Proposal Coordinator"
        >
          <p className="mb-6 inline-block rounded-full bg-marine/10 px-3 py-1 text-xs font-medium text-marine">
            ★ Proposal Coordinator — facilitates co-owner votes
          </p>
          <p className="mb-6 max-w-2xl text-sm text-ink-soft">
            Material decisions (booking rules, boat modifications,
            transfers, document additions) go to a co-owner vote per the
            Operating Agreement. RYDA executes once the vote clears.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingCard
              title="Propose booking rules"
              desc="Change max consecutive days, blackouts, buffer time."
            />
            <SettingCard
              title="Propose boat preferences"
              desc="Fuel policy, delivery defaults."
            />
            <SettingCard
              title="Member register"
              desc="View current co-owners + intent-to-transfer flags."
            />
            <SettingCard
              title="Post a group update"
              desc="Boat update to all co-owners (no vote)."
            />
            <SettingCard
              title="Upload doc for review"
              desc="Add a doc to Documents; required-reading flag → vote."
            />
            <SettingCard
              title="Open service request"
              desc="Flag a boat issue or escalate a member conflict."
            />
          </div>
        </Section>
      )}
    </>
  );
}

// ── Activity stream builder ──────────────────────────────────────

type ActivityEntry = {
  kind: "purchase" | "booking";
  label: string;
  sub: string;
  date: string;
};

function buildActivity(data: MyAssetData): ActivityEntry[] {
  const items: ActivityEntry[] = [];
  for (const p of data.payments) {
    if (p.status === "paid") {
      items.push({
        kind: "purchase",
        label: "Share purchase fulfilled",
        sub: `${p.shares} share${p.shares === 1 ? "" : "s"} · ${formatUSD(p.total_cents / 100)}`,
        date: p.fulfilled_at ?? p.updated_at,
      });
    }
  }
  for (const b of data.bookings) {
    items.push({
      kind: "booking",
      label: `Booking ${b.status}`,
      sub: `${b.start_date} → ${b.end_date} · ${b.mode}`,
      date: b.created_at,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

// ── States ────────────────────────────────────────────────────────

function Skeleton({ boat }: { boat: Boat }) {
  return (
    <>
      <SiteHeader />
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Loading {boat.name}…
          </p>
          <div className="mt-6 h-72 animate-pulse rounded-2xl bg-cream-2" />
        </div>
      </section>
    </>
  );
}

function SignInPrompt() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-20 sm:px-10 sm:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
          Member-only
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink">
          Sign in to see your dashboard.
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          The my-boats dashboard shows your shares, bookings, payments, and
          LLC documents for hulls you actively co-own.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/signin?next=/my-boats"
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-marine"
          >
            Sign in →
          </Link>
          <Link
            href="/boats/portfolio"
            className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
          >
            Browse the fleet
          </Link>
        </div>
      </section>
    </>
  );
}

function NotOwner() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-20 sm:px-10 sm:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
          Not yet
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink">
          You don&apos;t hold shares in this boat.
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          This page is only shown to active co-owners. Once you complete a
          share purchase the boat will appear in your dashboard.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/boats/portfolio"
            className="inline-flex h-12 items-center justify-center rounded-full bg-marine px-7 text-sm font-medium text-cream hover:bg-marine-deep"
          >
            Browse the fleet →
          </Link>
          <Link
            href="/my-boats"
            className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
          >
            My boats
          </Link>
        </div>
      </section>
    </>
  );
}

function ErrorBanner({
  message,
  retry,
}: {
  message: string;
  retry: () => Promise<void>;
}) {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="rounded-2xl border border-red/40 bg-red/5 p-6">
          <p className="text-sm text-red">{message}</p>
          <button
            type="button"
            onClick={() => void retry()}
            className="mt-3 inline-flex h-10 items-center rounded-full border border-rule bg-surface px-4 text-xs font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            Retry
          </button>
        </div>
      </section>
    </>
  );
}

// ── Date helpers + sub-components (mirrors the old page primitives) ──

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtRelative(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return fmtDate(iso);
}

function Section({
  id,
  title,
  alt,
  children,
}: {
  id: string;
  title: string;
  alt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`border-b border-rule ${alt ? "bg-cream-2" : ""} scroll-mt-20`}
    >
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">{title}</h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-base text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}

function Card({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: [string, string];
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
      <Link
        href={cta[1]}
        className="mt-4 inline-block text-sm font-medium text-marine hover:text-marine-deep"
      >
        {cta[0]} →
      </Link>
    </div>
  );
}

function Activity({
  label,
  sub,
  date,
}: {
  label: string;
  sub: string;
  date: string;
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{sub}</p>
      </div>
      <p className="text-xs text-mute">{date}</p>
    </li>
  );
}

function Line({
  label,
  value,
  note,
  emphasis,
}: {
  label: string;
  value: string;
  note: string;
  emphasis?: boolean;
}) {
  const cls = emphasis
    ? "font-display text-lg text-ink border-t border-rule pt-3"
    : "text-ink-soft";
  return (
    <li className={`flex items-baseline justify-between ${cls}`}>
      <span>
        {label}
        {note && <span className="ml-2 text-xs text-mute">{note}</span>}
      </span>
      <span className="font-medium text-ink tabular-nums">{value}</span>
    </li>
  );
}

function Pmt({
  label,
  value,
  date,
  status,
}: {
  label: string;
  value: string;
  date: string;
  status: string;
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{date}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            status === "Paid"
              ? "bg-ink/5 text-ink"
              : "bg-marine/10 text-marine"
          }`}
        >
          {status}
        </span>
        <p className="font-medium text-ink tabular-nums">{value}</p>
      </div>
    </li>
  );
}

function Doc({
  title,
  date,
  size,
}: {
  title: string;
  date: string;
  size: string;
}) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-rule bg-surface px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-mute">
          {date}
          {size !== "—" ? ` · ${size}` : ""}
        </p>
      </div>
      <span className="text-xs font-medium text-mute">View</span>
    </li>
  );
}

function Owner({
  initials,
  prof,
  badge,
  lead,
}: {
  initials: string;
  prof: string;
  badge?: string;
  lead?: boolean;
}) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-rule bg-surface p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marine/10 font-display text-base text-marine">
        {initials}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink">{initials}</p>
          {lead && <span className="text-xs text-marine">★ Lead</span>}
          {badge && (
            <span className="rounded-full bg-cream-2 px-2 py-0.5 text-[10px] text-ink-soft">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-mute">{prof}</p>
      </div>
    </li>
  );
}

function SettingCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-base text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{desc}</p>
      <button className="mt-4 text-xs font-medium text-marine hover:text-marine-deep">
        Manage →
      </button>
    </div>
  );
}
