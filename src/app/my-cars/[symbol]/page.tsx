import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { BookingTiersExplainer } from "@/components/booking-tiers-explainer";
import {
  VEHICLES,
  getVehicleBySymbol,
  formatUSD,
  BOOKING_POLICY,
} from "@/lib/market-data";

const OWNED = ["F296", "MC75"];

export async function generateStaticParams() {
  return OWNED.map((s) => ({ symbol: s.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  return { title: v ? `${v.name}, My Cars | RYDA` : "My Cars" };
}

export default async function MyVehiclePage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v || !OWNED.includes(v.symbol)) notFound();

  const isLead = v.symbol === "F296";

  return (
    <>
      <SiteHeader />
      <DemoBanner />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/my-cars"
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← My Cars
          </Link>
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-cream-2">
                <Image
                  src={v.hero}
                  alt={`${v.year} ${v.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className={`object-cover ${v.flipImage ? "-scale-x-100" : ""}`}
                  style={{ objectPosition: v.imagePosition ?? "center" }}
                />
              </div>
            </div>
            <div className="lg:col-span-5">
              <p className="text-xs text-mute">
                {v.brand} · {v.year} · {v.market}
              </p>
              <h1 className="mt-1 font-display text-4xl font-light text-ink sm:text-5xl">
                {v.name}
              </h1>
              {isLead && (
                <span className="mt-3 inline-block rounded-full bg-red px-3 py-1 text-xs font-medium text-cream">
                  ★ Proposal Coordinator
                </span>
              )}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <Stat label="Your shares" value={`1 of ${v.shares}`} />
                <Stat label="Status" value="In storage" />
                <Stat label="Days used (yr)" value={`8 / ${v.daysPerYear}`} />
                <Stat label="Miles used (yr)" value={`658 / ${v.milesPerYear.toLocaleString()}`} />
                <Stat
                  label="Planned reservations"
                  value={`1 of ${BOOKING_POLICY.planned.activeLimitPerShare} active`}
                />
                <Stat label="Short-notice" value="Open · book up to 7 days out" />
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/bookings/new"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
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
      <section className="sticky top-0 z-10 border-b border-rule bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 sm:px-10">
          {[
            ["Overview", "#overview"],
            ["Costs", "#costs"],
            ["Bookings", "#bookings"],
            ["Documents", "#documents"],
            ["Co-Owners", "#co-owners"],
            ["Vehicle Status", "#status"],
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
          <Card title="Your next booking" body="Apr 28 – May 1 · White-glove delivery confirmed" cta={["See booking", "/bookings"]} />
          <Card title="Group chat" body="2 new messages from co-owners. Mike posted about the August Pebble Beach trip." cta={["Open chat", "/messages"]} />
          <Card title="Latest inspection" body="Apr 20, 2026 · 2,140 mi · Condition: Excellent" cta={["View report", "#documents"]} />
        </div>
        <div className="mt-8">
          <h3 className="font-display text-lg text-ink">Recent activity</h3>
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Activity label="Booking confirmed" sub="Apr 28 – May 1" date="2 hr ago" />
            <Activity label="Inspection report posted" sub="2,140 mi · Excellent condition" date="1 day ago" />
            <Activity label="Message from a co-owner" sub='"Booked Pebble Beach hotels..."' date="2 days ago" />
            <Activity label="Q1 mgmt fee paid" sub="$1,700" date="3 days ago" />
          </ul>
        </div>
      </Section>

      {/* Costs */}
      <Section id="costs" title="Costs" alt>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BigStat label="Annual cost / share" value={formatUSD(v.annualOpCost)} sub="All-in" />
          <BigStat label="Effective $/day" value={formatUSD(v.effectiveDailyCost)} sub={`${v.daysPerYear} days/yr usage`} />
          <BigStat label="Maintenance reserve" value={formatUSD(8_400)} sub="LLC balance" />
        </div>
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink">Annual breakdown (your share)</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <Line label="Share buy-in (one-time)" value={formatUSD(v.pricePerShare)} note="Paid Mar 18, 2026" />
            <Line label="Management fee" value={formatUSD(6_800)} note="Billed quarterly" />
            <Line label="Insurance" value={formatUSD(3_200)} note="Annual" />
            <Line label="Maintenance reserve" value={formatUSD(1_800)} note="Held at LLC" />
            <Line label="Total annual" value={formatUSD(v.annualOpCost)} note="" emphasis />
          </ul>
        </div>
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink">Recent payments</h3>
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Pmt label="Q1 2026 management fee" value="$1,700" date="Apr 1" status="Paid" />
            <Pmt label="Annual insurance" value="$3,200" date="Mar 18" status="Paid" />
            <Pmt label="Co-ownership buy-in" value="$56,667" date="Mar 18" status="Paid" />
          </ul>
        </div>
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink">Upcoming charges</h3>
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Pmt label="Q2 2026 management fee" value="$1,700" date="Jul 1, 2026" status="Pending" />
          </ul>
        </div>
      </Section>

      {/* Bookings */}
      <Section id="bookings" title="Bookings">
        <div className="mb-6 flex items-end justify-between">
          <p className="text-sm text-ink-soft">Vehicle calendar, May 2026</p>
          <Link
            href="/bookings/new"
            className="rounded-full bg-red px-5 py-2 text-sm font-medium text-cream hover:bg-red-deep"
          >
            + Book time
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
          <div className="grid grid-cols-7 border-b border-rule text-xs font-medium uppercase tracking-wider text-mute">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-3 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => {
              const day = i - 4 + 1;
              const valid = day >= 1 && day <= 31;
              let badge: { color: string; label: string } | null = null;
              if (valid) {
                if (day === 12 || day === 13) badge = { color: "#DC4747", label: "You" };
                else if (day === 23 || day === 24 || day === 25) badge = { color: "#9A9590", label: "Other" };
                else if (day === 1) badge = { color: "#3A3A3E", label: "Service" };
              }
              return (
                <div
                  key={i}
                  className="aspect-square border-b border-r border-rule p-2 text-xs last:border-r-0 [&:nth-child(7n)]:border-r-0"
                >
                  {valid && <span className="text-ink-soft">{day}</span>}
                  {badge && (
                    <div className="mt-1">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-cream"
                        style={{ backgroundColor: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-6">
          <BookingTiersExplainer variant="compact" />
        </div>
      </Section>

      {/* Documents */}
      <Section id="documents" title="Documents" alt>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Doc title="Co-Owner Agreement" date="Mar 18, 2026" size="412 KB" />
          <Doc title="LLC Operating Agreement" date="Mar 12, 2026" size="891 KB" />
          <Doc title="Vehicle Title (RYDA Ferrari 296 GTB LLC)" date="Mar 12, 2026" size="148 KB" />
          <Doc title="Insurance Certificate (2026)" date="Mar 18, 2026" size="220 KB" />
          <Doc title="Inspection Report, Apr 20, 2026" date="Apr 20, 2026" size="2.1 MB" />
          <Doc title="Inspection Report, Mar 30, 2026" date="Mar 30, 2026" size="2.4 MB" />
          <Doc title="Service Records (Q1 2026)" date="Mar 25, 2026" size="356 KB" />
          <Doc title="Cost & Fee Schedule" date="Mar 12, 2026" size="98 KB" />
        </ul>
      </Section>

      {/* Co-Owners */}
      <Section id="co-owners" title="Co-Owners">
        <p className="text-sm text-ink-soft">
          {v.symbol === "F296" ? "5" : "3"} other co-owners in this vehicle. Names anonymized
          per Co-Owner Agreement.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Owner initials="RG" prof="Founder · Miami" badge="You" lead={isLead} />
          <Owner initials="ML" prof="Tech founder · Miami" />
          <Owner initials="SK" prof="Early member · LA" />
          <Owner initials="DM" prof="Real estate · NYC" />
          <Owner initials="JP" prof="Hospitality · Miami" />
          <Owner initials="TR" prof="Logistics · Miami" />
        </ul>
        <div className="mt-8 rounded-xl border border-rule bg-surface p-6">
          <p className="font-display text-base text-ink">Group chat</p>
          <p className="mt-2 text-sm text-ink-soft">
            5 unread messages · Last activity 12 min ago
          </p>
          <Link
            href="/messages"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-red"
          >
            Open chat →
          </Link>
        </div>
      </Section>

      {/* Vehicle Status */}
      <Section id="status" title="Vehicle Status" alt>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BigStat label="Current location" value="RYDA Miami" sub="Storage · climate-controlled" />
          <BigStat label="Mileage" value="2,140 mi" sub="As of Apr 20" />
          <BigStat label="Next service" value="In 1,860 mi" sub="At 4,000 mi" />
        </div>
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink">Service history</h3>
          <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Service date="Apr 20, 2026" what="Inspection + wash" notes="Excellent condition. Minor stone-chip on lower bumper noted." />
            <Service date="Mar 30, 2026" what="Intake inspection" notes="Vehicle accepted into RYDA fleet. 1,840 mi at intake." />
          </ul>
        </div>
      </Section>

      {/* Member proposals (Proposal Coordinator posts on behalf of co-owners) */}
      {isLead && (
        <Section id="settings" title="Member proposals · Proposal Coordinator">
          <p className="mb-6 inline-block rounded-full bg-red/10 px-3 py-1 text-xs font-medium text-red">
            ★ Proposal Coordinator, your role is to facilitate co-owner votes
          </p>
          <p className="mb-6 max-w-2xl text-sm text-ink-soft">
            As Proposal Coordinator you post proposals on behalf of the LLC's
            members. Material decisions, booking rules, vehicle
            modifications, transfers, document additions, go to a
            co-owner vote per the Operating Agreement. RYDA executes
            once the vote clears.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingCard
              title="Propose booking rules"
              desc="Submit a proposed change (max consecutive days, blackouts, buffer time) for co-owner vote."
            />
            <SettingCard
              title="Propose vehicle preferences"
              desc="Submit changes to fuel policy, or delivery defaults for co-owner vote."
            />
            <SettingCard
              title="LLC member register"
              desc="View current co-owners. Members signal intent to transfer their own share individually."
            />
            <SettingCard
              title="Post an update"
              desc="Send a vehicle update to all co-owners' activity feed (informational, no vote required)."
            />
            <SettingCard
              title="Upload document for review"
              desc="Add a doc to the vehicle's Documents tab. Required-reading flag goes to a co-owner vote."
            />
            <SettingCard
              title="Open a service request"
              desc="Flag a vehicle issue to RYDA, or escalate a co-owner conflict for mediation."
            />
          </div>
        </Section>
      )}

      <section className="bg-ink py-10 text-center text-cream/60">
        <p className="text-xs">
          Sample co-owner dashboard. Live operational data ships at Miami launch.
        </p>
      </section>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────

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
      <p className="mt-1 font-display text-base text-ink tabular-nums">{value}</p>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}

function Card({ title, body, cta }: { title: string; body: string; cta: [string, string] }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
      <Link href={cta[1]} className="mt-4 inline-block text-sm font-medium text-red hover:text-red-deep">
        {cta[0]} →
      </Link>
    </div>
  );
}

function Activity({ label, sub, date }: { label: string; sub: string; date: string }) {
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
              : "bg-red/10 text-red"
          }`}
        >
          {status}
        </span>
        <p className="font-medium text-ink tabular-nums">{value}</p>
      </div>
    </li>
  );
}

function Doc({ title, date, size }: { title: string; date: string; size: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-rule bg-surface px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-mute">
          {date} · {size}
        </p>
      </div>
      <span className="text-xs font-medium text-mute">Sample</span>
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red/10 font-display text-base text-red">
        {initials}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink">{initials}</p>
          {lead && <span className="text-xs text-red">★ Lead</span>}
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

function Service({
  date,
  what,
  notes,
}: {
  date: string;
  what: string;
  notes: string;
}) {
  return (
    <li className="px-5 py-4">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-base text-ink">{what}</p>
        <p className="text-xs text-mute">{date}</p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{notes}</p>
    </li>
  );
}

function SettingCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-base text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{desc}</p>
      <button className="mt-4 text-xs font-medium text-red hover:text-red-deep">
        Manage →
      </button>
    </div>
  );
}
