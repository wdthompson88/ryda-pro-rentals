import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export const metadata = {
  title: "Markets — RYDA",
  description:
    "Browse the RYDA fleet. Each car is held in a member-managed Delaware LLC; claim a co-ownership seat alongside other verified members.",
};

export default function MarketsPage() {
  return (
    <>
      <SiteHeader />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            The fleet
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Co-own the world's most exceptional cars.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Claim a seat in any vehicle's Delaware LLC. Drive up to ~65 days
            a year. Transfer after the 12-month minimum hold.
          </p>
        </div>
      </section>

      {/* Fleet table */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
            <table className="w-full">
              <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 text-left">Vehicle</th>
                  <th className="px-6 py-4 text-right">Per seat</th>
                  <th className="hidden px-6 py-4 text-right lg:table-cell">Available</th>
                  <th className="hidden px-6 py-4 text-right lg:table-cell">Market</th>
                  <th className="px-6 py-4 text-right" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {VEHICLES.map((v) => (
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
                            className={`h-full w-full object-cover ${v.flipImage ? "-scale-x-100" : ""}`}
                            style={{ objectPosition: v.imagePosition ?? "center" }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-lg text-ink">{v.name}</p>
                          <p className="mt-1 text-xs text-mute">
                            {v.year} · {v.brand}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="font-medium text-ink tabular-nums">
                        {formatUSD(v.pricePerShare)}
                      </p>
                      <p className="mt-1 text-xs text-mute">per seat</p>
                    </td>
                    <td className="hidden px-6 py-5 text-right text-ink-soft lg:table-cell">
                      {v.sharesAvailable === 0 ? (
                        <span className="rounded-full bg-rule/40 px-3 py-1 text-xs font-medium text-mute">
                          Sold out
                        </span>
                      ) : (
                        <span className="text-sm">
                          {v.sharesAvailable} of {v.shares} seats
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
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
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
                      className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${v.flipImage ? "-scale-x-100" : ""}`}
                      style={{ objectPosition: v.imagePosition ?? "center" }}
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
        <div className="bg-cream-2 mx-auto max-w-3xl px-6 py-12 text-center text-xs text-mute sm:px-10">
          <p>
            RYDA is a luxury access platform. Co-ownership stakes are
            membership interests in member-managed Delaware LLCs — not
            registered securities, not offered for investment purposes.
            See the{" "}
            <Link href="/legal/disclaimer" className="text-red hover:text-red-deep">
              Co-Ownership Disclaimer
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
