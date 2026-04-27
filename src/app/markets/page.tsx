import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { VEHICLES, formatUSD, changeFromPrev } from "@/lib/market-data";

export const metadata = {
  title: "Markets — RYDA",
  description:
    "Live trading interface for RYDA supercar shares. Buy and sell ownership in curated luxury vehicles.",
};

export default function MarketsPage() {
  return (
    <>
      <SiteHeader />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Markets
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Trade shares in the world's most exclusive cars.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Each vehicle is a single-purpose Delaware LLC. Buy a share. Sell at
            any time after the 12-month minimum hold. Member-only secondary
            market with full price transparency.
          </p>
        </div>
      </section>

      {/* Market table */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
            <table className="w-full">
              <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 text-left">Vehicle</th>
                  <th className="px-6 py-4 text-right">Share price</th>
                  <th className="hidden px-6 py-4 text-right md:table-cell">Today</th>
                  <th className="hidden px-6 py-4 text-right lg:table-cell">Available</th>
                  <th className="hidden px-6 py-4 text-right lg:table-cell">Market</th>
                  <th className="px-6 py-4 text-right" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {VEHICLES.map((v) => {
                  const { diff, pct, isUp } = changeFromPrev(v.pricePerShare, v.prevClose);
                  const color = isUp ? "text-[#00C805]" : "text-[#DC2626]";
                  const arrow = isUp ? "▲" : "▼";
                  return (
                    <tr
                      key={v.symbol}
                      className="border-b border-rule transition-colors last:border-b-0 hover:bg-cream-2/40"
                    >
                      <td className="px-6 py-5">
                        <Link href={`/markets/${v.symbol}`} className="flex items-center gap-4">
                          <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-cream-2 sm:w-24">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={v.hero}
                              alt={v.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-lg text-ink">{v.name}</p>
                            <p className="mt-1 text-xs text-mute">
                              {v.ticker} · {v.year} · {v.brand}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="font-medium text-ink tabular-nums">
                          {formatUSD(v.pricePerShare)}
                        </p>
                      </td>
                      <td className={`hidden px-6 py-5 text-right tabular-nums md:table-cell ${color}`}>
                        {arrow} {formatUSD(Math.abs(diff))} ({pct.toFixed(2)}%)
                      </td>
                      <td className="hidden px-6 py-5 text-right text-ink-soft lg:table-cell">
                        {v.sharesAvailable === 0 ? (
                          <span className="rounded-full bg-rule/40 px-3 py-1 text-xs font-medium text-mute">
                            Sold out
                          </span>
                        ) : (
                          <span className="text-sm">
                            {v.sharesAvailable} of {v.shares}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-6 py-5 text-right text-sm text-ink-soft lg:table-cell">
                        {v.market}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/markets/${v.symbol}`}
                          className="text-sm font-medium text-red hover:text-red-deep"
                        >
                          Trade →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Try before you buy — small rentals teaser */}
      <section className="border-t border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Try before you buy
              </p>
              <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
                Rent any vehicle by the day.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-soft">
                Drive it first. Then decide if you want to own a piece.
                Members + prospective buyers welcome.
              </p>
            </div>
            <Link
              href="/rent"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
            >
              See all rentals →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VEHICLES.filter((v) => v.rentalAvailable)
              .slice(0, 4)
              .map((v) => (
                <Link
                  key={v.symbol}
                  href={`/rent/${v.symbol.toLowerCase()}`}
                  className="group block overflow-hidden rounded-xl border border-rule bg-surface transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.hero}
                      alt={v.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-mute">{v.brand}</p>
                    <p className="mt-1 font-display text-base text-ink">
                      {v.name}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <p>
                        <span className="font-display text-xl text-ink tabular-nums">
                          {formatUSD(v.rentalDailyRate)}
                        </span>
                        <span className="text-xs text-mute">/day</span>
                      </p>
                      <span className="text-xs font-medium text-red group-hover:text-red-deep">
                        Rent →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-12 text-center text-sm text-ink-soft sm:px-10">
          <p className="font-medium text-ink">A note on the trading interface.</p>
          <p className="mt-3">
            RYDA shares are LLC membership interests, not registered securities.
            Trades match against other verified members under member agreement;
            settlement is 1–3 business days. The price chart represents
            indicative valuations and recent member-to-member transactions.
          </p>
          <p className="mt-2 text-xs text-mute">
            Securities disclaimer forthcoming. Membership is gated by KYC and
            financial qualification.
          </p>
        </div>
      </section>
    </>
  );
}
