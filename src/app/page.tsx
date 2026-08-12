import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HeroSearch } from "@/components/hero-search";
import { Reveal, RevealStagger } from "@/components/reveal";
import { VEHICLES, formatUSD } from "@/lib/market-data";
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
// The model in one breath: browse → request with dates → a vetted
// Miami operator confirms and closes the rental on their own contract
// and insurance. Operators pay RYDA a referral commission on bookings
// we send them. Operators are never named publicly; they introduce
// themselves when they confirm.
//
// Ownership-program content does not belong here, or anywhere in this
// repo — that product was removed in the rentals-first strip.

// og/twitter are declared here in full because Next merges metadata
// shallowly per top-level key. The root layout's card is rental-first
// too, but declaring these locally keeps the home page's social card
// pinned to the home page's own copy rather than inheriting whatever
// the layout says later.
const HOME_SOCIAL_DESCRIPTION =
  "Miami's most-wanted exotics. One request away. Pick a car, send your dates, and a vetted Miami operator confirms directly with you — no card at request.";

export const metadata: Metadata = {
  title: "Rent Miami's most-wanted exotics",
  description: HOME_SOCIAL_DESCRIPTION,
  openGraph: {
    title: "RYDA — Rent Miami's most-wanted exotics",
    description: HOME_SOCIAL_DESCRIPTION,
    siteName: "RYDA",
    type: "website",
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Rent Miami's most-wanted exotics",
    description: HOME_SOCIAL_DESCRIPTION,
  },
};

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

// Total browsable inventory: partner fleet + RYDA cars flagged
// rentalAvailable — the same merge /rent renders.
const FLEET_COUNT =
  PARTNER_VEHICLES.length + VEHICLES.filter((v) => v.rentalAvailable).length;

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b border-rule bg-cream py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Exotic rentals · Miami
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
              Miami&apos;s most-wanted exotics. One request away.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Pick a car, send your dates, and a vetted Miami operator
              confirms directly with you.
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
              body="One curated grid — Lamborghini, Ferrari, Rolls-Royce and the rest of Miami's most-wanted inventory. Every listing is real, bookable stock."
            />
            <StepCard
              n="02"
              title="Request your dates"
              body="A 30-second account saves your details for next time; no card at request."
            />
            <StepCard
              n="03"
              title="The operator confirms"
              body="Availability, final price, and keys, directly with you — on their contract and insurance."
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
              body="Every car is run by a Miami operator we've vetted — real fleet, real garage. They introduce themselves when they confirm."
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
              {FLEET_COUNT} cars. One request between you and the keys.
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
