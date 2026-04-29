import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OrderPanel } from "@/components/order-panel";
import { CostBreakdown } from "@/components/cost-breakdown";
import {
  VEHICLES,
  getVehicleBySymbol,
  formatUSD,
  computeShareEconomics,
  HOLDING_YEARS,
} from "@/lib/market-data";

export async function generateStaticParams() {
  return VEHICLES.map((v) => ({ symbol: v.symbol.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) return { title: "RYDA Markets" };
  return {
    title: `${v.name} — ${formatUSD(v.pricePerShare)} per share | RYDA`,
    description: `Co-own a ${v.year} ${v.name}. ${v.sharesAvailable} of ${v.shares} member-managed LLC shares available.`,
  };
}

export default async function VehicleMarketPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) notFound();

  const econ = computeShareEconomics(v);

  return (
    <>
      <SiteHeader />

      {/* Top: title + chart on left, order panel on right */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/markets"
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← Fleet
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left column — title + chart (price + change live inside the chart) */}
            <div className="lg:col-span-8">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-cream-2">
                <Image
                  src={v.hero}
                  alt={`${v.year} ${v.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  className={`object-cover ${v.flipImage ? "-scale-x-100" : ""}`}
                  style={{ objectPosition: v.imagePosition ?? "center" }}
                />
              </div>

              <h1 className="mt-6 font-display text-4xl font-light text-ink sm:text-5xl">
                {v.name}
              </h1>
              <p className="mt-1 text-xs text-mute">
                {v.year} · {v.brand} · Stored in {v.market}
              </p>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft">
                {v.description}
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                <Fact label="Vehicle price" value={formatUSD(v.fullPrice)} />
                <Fact
                  label="Per share"
                  value={formatUSD(v.pricePerShare)}
                  sub={`Net ~${formatUSD(econ.netCost)} after ${HOLDING_YEARS}-yr sale`}
                />
                <Fact label="Total shares" value={String(v.shares)} />
                <Fact label="Days / share" value={`${v.daysPerYear}/yr`} />
                <Fact
                  label="Miles / share"
                  value={`${v.milesPerYear.toLocaleString()}/yr`}
                  sub="100 mi/day allowance"
                />
                <Fact label="Annual contribution" value={`${formatUSD(v.annualOpCost)} per share`} />
              </dl>
            </div>

            {/* Right column — order panel */}
            <div className="lg:col-span-4">
              <OrderPanel vehicle={v} />
            </div>
          </div>
        </div>
      </section>

      {/* Your share — sample co-ownership view */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Your share</h2>
          <p className="mt-1 text-sm text-mute">
            Sample co-ownership view — sign in to see your actual shares.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Shares held" value="1" sub={`of ${v.shares}`} />
            <Stat
              label="Days available"
              value={`${v.daysPerYear}`}
              sub="this year"
            />
            <Stat
              label="Miles available"
              value={(v.milesPerYear).toLocaleString()}
              sub="this year"
            />
            <Stat
              label="Annual cost"
              value={formatUSD(v.annualOpCost)}
              sub="all-in per share"
            />
          </div>
        </div>
      </section>

      {/* Two-year cost breakdown */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                What you actually pay
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                The {HOLDING_YEARS}-year math, in one box.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Each RYDA car is a curated CPO held for {HOLDING_YEARS} years.
                At exit, the LLC sells the vehicle and proceeds are
                distributed pro-rata to shareholders. We model a{" "}
                {econ.depreciationPct}% depreciation hit over the full hold
                — a bar that low-mileage, kept-condition CPO exotics often
                clear, but always verify with your own resale assumption.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Net result for one share of the {v.name}: roughly{" "}
                <span className="font-medium text-ink">
                  {formatUSD(econ.netCost)}
                </span>{" "}
                of true cost spread over {econ.totalDays} driving days — about{" "}
                <span className="font-medium text-ink">
                  {formatUSD(econ.netPerDay)}
                </span>{" "}
                per day actually behind the wheel.
              </p>
              <Link
                href="/compare#calculator"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink hover:border-ink"
              >
                Run your own numbers →
              </Link>
            </div>
            <div className="lg:col-span-7">
              <CostBreakdown vehicle={v} shares={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Specifications</h2>
          <dl className="mt-8 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            <Fact label="Engine" value={v.specs.engine} />
            <Fact label="Power" value={v.specs.power} />
            <Fact label="0–60 mph" value={v.specs.zeroToSixty} />
            <Fact label="Top speed" value={v.specs.topSpeed} />
            <Fact label="Transmission" value={v.specs.transmission} />
            <Fact label="Color" value={v.specs.color} />
          </dl>
        </div>
      </section>

      {/* Recent activity */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Recent activity</h2>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Activity label="New co-owner joined the LLC" detail="Apr 24" amount="—" sub="1 share" />
            <Activity label="Inspection report posted" detail="Apr 20" amount="—" sub="Mileage: 2,140 mi" />
            <Activity label="Share transferred to a new verified member" detail="Apr 22" amount="—" sub="1 share" />
            <Activity label="New co-owners joined the LLC" detail="Apr 18" amount="—" sub="2 shares" />
          </ul>
          <p className="mt-3 text-xs text-mute">
            Member-to-member transfer prices are private to the parties. RYDA
            does not publish a transfer-price ticker.
          </p>
        </div>
      </section>

      {/* People also own */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Other cars in the fleet</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {VEHICLES.filter((x) => x.symbol !== v.symbol).slice(0, 4).map((x) => {
              const xEcon = computeShareEconomics(x);
              return (
                <Link
                  key={x.symbol}
                  href={`/markets/${x.symbol}`}
                  className="block rounded-xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
                >
                  <p className="text-xs text-mute">{x.brand}</p>
                  <p className="mt-1 font-display text-base text-ink">{x.name}</p>
                  <p className="mt-3 font-display text-xl text-ink tabular-nums">
                    {formatUSD(x.pricePerShare)}
                  </p>
                  <p className="mt-1 text-xs text-mute">per share</p>
                  <p className="mt-2 text-[11px] text-red tabular-nums">
                    Net ~{formatUSD(xEcon.netCost)} after {HOLDING_YEARS} yrs
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pre-decision documents + call CTA */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Read before you wire
              </p>
              <p className="mt-3 font-display text-xl text-ink">
                Sample documents
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                We&apos;ll send you the LLC Operating Agreement, Management
                Services Agreement, sample PPI report, sample insurance
                certificate, and condition report — reviewable by your
                counsel before any commitment.
              </p>
              <Link
                href={`/contact?type=Membership&note=Sample%20documents%20for%20${v.symbol}#form`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
              >
                Request the packet →
              </Link>
            </div>
            <div className="rounded-2xl border border-rule bg-ink p-6 text-cream">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Talk to a founder
              </p>
              <p className="mt-3 font-display text-xl">
                Schedule a 30-minute call
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Real money, real conversation. We&apos;ll walk you through
                the LLC structure, insurance, the actual ownership process,
                and any questions your counsel raised. No commitment.
              </p>
              <Link
                href={`/contact?type=Membership&note=Schedule%20call%20about%20${v.symbol}#form`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-cream px-6 text-sm font-medium text-ink hover:bg-red hover:text-cream"
              >
                Schedule a call →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section className="bg-ink py-12 text-cream/60">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs sm:px-10">
          RYDA is a luxury access platform. Co-ownership stakes are LLC
          membership interests in member-managed Delaware LLCs and are
          not registered securities. They are not offered for investment
          purposes. Cars depreciate; shares are illiquid by design.
          Membership is limited to verified individuals 28 years or older.
          See the full Co-Ownership Disclaimer at /legal/disclaimer.
        </div>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const subColor =
    tone === "up" ? "text-red" : tone === "down" ? "text-red" : "text-mute";
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink tabular-nums">{value}</p>
      {sub && <p className={`mt-1 text-xs tabular-nums ${subColor}`}>{sub}</p>}
    </div>
  );
}

function Fact({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
      {sub ? <dd className="mt-0.5 text-[11px] text-red">{sub}</dd> : null}
    </div>
  );
}

function Activity({
  label,
  detail,
  amount,
  sub,
}: {
  label: string;
  detail: string;
  amount: string;
  sub?: string;
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{detail}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-ink tabular-nums">{amount}</p>
        {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
      </div>
    </li>
  );
}
