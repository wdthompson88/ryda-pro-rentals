import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { MarketsListings } from "@/components/markets-listings";
import { OwnershipPrimitives } from "@/components/ownership-primitives";
import { BookingTiersExplainer } from "@/components/booking-tiers-explainer";
import {
  VEHICLES,
  MARKETS,
  formatUSD,
  type MarketKey,
  type Vehicle,
} from "@/lib/market-data";

export const metadata = {
  title: "RYDA Portfolio — Supercars co-owned in the US",
  description:
    "The RYDA portfolio. Member-managed LLCs hold each curated certified pre owned supercar; up to 5 verified members co-own every car. Browse Miami, Los Angeles, and New York.",
};

// Featured tile: 4 marquee positions, statically rendered (no carousel).
// The CEO didn't like the auto-advancing carousel — easier to scan four
// large cards in a single row than scroll through six. Fall back to the
// canonical fleet order if any of these symbols disappear from inventory.
const FEATURED_SYMBOLS = ["F296", "L780", "MC75", "AM-V"];

export default function MarketsPage() {
  const featured = FEATURED_SYMBOLS.map((s) =>
    VEHICLES.find((v) => v.symbol === s),
  ).filter((v): v is NonNullable<typeof v> => v !== undefined);

  const marketKeys = Object.keys(MARKETS) as MarketKey[];

  return (
    <>
      <SiteHeader />

      {/* Cinematic portfolio hero — full-bleed photo. The previous
          Unsplash ID rendered a Porsche Panamera at run time (not the
          McLaren that ID was supposed to be). Switched to the
          confirmed red Ferrari 296 photo, with a tighter
          `object-position` crop so it doesn't read as a duplicate of
          the same image used on the cars home hero. */}
      <section className="relative isolate overflow-hidden border-b border-rule">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85"
            alt="Red Ferrari 296 GTB"
            fill
            sizes="100vw"
            priority
            className="object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/85"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-24 text-cream sm:px-10 sm:py-36">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-cream/80">
            RYDA Portfolio
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
            The world&apos;s most coveted supercars,{" "}
            <span className="italic">co-owned in the US.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-cream/85">
            Each car is held in a member-managed LLC. Up to 10
            verified members co-own every vehicle. RYDA runs operations
            end-to-end. Two-year planned exit; transferable to other members
            after twelve months.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#featured"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              See featured vehicles →
            </Link>
            <Link
              href="#all"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/40 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Browse the full portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* Ownership primitives — six numbers above the fold for trust */}
      <OwnershipPrimitives variant="default" />

      {/* Featured — four static cards, no carousel. */}
      <section id="featured" className="border-y border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Featured
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Currently in the spotlight.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-ink-soft">
                The marquee positions across our active markets — the cars
                drawing the most member traffic this season.
              </p>
            </div>
            <Link
              href="#all"
              className="text-sm font-medium text-red hover:text-red-deep"
            >
              See all {VEHICLES.length} vehicles →
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v) => (
              <FeaturedCard key={v.symbol} vehicle={v} />
            ))}
          </div>
        </div>
      </section>

      {/* Markets — group cards by city Miami / LA / NY (Pacaso pattern) */}
      <section id="markets" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            By market
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Miami today. LA and NY soon.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            We launch one market at a time — concentration of fleet,
            partners, and ops talent matters more than spread. Miami is
            live. LA opens Q2 2027. NY opens Q4 2027.
          </p>

          <div className="mt-12 space-y-12">
            {marketKeys.map((key) => {
              const market = MARKETS[key];
              const inMarket = VEHICLES.filter((v) => v.market === key);
              if (inMarket.length === 0 && market.status === "live") return null;
              return (
                <MarketSection key={key} market={market} vehicles={inMarket} />
              );
            })}
          </div>
        </div>
      </section>

      {/* Booking model explainer — Pacaso SmartStay translation */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <BookingTiersExplainer variant="full" />
        </div>
      </section>

      {/* All vehicles — keep the existing power-filter UI for buyers
          who came to slice by spec rather than browse by city. */}
      <section id="all" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Filter the full portfolio
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            All {VEHICLES.length} vehicles.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            Search and filter by brand, market, status, cylinders, body
            style, or drivetrain. Useful when you know what you&apos;re
            after.
          </p>
        </div>
        <MarketsListings />
      </section>

      {/* Try before you buy — rentals teaser */}
      <section className="border-b border-rule bg-cream-2">
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
                    <Image
                      src={v.hero}
                      alt={`${v.year} ${v.name}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${v.flipImage ? "-scale-x-100" : ""}`}
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
      <section>
        <div className="mx-auto max-w-3xl px-6 py-12 text-center text-xs text-mute sm:px-10">
          <p>
            RYDA is a luxury access platform. Co-ownership stakes are
            membership interests in member-managed LLCs — not
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

function MarketSection({
  market,
  vehicles,
}: {
  market: (typeof MARKETS)[MarketKey];
  vehicles: (typeof VEHICLES)[number][];
}) {
  const isLive = market.status === "live";
  return (
    <div>
      {/* Market header card */}
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
                  ? "bg-red/95 text-cream"
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

      {/* Cards */}
      {vehicles.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Link
              key={v.symbol}
              href={
                isLive
                  ? `/markets/${v.symbol.toLowerCase()}`
                  : `/contact?type=Membership&note=${encodeURIComponent(
                      `${market.label} waitlist — interest in ${v.name}`,
                    )}#form`
              }
              className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                <Image
                  src={v.hero}
                  alt={`${v.year} ${v.name}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
                    v.flipImage ? "-scale-x-100" : ""
                  }`}
                  style={{ objectPosition: v.imagePosition ?? "center" }}
                />
                {/* Status pill — for live markets, surface real share counts;
                    for preview markets (LA, NY), make it explicit that the
                    vehicle is a preview and shares aren't open yet. */}
                <span
                  className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
                    !isLive
                      ? "border border-cream/40 bg-black/40 text-cream"
                      : v.sharesAvailable === 0
                        ? "bg-mute/90 text-cream"
                        : "bg-red/95 text-cream"
                  }`}
                >
                  {!isLive
                    ? `Preview · ${market.launchLabel ?? "soon"}`
                    : v.sharesAvailable === 0
                      ? "Sold out"
                      : `${v.sharesAvailable} shares left`}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                  {v.brand} · {v.year}
                </p>
                <p className="mt-1 font-display text-lg italic text-ink">
                  {v.name.replace(`${v.brand} `, "")}
                </p>
                <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
                  {isLive ? (
                    <p>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-mute">
                        Per share
                      </span>
                      <br />
                      <span className="font-display text-xl text-ink tabular-nums">
                        {formatUSD(v.pricePerShare)}
                      </span>
                    </p>
                  ) : (
                    <p>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-mute">
                        Pricing at launch
                      </span>
                      <br />
                      <span className="font-display text-sm text-ink-soft">
                        Notify me first
                      </span>
                    </p>
                  )}
                  <span className="text-xs font-medium text-red group-hover:text-red-deep">
                    {isLive ? "View →" : "Join waitlist →"}
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
            <Link href="/contact?type=Membership#form" className="text-red underline-offset-4 hover:underline">
              Email us
            </Link>{" "}
            and we&apos;ll add you to the {market.label} waitlist.
          </p>
        </div>
      )}
    </div>
  );
}

// Featured card — static, used in the four-up "Currently in the spotlight"
// row. Same aesthetic as the previous carousel cards (italic display
// brand naming, dark gradient overlay, status pill, per-share price)
// but without the snap-scroll / auto-advance.
function FeaturedCard({ vehicle: v }: { vehicle: Vehicle }) {
  return (
    <Link
      href={`/markets/${v.symbol.toLowerCase()}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-cream-2 transition-shadow hover:shadow-xl"
    >
      <Image
        src={v.hero}
        alt={`${v.year} ${v.name}`}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className={`object-cover transition-transform duration-700 group-hover:scale-[1.02] ${
          v.flipImage ? "-scale-x-100" : ""
        }`}
        style={{ objectPosition: v.imagePosition ?? "center" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
      />
      <span
        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
          v.sharesAvailable === 0
            ? "bg-mute/90 text-cream"
            : "bg-red/95 text-cream"
        }`}
      >
        {v.sharesAvailable === 0 ? "Sold out" : `${v.sharesAvailable} shares left`}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-5 text-cream sm:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cream/70">
          {v.market} · {v.year}
        </p>
        <h3 className="mt-2 font-display text-2xl italic font-light leading-tight sm:text-3xl">
          {v.brand}
        </h3>
        <p className="mt-1 font-display text-base text-cream/95">{v.name}</p>
        <div className="mt-4 flex items-baseline justify-between border-t border-cream/20 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-cream/55">
              Per share
            </p>
            <p className="font-display text-xl tabular-nums">
              {formatUSD(v.pricePerShare)}
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
