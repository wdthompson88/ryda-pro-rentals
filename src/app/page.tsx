import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HeroSearch } from "@/components/hero-search";
import { Reveal, RevealStagger } from "@/components/reveal";
import { formatUSD } from "@/lib/market-data";
import {
  PARTNER_VEHICLES,
  getPartnerHero,
  type PartnerVehicle,
} from "@/lib/partner-fleet";

// Rental-first landing page (founder decision, Aug 2026): the homepage
// does NOT land straight in inventory. "/" tells the whole story —
// hero, featured fleet, how it works, straight answers, closing CTA —
// and the car-browsing grid lives at /rent, one click away.
//
// The model in one breath: browse → request with dates → RYDA passes
// the request to the operator who runs that car → the operator confirms
// and closes the rental on their own contract and insurance. Operators
// pay RYDA a referral commission on bookings we send them. Operators are
// never named publicly; they introduce themselves when they confirm.
//
// TWO THINGS THIS PAGE MAY NOT SAY, both fixed Aug 2026:
//
// 1. "Exotics" / "supercars" as the whole product. Only 6 of the 37
//    listings carry category "Exotic"; 21 are under $300/day and the
//    fleet runs from a Toyota Sienna to a Lamborghini Huracán STO. The
//    honest story is RANGE — everyday cars through exotics — not a
//    supercar showroom. Do not swing to the opposite falsehood either:
//    the Ferraris and Lamborghinis are real.
// 2. That a request reaches the operator directly. It does not.
//    PARTNER_INQUIRY_EMAILS in src/lib/partner-contacts.ts is empty (its
//    one entry is commented out pending a signed referral agreement), so
//    every lead falls back to the RYDA team inbox and is passed on by
//    hand. "We pass your request to the operator" is the true sentence.
//
// Every number and marque below is derived from PARTNER_VEHICLES at
// build time rather than typed in, so this page cannot advertise a car
// or a price a visitor will not find on /rent.
//
// Ownership-program content does not belong here, or anywhere in this
// repo — that product was removed in the rentals-first strip.

// ─────────────────────────────────────────────────────────────────────────
// Data — assembled at module scope (build time). The four highest daily
// rates in the Miami partner fleet that have a real hero photo: the top
// car takes the full-bleed hero, the next three fill the Featured-fleet
// grid. The hero car is deliberately EXCLUDED from the grid so the same
// photo never appears twice on the landing page.
// ─────────────────────────────────────────────────────────────────────────

const FEATURED: PartnerVehicle[] = [...PARTNER_VEHICLES]
  .filter((v) => v.market === "Miami" && Boolean(getPartnerHero(v)))
  .sort((a, b) => b.dailyRate - a.dailyRate)
  .slice(0, 4);

const HERO_CAR = FEATURED[0];
const HERO_PHOTO = HERO_CAR ? getPartnerHero(HERO_CAR) : undefined;

// Total browsable inventory. RYDA owns no cars, so this is exactly the
// partner fleet — the same list /rent renders. Advertising any other
// number here is advertising cars a visitor cannot find.
const FLEET_COUNT = PARTNER_VEHICLES.length;
const MAKE_COUNT = new Set(PARTNER_VEHICLES.map((v) => v.make)).size;
const RATES = PARTNER_VEHICLES.map((v) => v.dailyRate);
const MIN_RATE = Math.min(...RATES);
const MAX_RATE = Math.max(...RATES);
const RATE_RANGE = `${formatUSD(MIN_RATE)} to ${formatUSD(MAX_RATE)} a day`;
// Counterweight to the Featured strip, which is the four dearest cars
// with photos and therefore reads as a supercar showroom on its own.
const UNDER_300 = RATES.filter((r) => r < 300).length;

// og/twitter are declared here in full because Next merges metadata
// shallowly per top-level key. The root layout's card is rental-first
// too, but declaring these locally keeps the home page's social card
// pinned to the home page's own copy rather than inheriting whatever
// the layout says later.
const HOME_SOCIAL_DESCRIPTION =
  `Miami cars, everyday to exotic. ${FLEET_COUNT} listings from independent Miami operators, ${RATE_RANGE}. Pick a car, send your dates, and the operator confirms directly with you — no card at request.`;

