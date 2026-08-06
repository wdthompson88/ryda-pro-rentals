import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BoatsListings } from "@/components/boats-listings";
import {
  BOATS,
  BOAT_MARKETS,
  formatUSD,
  type Boat,
  type BoatMarketKey,
} from "@/lib/boat-data";
import { PORTFOLIO_HERO } from "@/lib/boat-content";

export const metadata: Metadata = {
  title: "Boats Portfolio — Co-own a yacht in Miami",
  description:
    "The RYDA Boats portfolio. Member-managed LLCs hold each curated yacht; up to 5 verified members co-own every hull. Browse Miami today; LA + NY 2027.",
};

const FEATURED_SLUGS = ["wajer-55s", "pershing-6x", "riva-aquariva-super", "lagoon-50"];

export default function BoatsPortfolioPage() {
  const featured = FEATURED_SLUGS.map((s) => BOATS.find((b) => b.slug === s))
    .filter((b): b is Boat => b !== undefined);

  const marketKeys = Object.keys(BOAT_MARKETS) as BoatMarketKey[];

  return (
    <>
      <SiteHeader />

      {/* Cinematic portfolio hero */}
      <section className="relative isolate overflow-hidden border-b border-rule">
        <div className="absolute inset-0 -z-10">
          <Image
            src={BOAT_MARKETS.Miami.hero}
            alt="Yacht in Biscayne Bay"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/85"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-24 text-cream sm:px-10 sm:py-36">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-cream/80">
            {PORTFOLIO_HERO.eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
            {PORTFOLIO_HERO.headline.prefix}{" "}
            <span className="italic">{PORTFOLIO_HERO.headline.highlight}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-cream/85">
            {PORTFOLIO_HERO.subhead}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#featured"
              className="inline-flex h-12 items-center justify-center rounded-full bg-marine px-7 text-sm font-medium text-cream hover:bg-marine-deep"
            >
              See the fleet →
            </Link>
            <Link
              href="/boats/rent"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/40 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Charter instead
            </Link>
          </div>
        </div>
      </section>

      {/* Featured, four static cards */}
      <section id="featured" className="border-y border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                Featured
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Currently in the spotlight.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-ink-soft">
                The four flagship hulls in our Miami fleet. Each is also
                available by the day on the charter side.
              </p>
            </div>
            <Link
              href="/boats/rent"
              className="text-sm font-medium text-marine hover:text-marine-deep"
            >
              Charter the same hulls →
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((b) => (
              <FeaturedBoatCard key={b.slug} boat={b} />
            ))}
          </div>
        </div>
      </section>

      {/* By market */}
      <section id="markets" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            By market
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Miami today. LA and NY soon.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            We launch one market at a time. Miami runs Apr–Nov on water
            with a Dec–Mar haul-out. LA opens Q3 2027; NY opens Q2 2027.
          </p>

          <div className="mt-12 space-y-12">
            {marketKeys.map((key) => {
              const market = BOAT_MARKETS[key];
              const inMarket = BOATS.filter((b) => b.market === key);
              if (inMarket.length === 0 && market.status === "live") return null;
              return (
                <BoatMarketSection
                  key={key}
                  market={market}
                  boats={inMarket}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* All hulls, power-filter UI parallel to /portfolio's PortfolioListings.
          Search + brand/location/status/type filters + sort. Renders the
          same depth of card the cars portfolio does (BoatCard mirrors
          VehicleCard exactly). */}
      <section id="all" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Filter the full portfolio
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            All {BOATS.length} hulls.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            Search and filter by brand, market, status, or boat type.
            Useful when you know what you&apos;re after.
          </p>
        </div>
        <BoatsListings />
      </section>

      {/* Disclaimer */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-12 text-center text-xs text-mute sm:px-10">
          <p>
            RYDA Boats is a luxury access platform. Co-ownership stakes
            are membership interests in member-managed LLCs —
            not registered securities, not offered for investment
            purposes. See the{" "}
            <Link href="/legal/disclaimer" className="text-marine hover:text-marine-deep">
              Co-Ownership Disclaimer
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function BoatMarketSection({
  market,
  boats,
}: {
  market: (typeof BOAT_MARKETS)[BoatMarketKey];
  boats: Boat[];
}) {
  const isLive = market.status === "live";
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-rule">
        <div className="absolute inset-0 -z-10">
          <Image
            src={market.hero}
            alt={market.label}
            fill
            sizes="(min-width: 1280px) 1100px, 100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10"
          />
        </div>
        <div className="relative p-6 text-cream sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="font-display text-3xl italic sm:text-4xl">
              {market.label}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
                isLive
                  ? "bg-marine/95 text-cream"
                  : "border border-cream/40 text-cream/85"
              }`}
            >
              {isLive ? "Live" : `Coming ${market.launchLabel}`}
            </span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream/80">
            {market.blurb}
          </p>
        </div>
      </div>

      {boats.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boats.map((b) => (
            <Link
              key={b.slug}
              href={`/boats/portfolio/${b.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                <Image
                  src={b.hero}
                  alt={`${b.year} ${b.name}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
                    b.flipImage ? "-scale-x-100" : ""
                  }`}
                  style={{ objectPosition: b.imagePosition ?? "center" }}
                />
                <span
                  className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
                    b.sharesAvailable === 0
                      ? "bg-mute/90 text-cream"
                      : "bg-marine/95 text-cream"
                  }`}
                >
                  {b.sharesAvailable === 0
                    ? "Sold out"
                    : `${b.sharesAvailable} shares left`}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                  {b.brand} · {b.lengthFt}&apos; · {b.year}
                </p>
                <p className="mt-1 font-display text-lg italic text-ink">
                  {b.model}
                </p>
                <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
                  <p>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-mute">
                      Per share
                    </span>
                    <br />
                    <span className="font-display text-xl text-ink tabular-nums">
                      {formatUSD(b.pricePerShare)}
                    </span>
                  </p>
                  <span className="text-xs font-medium text-marine group-hover:text-marine-deep">
                    View →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-rule bg-surface p-10 text-center">
          <p className="font-display text-xl text-ink">
            Inventory in {market.label} ships with the local launch.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Want first-look access?{" "}
            <Link
              href={`/contact?type=Membership&note=${encodeURIComponent(`Want ${market.label} boats access`)}#form`}
              className="text-marine underline-offset-4 hover:underline"
            >
              Email us
            </Link>{" "}
            and we&apos;ll add you to the {market.label} waitlist.
          </p>
        </div>
      )}
    </div>
  );
}

function FeaturedBoatCard({ boat: b }: { boat: Boat }) {
  return (
    <Link
      href={`/boats/portfolio/${b.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-cream-2 transition-shadow hover:shadow-xl"
    >
      <Image
        src={b.hero}
        alt={`${b.year} ${b.name}`}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className={`object-cover transition-transform duration-700 group-hover:scale-[1.02] ${
          b.flipImage ? "-scale-x-100" : ""
        }`}
        style={{ objectPosition: b.imagePosition ?? "center" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20"
      />
      <span
        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
          b.sharesAvailable === 0 ? "bg-ink/80 text-cream" : "bg-marine/95 text-cream"
        }`}
      >
        {b.sharesAvailable === 0 ? "Sold out" : `${b.sharesAvailable} shares left`}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-5 text-cream sm:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cream/70">
          {b.market} · {b.lengthFt}&apos; · {b.year}
        </p>
        <h3 className="mt-2 font-display text-2xl italic font-light leading-tight sm:text-3xl">
          {b.brand}
        </h3>
        <p className="mt-1 font-display text-base text-cream/95">{b.model}</p>
        <div className="mt-4 flex items-baseline justify-between border-t border-cream/20 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-cream/75">
              Per share
            </p>
            <p className="font-display text-xl tabular-nums">
              {formatUSD(b.pricePerShare)}
            </p>
          </div>
          <span className="text-xs font-medium text-cream/90 transition-transform group-hover:translate-x-1">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
