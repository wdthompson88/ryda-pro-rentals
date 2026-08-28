import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HeroSearch } from "@/components/hero-search";
import { Reveal, RevealStagger } from "@/components/reveal";
import { MarketplaceCard } from "@/components/marketplace-card";
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
// FOUR THINGS THIS PAGE MAY NOT SAY:
//
// 1. "Exotics" / "supercars" as the whole product. Only 6 of the 37
//    listings carry category "Exotic". The honest story is RANGE —
//    everyday cars through exotics — not a supercar showroom. Do not
//    swing to the opposite falsehood either: the Ferraris and
//    Lamborghinis are real.
// 2. That a request reaches the operator directly. It does not.
//    PARTNER_INQUIRY_EMAILS in src/lib/partner-contacts.ts is empty (its
//    one entry is commented out pending a signed referral agreement), so
//    every lead falls back to the RYDA team inbox and is passed on by
//    hand. "We pass your request to the operator" is the true sentence.
// 3. Any fleet-wide rate figure — a range, a median, an average, a
//    "from $X", a count of cars under some price. Deleted Aug 2026 and
//    not to be re-derived: those figures are out of the copy by
//    operator decision. The rate data itself is sound — see the note
//    above the constants below.
// 4. That the cars come from several operators. PartnerVehicle.partner
//    is the literal type "GM LUXE" — one operator runs all 37 — so a
//    plural supply side ("independent Miami operators") is a roster
//    claim, deleted rather than reworded.
//
// Every count and marque below is derived from PARTNER_VEHICLES at
// build time rather than typed in, so this page cannot advertise a car
// a visitor will not find on /rent.
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
// NO FLEET-WIDE RATE ARITHMETIC HERE. A rate range, a median, an
// "under $300" count or a "from $X" floor stays out of the copy by
// operator decision — NOT because the rates are wrong. An earlier note
// in this repo called the pricing data broken and quoted $1/day
// listings; that was a reading bug, not a data bug. partner-fleet.ts
// writes rates with JavaScript numeric separators (dailyRate: 1_403),
// and a regex matching [0-9]+ truncated them at the underscore. The
// rate table is correct as written, and any script that parses it has
// to handle the separators. Per-car rates on the cards below are the
// operator's own listed rate and stay; nothing aggregates them.