export const metadata: Metadata = {
  title: "Rent a car in Miami — everyday to exotic",
  description: HOME_SOCIAL_DESCRIPTION,
  openGraph: {
    title: "RYDA — Rent a car in Miami, everyday to exotic",
    description: HOME_SOCIAL_DESCRIPTION,
    siteName: "RYDA",
    type: "website",
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Rent a car in Miami, everyday to exotic",
    description: HOME_SOCIAL_DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b border-rule bg-cream py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Car rental · Miami
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
              Miami cars, everyday to exotic. One request away.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {FLEET_COUNT} cars from independent Miami operators,{" "}
              {RATE_RANGE}. Pick one, send your dates, and we pass your
              request to the operator who runs it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/rent"
                className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
              >
                Browse the fleet
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-ink underline-offset-4 hover:text-red hover:underline"
              >
                How it works →
              </Link>
            </div>

            {/* Hero search — straight into /rent with ?q= applied. Sits
                between the CTA row and the hero image; max-w-xl keeps
                the composition balanced against the max-w-2xl copy. */}
            <div className="mt-6 max-w-xl">
              <HeroSearch />
            </div>
          </Reveal>

          {/* One strong image — the top car in the fleet, no video, no
              carousel. Links through to its detail page. */}
          {HERO_CAR && HERO_PHOTO ? (
            <Reveal delayMs={120}>
              <Link
                href={`/rent/${HERO_CAR.slug}`}
                className="group mt-12 block"
              >
                <div className="relative aspect-[16/9] w-full max-w-7xl overflow-hidden rounded-2xl border border-rule md:aspect-[21/9]">
                  <Image
                    src={HERO_PHOTO}
                    alt={`${HERO_CAR.make} ${HERO_CAR.model} — available to rent in ${HERO_CAR.market}`}
                    fill
                    priority
                    sizes="(min-width: 1280px) 1216px, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    unoptimized
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
                    {HERO_CAR.make} {HERO_CAR.model}
                  </span>
                </div>
                <p className="mt-3 text-xs text-mute">
                  {HERO_CAR.make} {HERO_CAR.model} ·{" "}
                  <span className="tabular-nums">
                    {formatUSD(HERO_CAR.dailyRate)}
                  </span>
                  /day in {HERO_CAR.market} —{" "}
                  <span className="font-medium text-red group-hover:text-red-deep">
                    view the car →
                  </span>
                </p>
              </Link>
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* ── Featured fleet ───────────────────────────────────────── */}
      <section className="border-b border-rule bg-cream py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Featured fleet
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl text-ink md:text-4xl">
              The cars Miami asks for by name.
            </h2>
            {/* The featured strip is the top of the fleet by daily rate,
                so it reads as a supercar showroom on its own. This line
                is what keeps the page honest about the other 30-odd
                cars: SUVs, sedans, convertibles, one seven-seater and
                one EV all sit in the same grid. */}
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
              These are the top of the range, not the whole of it. The same
              grid holds SUVs, sedans, convertibles, a seven-seater and an
              EV — {UNDER_300} of the {FLEET_COUNT} cars are under $300 a
              day.
            </p>
          </Reveal>
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerMs={80}
          >
            {/* Grid takes the three cars AFTER the hero — FEATURED[0]
                already fills the hero image above. */}
            {FEATURED.slice(1, 4).map((v) => (
              <FeaturedCard key={v.slug} vehicle={v} />
            ))}
          </RevealStagger>
          <Reveal delayMs={80}>
            <p className="mt-10">
              <Link
                href="/rent"
                className="text-sm font-medium text-red hover:text-red-deep"
              >
                View all {FLEET_COUNT} cars →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-b border-rule bg-cream-2 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl text-ink md:text-4xl">
              Three steps between you and the keys.
            </h2>
          </Reveal>
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerMs={80}
          >
            <StepCard
              n="01"
              title="Browse the fleet"
              body={`One grid, ${FLEET_COUNT} cars across ${MAKE_COUNT} makes — Toyota and Tesla through Land Rover and Porsche to Ferrari and Lamborghini. Every listing is real, bookable stock.`}
            />
            <StepCard
              n="02"
              title="Request your dates"
              body="A 30-second account saves your details for next time; no card at request."
            />
            <StepCard
              n="03"
              title="The operator confirms"
              body="We pass your request to the operator who runs that car. Availability, final price and keys come back directly from them — on their contract and insurance."
            />
          </RevealStagger>
          <Reveal delayMs={80}>
            <p className="mt-10">
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-red hover:text-red-deep"
              >
                The full picture →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Straight answers — deliberate dark island on bg-ink.
             Bright accents only here; standard `red` is tuned for
             cream and fails AA on ink. ─────────────────────────────── */}
      <section className="bg-ink py-16 text-cream md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
              Straight answers
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl md:text-4xl">
              What RYDA is — and what it isn&apos;t.
            </h2>
          </Reveal>
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
            staggerMs={80}
          >
            <InkPillar
              title="Vetted operators"
              body="Every car is run by an independent Miami operator we've vetted — real fleet, real garage. We pass your request on; they introduce themselves when they confirm."
            />
            <InkPillar
              title="Their contract & insurance"
              body="The rental closes on the operator's own agreement and coverage — the same terms you'd get going direct."
            />
            <InkPillar
              title="The operator's price"
              body="No markup, no booking fee. Requesting through RYDA never costs more than going direct."
            />
            <InkPillar
              title="No card at request"
              body="No card at request. Nothing is charged until you and the operator confirm the booking together."
            />
          </RevealStagger>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────── */}
      <section className="bg-cream py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <Reveal>
            <h2 className="font-display text-3xl font-light text-ink md:text-4xl">
              {FLEET_COUNT} cars, {RATE_RANGE}. One request between you and
              the keys.
            </h2>
            <Link
              href="/rent"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              Browse the fleet
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Local components — the featured cards are deliberately NOT the
// marketplace RentalCard: no savings badges, no ownership-program chrome,
// just photo · name · category · rate.
// ─────────────────────────────────────────────────────────────────────────

function FeaturedCard({ vehicle: v }: { vehicle: PartnerVehicle }) {
  const hero = getPartnerHero(v);
  return (
    <Link
      href={`/rent/${v.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {hero ? (
          <Image
            src={hero}
            alt={`${v.make} ${v.model}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            unoptimized
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
          {v.make}
        </p>
        <h3 className="mt-1 font-display text-xl leading-tight text-ink">
          {v.model}
        </h3>
        <p className="mt-1 text-xs text-mute">
          {v.category} · {v.market}
        </p>
        <div className="mt-4 flex items-end justify-between gap-4 border-t border-rule pt-4">
          <p className="font-display text-2xl text-ink tabular-nums">
            {formatUSD(v.dailyRate)}
            <span className="ml-1 text-sm text-mute">/day</span>
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red transition-colors group-hover:text-red-deep">
            View
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function StepCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-2xl text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function InkPillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-cream/20 pt-5">
      <p className="font-display text-lg text-cream">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-cream/70">{body}</p>
    </div>
  );
}
