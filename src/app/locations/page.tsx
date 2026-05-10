// /locations — index page listing the three RYDA markets.
//
// Previously a 404 (the sitemap pointed to /locations but no page
// existed at that route, only the per-market subpages). Per the
// business-readiness audit, links to /locations from search engines,
// shared URLs, and the sitemap.xml were dead.

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { MARKETS, type MarketKey } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Where RYDA operates. Miami launching Q3 2026, Los Angeles + New York 2027. Each market has its own fleet curation, storage partner, and member cohort.",
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
            Where RYDA operates
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Three markets.{" "}
            <span className="italic">One playbook.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Each market has its own fleet curation, storage partner,
            event calendar, and member cohort. Miami launches first;
            LA and NY follow in 2027 once the playbook is proven.
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
                          {m.launchLabel ?? "Coming soon"}
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
            We follow the cars, not the headcount.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            The three markets where America&apos;s exotic-car fleet
            already concentrates: Miami&apos;s F1 + Art Basel calendar,
            LA&apos;s canyon roads + Pebble axis, NY&apos;s Hamptons-
            and-back weekend pattern. Other cities follow once we
            have a 50-vehicle floor in each.
          </p>
        </div>
      </section>
    </>
  );
}