// og/twitter are declared here in full because Next merges metadata
// shallowly per top-level key. The root layout's card is rental-first
// too, but declaring these locally keeps the home page's social card
// pinned to the home page's own copy rather than inheriting whatever
// the layout says later.
const HOME_SOCIAL_DESCRIPTION =
  `Miami cars, everyday to exotic. ${FLEET_COUNT} listings. Pick a car, send your dates, and the operator confirms directly with you — no card at request.`;

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
            {/* "from independent Miami operators" is deleted, not
                reworded: PartnerVehicle.partner is the literal type
                "GM LUXE", so all {FLEET_COUNT} listings belong to ONE
                operator and the plural was a claim about a roster that
                does not exist. The rate range went with it (see the
                note above the constants). */}
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {FLEET_COUNT} cars. Pick one, send your dates, and we pass
              your request to the operator who runs it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/rent"
                className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
              >
                Browse the fleet
              </Link>
              <Link
                href="#how-it-works"
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
            {/* The H2 here was "The cars Miami asks for by name." —
                deleted. Nothing in this repo measures what Miami asks
                for; there is no demand signal, no search log and no
                booking history behind that sentence. The eyebrow above
                names the section factually and is enough.
                NOTE: tests/example.spec.ts:25 still asserts the deleted
                heading and will fail until that assertion is removed.

                The paragraph under it counterweighted the strip (which
                is the four dearest cars with photos) by naming the body
                types in the same grid. The category mix is real — 16
                SUV, 8 Convertible, 6 Exotic, 5 Sedan, 1 7-Seater, 1 EV
                — but the sentence ended in an "under $300 a day" count,
                a fleet-wide rate statistic. Those stay out by operator
                decision, not because the rates are wrong. The clause is
                gone. */}
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
              The same grid holds SUVs, sedans, convertibles, a seven-seater
              and an EV.
            </p>
          </Reveal>
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerMs={80}
          >
            {/* Grid takes the three cars AFTER the hero — FEATURED[0]
                already fills the hero image above. */}
            {FEATURED.slice(1, 4).map((v) => (
              <MarketplaceCard
                key={v.slug}
                vehicle={{
                  slug: v.slug,
                  make: v.make,
                  model: v.model,
                  year: v.year,
                  category: v.category,
                  dailyRate: v.dailyRate,
                  regularRate: v.regularRate,
                  market: v.market,
                  hero: getPartnerHero(v),
                  milesIncluded: v.milesIncluded,
                }}
              />
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
      {/* id="how-it-works" — the /how-it-works page was merged into this
          section (Aug 2026, one-page revamp): the header, footer and
          every other in-repo link to /how-it-works now points here, and
          next.config.ts 301-redirects the old URL to this anchor. */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-b border-rule bg-cream-2 py-16 md:py-24"
      >
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
              // "Every listing is real, bookable stock" is deleted:
              // nothing in this repo knows whether a car is free on any
              // date — the operator confirms availability, which the
              // third step says.
              body={`One grid, ${FLEET_COUNT} cars across ${MAKE_COUNT} makes — Toyota and Tesla through Land Rover and Porsche to Ferrari and Lamborghini.`}
            />
            <StepCard
              n="02"
              title="Request with dates"
              body="Pick your dates and send one request. A 30-second account keeps your details saved for next time — no card at request. Signed in, the form fills itself and your requests are tracked in one place."
            />
            <StepCard
              n="03"
              title="Operator confirms — and hands you the keys"
              body="Your request lands with RYDA, and we pass it to the operator who runs that car. They confirm availability and price, and close the rental on their own contract and insurance. Delivery, deposit, and mileage terms are theirs — agreed directly between you."
            />
          </RevealStagger>
        </div>
      </section>

      {/* ── The model — commission transparency. Formerly its own
             section on /how-it-works; merged here so the whole story
             (steps → money mechanics → trust) reads in one scroll. The
             payment-mechanism copy below ("collected as a platform
             fee") is compliance load-bearing — it is what keeps this
             page from ever implying RYDA holds or guarantees a
             payment; see tests/example.spec.ts. ─────────────────────── */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              The model
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink md:text-4xl">
              Operators pay RYDA a referral commission on bookings we
              send them — that&apos;s the whole model.
            </h2>
          </Reveal>
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-3"
            staggerMs={80}
          >
            {[
              {
                label: "Your price",
                value: "The operator's price",
                // No "no membership required" here: RYDA has no
                // membership, and denying one implies there is one.
                note: "Inquiring through RYDA never costs you more than going direct. No markup and no booking fee — you pay the rate the operator confirms.",
              },
              {
                label: "Who you rent from",
                value: "A Miami operator",
                note: "Listings stay unbranded.",
              },
              {
                label: "Where money moves",
                value: "Straight to the operator",
                // Must match what actually ships: no card at request,
                // but once the operator confirms, RYDA emails a Stripe
                // Checkout link created on the OPERATOR's own connected
                // account (fee-only direct charges — see 0041). Money
                // never enters a RYDA balance, but it IS a RYDA-sent
                // payment request, so "no payment through RYDA — ever"
                // reads as bait-and-switch when that email lands, and as
                // a phishing signal to everyone who believed it.
                note: "No card at request. Once the operator confirms your dates we send a secure Stripe link — the charge settles on the operator's own Stripe account, and RYDA's commission is collected as a platform fee on that charge.",
              },
            ].map((c) => (
              <div key={c.label} className="bg-surface p-6 sm:p-7">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                  {c.label}
                </p>
                <p className="mt-3 font-display text-xl leading-snug text-ink">
                  {c.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {c.note}
                </p>
              </div>
            ))}
          </RevealStagger>
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
          {/* A fourth pillar, "Vetted operators" — "an independent
              Miami operator we've vetted — real fleet, real garage" —
              is deleted whole. The only operator check this codebase
              performs is Stripe Connect onboarding of a business and a
              bank account. Nothing reads an insurance certificate,
              counts a fleet or inspects a garage, and /trust-and-safety
              says so in writing. Three pillars, three true ones. */}
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
            staggerMs={80}
          >
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

      {/* ── Why the account? — formerly its own section on
             /how-it-works; merged here as the last stop before the
             closing CTA. ─────────────────────────────────────────── */}
      <section className="border-b border-rule bg-cream-2 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                  Why the account?
                </p>
                <h2 className="mt-3 font-display text-3xl text-ink">
                  Thirty seconds, once.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                  A 30-second account keeps your details saved for next
                  time — no card at request. Your name and
                  contact autofill on every future request, and you can
                  see every inquiry you&apos;ve sent in one place. That&apos;s
                  it; there&apos;s nothing to subscribe to and nothing to
                  cancel.
                </p>
              </div>
              <div className="flex items-end lg:col-span-5">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
                  >
                    Create the account →
                  </Link>
                  <Link
                    href="/rent"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-rule bg-surface px-7 text-sm font-medium text-ink hover:border-ink"
                  >
                    Browse the fleet first
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
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
// Local components — the Featured fleet grid above uses MarketplaceCard
// (src/components/marketplace-card.tsx), the same card the /rent browse
// grid renders. One card shape for every car grid on the site.
// ─────────────────────────────────────────────────────────────────────────

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
