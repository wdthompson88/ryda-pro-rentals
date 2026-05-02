import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";

export const metadata = { title: "Bookings — RYDA" };

const UPCOMING = [
  { vehicle: "McLaren 750S Spider", dates: "May 12 – May 14", duration: "2 days", status: "Confirmed", handover: "Self-pickup · Miami facility", miles: "200 / day" },
  { vehicle: "Ferrari 296 GTB", dates: "Jun 5 – Jun 8", duration: "3 days", status: "Pending Proposal Coordinator", handover: "White-glove delivery", miles: "300 mi included" },
  { vehicle: "Ferrari 296 GTB", dates: "Jul 18 – Jul 21", duration: "3 days", status: "Confirmed", handover: "White-glove delivery", miles: "200 / day" },
];

const PAST = [
  { vehicle: "McLaren 750S Spider", dates: "Apr 8 – Apr 10", duration: "2 days", miles: "342" },
  { vehicle: "Ferrari 296 GTB", dates: "Mar 22 – Mar 25", duration: "3 days", miles: "478" },
  { vehicle: "Ferrari 296 GTB", dates: "Feb 14 – Feb 16", duration: "2 days", miles: "180" },
];

export default function BookingsPage() {
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
            Schedule across all your vehicles.
          </h1>
        </div>
      </section>

      {/* Entitlement bars */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">Your usage this year</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Entitlement
              vehicle="Ferrari 296 GTB"
              days={{ used: 8, total: 30 }}
              miles={{ used: 658, total: 3_000 }}
            />
            <Entitlement
              vehicle="McLaren 750S Spider"
              days={{ used: 6, total: 30 }}
              miles={{ used: 432, total: 3_000 }}
            />
          </div>
        </div>
      </section>

      {/* Action bar */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Tag active>All vehicles</Tag>
              <Tag>Ferrari 296</Tag>
              <Tag>McLaren 750S</Tag>
            </div>
            <Link
              href="/bookings/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              + Book time
            </Link>
          </div>
        </div>
      </section>

      {/* Calendar mock */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">May 2026</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="grid grid-cols-7 border-b border-rule text-xs font-medium uppercase tracking-wider text-mute">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-3 py-3 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }, (_, i) => {
                const dayNum = i - 4 + 1; // start month on Friday-ish
                const valid = dayNum >= 1 && dayNum <= 31;
                let badge: { color: string; label: string } | null = null;
                if (valid) {
                  if (dayNum === 12 || dayNum === 13) badge = { color: "#DC4747", label: "MC75" };
                  else if (dayNum >= 1 && dayNum <= 1) badge = { color: "#9A9590", label: "Other" };
                  else if (dayNum === 28 || dayNum === 29 || dayNum === 30) badge = { color: "#9A9590", label: "Other" };
                }
                return (
                  <div
                    key={i}
                    className="aspect-square border-b border-r border-rule p-2 text-xs last:border-r-0 [&:nth-child(7n)]:border-r-0"
                  >
                    {valid && <span className="text-ink-soft">{dayNum}</span>}
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
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-mute">
            <Legend color="#DC4747" label="Your booking" />
            <Legend color="#9A9590" label="Other co-owner" />
            <Legend color="#3A3A3E" label="Service / blackout" />
            <Legend color="transparent" border label="Available" />
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">Upcoming</h2>
          <ul className="mt-6 space-y-3">
            {UPCOMING.map((b, i) => (
              <li key={i} className="rounded-xl border border-rule bg-surface p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-lg text-ink">{b.vehicle}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      b.status === "Confirmed"
                        ? "bg-ink/5 text-ink"
                        : "bg-red/10 text-red"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <Field label="Dates" value={b.dates} />
                  <Field label="Duration" value={b.duration} />
                  <Field label="Handover" value={b.handover} />
                  <Field label="Mileage" value={b.miles} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Past */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-xl text-ink">Past trips</h2>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
            {PAST.map((p, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">{p.vehicle}</p>
                  <p className="mt-0.5 text-xs text-mute">{p.dates}</p>
                </div>
                <div className="text-right text-xs text-mute">
                  <p>{p.duration}</p>
                  <p className="mt-0.5 tabular-nums">{p.miles} mi</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer note */}
      <section className="bg-ink py-12 text-center text-cream/60">
        <p className="text-xs">
          Sample bookings dashboard. Live scheduling launches with the
          Miami market in Q3 2026.{" "}
          <Link href="/how-it-works" className="text-red hover:text-red-deep">
            How booking works →
          </Link>
        </p>
      </section>
    </>
  );
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
  const dPct = (days.used / days.total) * 100;
  const mPct = (miles.used / miles.total) * 100;
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
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Tag({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-ink text-cream" : "bg-surface text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Legend({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{
          backgroundColor: color,
          border: border ? "1px solid var(--ryda-rule)" : "none",
        }}
      />
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}
