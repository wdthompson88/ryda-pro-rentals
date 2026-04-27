import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { VEHICLES, formatUSD, changeFromPrev } from "@/lib/market-data";

export const metadata = {
  title: "Portfolio — RYDA",
  description: "Your RYDA holdings, returns, and recent trades.",
};

// Sample portfolio for the demo phase.
const HOLDINGS = [
  { symbol: "F296", shares: 1, avgCost: 54_127 },
  { symbol: "MC75", shares: 1, avgCost: 60_900 },
];

export default function PortfolioPage() {
  const positions = HOLDINGS.map((h) => {
    const v = VEHICLES.find((vv) => vv.symbol === h.symbol)!;
    const value = v.pricePerShare * h.shares;
    const cost = h.avgCost * h.shares;
    const gain = value - cost;
    const gainPct = (gain / cost) * 100;
    const today = changeFromPrev(v.pricePerShare, v.prevClose);
    return { v, h, value, cost, gain, gainPct, today };
  });

  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalCost = positions.reduce((s, p) => s + p.cost, 0);
  const totalGain = totalValue - totalCost;
  const totalPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const todayGain = positions.reduce((s, p) => s + p.today.diff * p.h.shares, 0);
  const todayPct = totalValue > 0 ? (todayGain / totalValue) * 100 : 0;
  const isUpToday = todayGain >= 0;
  const isUpTotal = totalGain >= 0;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Portfolio
          </p>
          <h1 className="mt-4 font-display text-2xl text-ink">Total value</h1>
          <p className="mt-2 font-display text-5xl font-light text-ink tabular-nums sm:text-6xl">
            {formatUSD(totalValue)}
          </p>
          <p
            className="mt-2 text-base font-medium tabular-nums"
            style={{ color: isUpToday ? "#00C805" : "#DC2626" }}
          >
            {isUpToday ? "▲" : "▼"} {formatUSD(Math.abs(todayGain))} ({todayPct.toFixed(2)}%) Today
          </p>
          <p
            className="mt-1 text-sm tabular-nums"
            style={{ color: isUpTotal ? "#00C805" : "#DC2626" }}
          >
            {isUpTotal ? "▲" : "▼"} {formatUSD(Math.abs(totalGain))} ({totalPct.toFixed(2)}%) All-time
          </p>
        </div>
      </section>

      {/* Holdings table */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl text-ink">Holdings</h2>
            <p className="text-sm text-mute">{positions.length} positions</p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-rule bg-white">
            <table className="w-full">
              <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 text-left">Vehicle</th>
                  <th className="px-6 py-4 text-right">Shares</th>
                  <th className="hidden px-6 py-4 text-right md:table-cell">Avg cost</th>
                  <th className="px-6 py-4 text-right">Market price</th>
                  <th className="px-6 py-4 text-right">Today</th>
                  <th className="hidden px-6 py-4 text-right lg:table-cell">Value</th>
                  <th className="px-6 py-4 text-right">Total return</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.v.symbol}
                    className="border-b border-rule last:border-b-0 transition-colors hover:bg-cream-2/40"
                  >
                    <td className="px-6 py-5">
                      <Link href={`/markets/${p.v.symbol}`} className="block">
                        <p className="font-display text-base text-ink">{p.v.name}</p>
                        <p className="mt-1 text-xs text-mute">
                          {p.v.ticker} · {p.v.market}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-5 text-right text-ink tabular-nums">{p.h.shares}</td>
                    <td className="hidden px-6 py-5 text-right text-ink-soft tabular-nums md:table-cell">
                      {formatUSD(p.h.avgCost)}
                    </td>
                    <td className="px-6 py-5 text-right text-ink tabular-nums">
                      {formatUSD(p.v.pricePerShare)}
                    </td>
                    <td
                      className="px-6 py-5 text-right tabular-nums"
                      style={{ color: p.today.isUp ? "#00C805" : "#DC2626" }}
                    >
                      {p.today.isUp ? "▲" : "▼"} {p.today.pct.toFixed(2)}%
                    </td>
                    <td className="hidden px-6 py-5 text-right text-ink tabular-nums lg:table-cell">
                      {formatUSD(p.value)}
                    </td>
                    <td
                      className="px-6 py-5 text-right tabular-nums"
                      style={{ color: p.gain >= 0 ? "#00C805" : "#DC2626" }}
                    >
                      {p.gain >= 0 ? "+" : "-"}{formatUSD(Math.abs(p.gain))}
                      <span className="ml-2 text-xs">({p.gainPct.toFixed(2)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Buying power */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Card label="Buying power" value={formatUSD(354_445)} sub="Available" />
            <Card label="Cash on hand" value={formatUSD(123_405)} sub="Settled" />
            <Card label="Pending settlement" value={formatUSD(0)} sub="From recent sells" />
          </div>
        </div>
      </section>

      {/* Recent orders */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Recent orders</h2>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-white">
            <Order side="buy" vehicle="Ferrari 296 GTB" type="Market" date="Apr 24" amount={formatUSD(54_127)} sub="1 share" />
            <Order side="buy" vehicle="McLaren 750S Spider" type="Limit @ $60,900" date="Apr 18" amount={formatUSD(60_900)} sub="1 share" />
            <Order side="sell" vehicle="Lamborghini Aventador Ultimae" type="Market" date="Apr 12" amount={formatUSD(99_500)} sub="1 share" />
          </ul>
        </div>
      </section>

      {/* Footer disclaimer */}
      <section className="bg-ink py-12 text-cream/60">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs sm:px-10">
          Sample portfolio shown. Sign in to see your real holdings. RYDA
          shares are LLC membership interests; settlement takes 1–3 business
          days. Past performance does not guarantee future results.
        </div>
      </section>
    </>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-6">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

function Order({
  side,
  vehicle,
  type,
  date,
  amount,
  sub,
}: {
  side: "buy" | "sell";
  vehicle: string;
  type: string;
  date: string;
  amount: string;
  sub: string;
}) {
  const tone = side === "buy" ? "text-[#00C805]" : "text-[#DC2626]";
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">
          <span className={tone}>{side === "buy" ? "Buy" : "Sell"}</span> · {vehicle}
        </p>
        <p className="mt-0.5 text-xs text-mute">
          {type} · {date}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-ink tabular-nums">{amount}</p>
        <p className="mt-0.5 text-xs text-mute">{sub}</p>
      </div>
    </li>
  );
}
