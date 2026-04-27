import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OrderPanel } from "@/components/order-panel";
import { PriceChart } from "@/components/price-chart";
import {
  VEHICLES,
  getVehicleBySymbol,
  formatUSD,
  changeFromPrev,
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
    title: `${v.name} — ${formatUSD(v.pricePerShare)} | RYDA Markets`,
    description: `Trade shares in the ${v.year} ${v.name}. Member-only secondary market with full transparency.`,
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

  const { diff, pct, isUp } = changeFromPrev(v.pricePerShare, v.prevClose);

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
            ← Markets
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left column — title + chart (price + change live inside the chart) */}
            <div className="lg:col-span-8">
              <h1 className="font-display text-4xl font-light text-ink sm:text-5xl">
                {v.name}
              </h1>
              <p className="mt-1 text-xs text-mute">
                {v.ticker} · {v.market} · {v.year} · {v.brand}
              </p>

              <div className="mt-6">
                <PriceChart vehicle={v} showHeader />
              </div>
            </div>

            {/* Right column — order panel */}
            <div className="lg:col-span-4">
              <OrderPanel vehicle={v} />
            </div>
          </div>
        </div>
      </section>

      {/* Sample holdings card (placeholder until auth ships) */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Your position</h2>
          <p className="mt-1 text-sm text-mute">
            Sample data — connect your account to see your real holdings.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Your market value" value={formatUSD(v.pricePerShare)} sub="1 share" />
            <Stat
              label="Today's return"
              value={`+${formatUSD(diff)}`}
              sub={`+${pct.toFixed(2)}%`}
              tone={isUp ? "up" : "down"}
            />
            <Stat
              label="Total return"
              value={`+${formatUSD(2_540)}`}
              sub="+4.69%"
              tone="up"
            />
            <Stat label="Average cost" value={formatUSD(54_127)} sub="1 share" />
          </div>
        </div>
      </section>

      {/* Vehicle facts (the "About QQQ" equivalent) */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">About this vehicle</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
            {v.description}
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            <Fact label="Vehicle price" value={formatUSD(v.fullPrice)} />
            <Fact label="Total shares" value={String(v.shares)} />
            <Fact label="Available" value={`${v.sharesAvailable} of ${v.shares}`} />
            <Fact label="Annual cost / share" value={formatUSD(v.annualOpCost)} />
            <Fact label="Days / year" value={`${v.daysPerYear}`} />
            <Fact label="Effective $/day" value={formatUSD(v.effectiveDailyCost)} />
          </dl>
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
            <Activity label="Member buy · Market" detail="Apr 24" amount={formatUSD(v.pricePerShare * 1)} sub="1 share at avg" />
            <Activity label="Member sell · Limit" detail="Apr 22" amount={formatUSD(v.prevClose * 1)} sub="1 share at limit" />
            <Activity label="Inspection report posted" detail="Apr 20" amount="—" sub="Mileage: 2,140 mi" />
            <Activity label="Member buy · Market" detail="Apr 18" amount={formatUSD(v.pricePerShare * 2)} sub="2 shares at avg" />
          </ul>
        </div>
      </section>

      {/* People also own */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Members also own</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {VEHICLES.filter((x) => x.symbol !== v.symbol).slice(0, 4).map((x) => {
              const c = changeFromPrev(x.pricePerShare, x.prevClose);
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
                  <p
                    className="mt-1 text-xs tabular-nums"
                    style={{ color: c.isUp ? "#00C805" : "#DC2626" }}
                  >
                    {c.isUp ? "▲" : "▼"} {c.pct.toFixed(2)}%
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section className="bg-ink py-12 text-cream/60">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs sm:px-10">
          All trading involves risk, including loss of principal. Past
          performance does not guarantee future results. RYDA shares are
          membership interests in single-purpose Delaware LLCs and are not
          registered securities. Settlement of accepted orders takes 1–3
          business days. Membership is limited to verified individuals 28 years
          or older. See full Securities Disclaimer (forthcoming).
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
    tone === "up" ? "text-[#00C805]" : tone === "down" ? "text-[#DC2626]" : "text-mute";
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink tabular-nums">{value}</p>
      {sub && <p className={`mt-1 text-xs tabular-nums ${subColor}`}>{sub}</p>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
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
