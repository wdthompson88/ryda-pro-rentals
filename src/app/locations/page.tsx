// /locations — index page listing the cities RYDA covers.
//
// Previously a 404 (the sitemap pointed to /locations but no page
// existed at that route, only the per-market subpages). Per the
// business-readiness audit, links to /locations from search engines,
// shared URLs, and the sitemap.xml were dead.
//
// Rental rewrite (Aug 2026): the old copy sold "fleet curation, storage
// partner, event calendar, and member cohort" per market and set a
// 50-vehicle floor for new cities. RYDA curates no fleet, contracts no
// storage partner and has no members, so all of it is gone. What a
// market means here is narrow and checkable: are there operator-listed
// cars in that city on this site, yes or no. Miami is yes; the other
// two are no, with no date attached to either.

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { MARKETS, type MarketKey } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Where RYDA lists cars. Miami is live — every listing owned and operated by an independent local operator. Los Angeles and New York have no operators listed yet.",
  alternates: { canonical: "/locations" },
};

const MARKET_ORDER: MarketKey[] = ["Miami", "Los Angeles", "New York"];

const SLUG: Record<MarketKey, string> = {
  Miami: "miami",
  "Los Angeles": "los-angeles",
  "New York": "new-york",
};

export default function LocationsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Where RYDA lists cars
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            One market live.{" "}
            <span className="italic">Two on the list.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            RYDA lists cars that independent operators own and run, which
            means a market only exists here once those operators do.
            Miami has them today. Los Angeles and New York are cities
            we want next, and nothing more than that yet — there is no
            date we could give you and mean.
          </p>
        </div>
      </section>

      {/* Market grid */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {MARKET_ORDER.map((key) => {
              const m = MARKETS[key];
              return (
                <Link
                  key={key}
                  href={`/locations/${SLUG[key]}`}
                  className="group relative block overflow-hidden rounded-2xl border border-rule bg-surface transition-shadow hover:shadow-lg"
                >
                  <div
                    className="aspect-[4/3] w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                    style={{ backgroundImage: `url(${m.hero})` }}
                  />
                  <div className="p-6 sm:p-7">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-2xl text-ink">
                        {m.label}
                      </p>
                      {m.status === "live" ? (
                        <span className="rounded-full bg-red/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-red">
                          Live
                        </span>
                      ) : (
                        <span className="rounded-full border border-rule bg-cream-2 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-mute">
                          No listings yet
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                      {m.blurb}
                    </p>
                    <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-red">
                      Open market →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why these three */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Why these three
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            We follow the operators, not the headcount.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            RYDA is only useful in a city that already has independent
            exotic fleets renting cars out — we are the front door to
            them, not a fleet of our own. Miami went first because that
            is where the operators we vetted are. Los Angeles and New
            York are next on the list for the same reason and no other:
            they are where we expect to find the next ones. A market
            goes live here when operators in it are listed, not on a
            quarter we picked in advance.
          </p>
        </div>
      </section>
    </>
  );
}
