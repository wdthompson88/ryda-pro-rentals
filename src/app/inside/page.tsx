// Public preview of the member experience. Lets prospective buyers see
// what they'll get post-purchase before they wire money. Shows mocked
// portfolio, booking calendar, vehicle telemetry, and document access
//, clearly labeled as sample data.

import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export const metadata = {
  title: "Inside RYDA — What members see",
  description:
    "A preview of the member experience: portfolio dashboard, booking calendar, telemetry, sample documents. Sample data, see what you get before you commit.",
};

export default function InsidePage() {
  // Mock holdings: 2 shares of F458, 2 shares of P911 (matches the
  // 2-share minimum doctrine that everywhere else on the site enforces).
  const f296 = VEHICLES.find((v) => v.symbol === "F458")!;
  const mc75 = VEHICLES.find((v) => v.symbol === "P911")!;
  const heldShares = 2;

  return (
    <>
      <SiteHeader />

      {/* Hero — brand voice harmonized to the editorial register
          used elsewhere on the site. Previous app-marketing tone
          ("upcoming member app") didn't match the considered
          luxury voice on /cars, /boats, /membership.
          UI/UX review Tier 2: copy register. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Inside RYDA · Sample data
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            What members{" "}
            <span className="italic">actually see.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Once your share is recorded, the rest of the site recedes.
            Your portfolio, your bookings, the documents that govern each
            LLC, the day-to-day of operating cars together — all in one
            place. Below is a preview, modeled with sample holdings, so
            you can see what arrives the day you join.
          </p>
        </div>
      </section>

      {/* Portfolio dashboard */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Portfolio dashboard
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
              Every share, every car, every reserve, at a glance.
            </h2>
            <p className="mt-3 max-w-2xl text-base text-ink-soft">
              Per-LLC view of your holdings. Buy-in paid, current modeled
              share value, days used vs. entitled, current odometer,
              next service date.
            </p>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="mt-10 overflow-hidden rounded-2xl border border-rule bg-surface shadow-sm">
              {/* App chrome */}
              <div className="flex items-center gap-2 border-b border-rule bg-cream-2 px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red/60" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-mute/60" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-mute/40" aria-hidden />
                <p className="ml-3 text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                  ryda.pro · /account
                </p>
              </div>
              {/* Body */}
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
                <div className="border-b border-rule p-6 lg:border-b-0 lg:border-r">
                  <p className="text-xs uppercase tracking-wider text-mute">
                    Total invested
                  </p>
                  <p className="mt-2 font-display text-3xl text-ink tabular-nums">
                    {formatUSD((f296.pricePerShare + mc75.pricePerShare) * heldShares)}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Across {heldShares * 2} shares · 2 vehicles
                  </p>
                </div>
                <div className="border-b border-rule p-6 lg:border-b-0 lg:border-r">
                  <p className="text-xs uppercase tracking-wider text-mute">
                    Modeled share value
                  </p>
                  <p className="mt-2 font-display text-3xl text-success tabular-nums">
                    {formatUSD(
                      Math.round(
                        (f296.pricePerShare + mc75.pricePerShare) * heldShares * 0.95,
                      ),
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Year 1 · 5% paper depreciation modeled
                  </p>
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wider text-mute">
                    Days used (yr to date)
                  </p>
                  <p className="mt-2 font-display text-3xl text-ink tabular-nums">
                    14 / {(f296.daysPerYear + mc75.daysPerYear) * heldShares}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {(f296.daysPerYear + mc75.daysPerYear) * heldShares - 14} days remaining across both vehicles
                  </p>
                </div>
              </div>
              {/* Holdings list */}
              <div className="divide-y divide-rule border-t border-rule">
                {[f296, mc75].map((v) => (
                  <div
                    key={v.symbol}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                      <Image
                        src={v.hero}
                        alt={v.name}
                        fill
                        sizes="80px"
                        className={`object-cover ${v.flipImage ? "-scale-x-100" : ""}`}
                        style={{ objectPosition: v.imagePosition ?? "center" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base text-ink">
                        {v.name}
                      </p>
                      <p className="mt-0.5 text-xs text-mute">
                        {heldShares} of {v.shares} shares · {v.market}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-ink tabular-nums">
                        {formatUSD(v.pricePerShare * heldShares)}
                      </p>
                      <p className="text-[11px] text-ink-soft">held value</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Booking calendar */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <Reveal as="div" className="lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Booking calendar
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Reserve days, see who else has the car.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Live calendar across all your shares. See which days are
                yours, which are reserved by other co-owners, and which
                are open to claim. Multi-day blocks, peak-season caps,
                and service windows all visible.
              </p>
            </Reveal>
            <Reveal as="div" delayMs={120} className="lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-sm">
                <div className="border-b border-rule bg-cream-2 px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                    ryda.pro · /bookings · {f296.name}
                  </p>
                </div>
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-display text-xl text-ink">May 2026</p>
                    <div className="flex flex-wrap gap-2 text-xs text-mute">
                      <Legend color="bg-red" label="Yours" />
                      <Legend color="bg-mute/60" label="Other co-owner" />
                      <Legend color="border border-rule bg-cream-2" label="Open" />
                      <Legend color="bg-ink/30" label="Service" />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }, (_, i) => {
                      const day = i - 3; // start a few days before May 1
                      let bg = "bg-cream-2";
                      let textColor = "text-ink";
                      if (day < 1 || day > 31) {
                        bg = "bg-cream-2/40";
                        textColor = "text-mute";
                      } else if (day >= 8 && day <= 11) {
                        bg = "bg-red";
                        textColor = "text-cream";
                      } else if (
                        day === 4 ||
                        day === 5 ||
                        day === 17 ||
                        day === 18 ||
                        day === 22
                      ) {
                        bg = "bg-mute/60";
                        textColor = "text-cream";
                      } else if (day === 28) {
                        bg = "bg-ink/30";
                        textColor = "text-ink-soft";
                      }
                      return (
                        <div
                          key={i}
                          className={`flex aspect-square items-center justify-center rounded-md text-xs font-medium ${bg} ${textColor}`}
                        >
                          {day >= 1 && day <= 31 ? day : ""}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-mute">
                    May 8–11 reserved by you · 5 days reserved by other
                    members this month · service block May 28
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Vehicle telemetry + service */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <Reveal as="div" delayMs={120} className="order-2 lg:order-1 lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-sm">
                <div className="border-b border-rule bg-cream-2 px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                    ryda.pro · /my-cars/{f296.symbol.toLowerCase()}
                  </p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-rule sm:grid-cols-4">
                  <Stat
                    label="Current odometer"
                    value={f296.currentMiles.toLocaleString()}
                    sub="miles"
                  />
                  <Stat label="Next service" value="In 1,860" sub="miles" />
                  <Stat label="Last inspection" value="Apr 18" sub="passed" />
                  <Stat label="Tire wear" value="78%" sub="front · 84% rear" />
                </div>
                <div className="border-t border-rule p-6">
                  <p className="text-xs uppercase tracking-wider text-mute">
                    Recent activity
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between gap-4 text-ink-soft">
                      <span>Inspection report posted</span>
                      <span className="text-xs text-mute">Apr 18</span>
                    </li>
                    <li className="flex items-baseline justify-between gap-4 text-ink-soft">
                      <span>Member booking · 4 days · co-owner C</span>
                      <span className="text-xs text-mute">Apr 14–17</span>
                    </li>
                    <li className="flex items-baseline justify-between gap-4 text-ink-soft">
                      <span>Detail + photo log uploaded</span>
                      <span className="text-xs text-mute">Apr 12</span>
                    </li>
                    <li className="flex items-baseline justify-between gap-4 text-ink-soft">
                      <span>Insurance certificate renewed</span>
                      <span className="text-xs text-mute">Mar 30</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>
            <Reveal as="div" className="order-1 lg:order-2 lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Telemetry & service
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                The car&apos;s status, in real time.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Odometer, fluids, tire wear, last inspection date, next
                service window. Plus an event log of every booking,
                detail, and renewal, so you always know what&apos;s
                happening with the asset.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <Reveal as="div" className="lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Documents
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Every document, on demand.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Operating Agreement, Management Services Agreement,
                Pre-Purchase Inspection report, insurance certificate,
                title evidence, condition reports, every document the
                LLC holds, available to download in your portal.
              </p>
              <Link
                href="/sample-documents"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
              >
                View sample documents →
              </Link>
            </Reveal>
            <Reveal as="div" delayMs={120} className="lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-sm">
                <div className="border-b border-rule bg-cream-2 px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                    ryda.pro · /documents
                  </p>
                </div>
                <ul className="divide-y divide-rule">
                  {[
                    ["Operating Agreement", "F458 LLC", "v1.0 · Aug 2026", "PDF"],
                    ["Management Services Agreement", "F458 LLC", "v1.0 · Aug 2026", "PDF"],
                    ["Pre-Purchase Inspection Report", "F458 · 45,802 mi", "Aug 04", "PDF"],
                    ["Certificate of Insurance", "F458 LLC · Chubb", "Aug 10", "PDF"],
                    ["Title Evidence", "F458 LLC", "Aug 12", "PDF"],
                    ["Q1 Condition Report", "F458", "Sep 30", "PDF"],
                  ].map(([title, owner, date, type]) => (
                    <li key={title}>
                      <Link
                        href={`/sample-documents#${(title as string)
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "")}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-cream-2/40"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-2 text-[10px] font-bold uppercase tracking-wider text-mute">
                          {type}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">{title}</p>
                          <p className="text-[11px] text-mute">
                            {owner} · {date}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-red">
                          View sample →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Ready to see your real portfolio?
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Pick a car. Co-own it. Get a real key.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Same operations stack, same trust framework. The only thing
            that changes is the data goes from sample to yours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/markets"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See the fleet →
            </Link>
            <Link
              href="/contact?type=Membership#form"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Schedule a call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-5 py-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">
        {label}
      </p>
      <p className="mt-1 font-display text-xl text-ink tabular-nums">
        {value}
      </p>
      {sub ? <p className="text-[11px] text-ink-soft">{sub}</p> : null}
    </div>
  );
}
