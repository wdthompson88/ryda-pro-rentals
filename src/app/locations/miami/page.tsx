import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HiddenWhenAuthed } from "@/components/auth-aware";
import { SITE_URL } from "@/lib/site-url";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

// Miami market page, rewritten for the rental product (Aug 2026).
//
// What was here before described a different company: a Q3 2026
// pre-launch co-ownership market with "RYDA's flagship storage and
// handover hub", climate-controlled bays, 256 cameras, biometric
// access for RYDA staff, manufacturer-trained in-house technicians,
// white-glove handover, a five-item member event calendar and a
// "become a member / claim a share" close. RYDA owns no car, runs no
// facility, employs no technician and has no members, so every one of
// those was deleted rather than softened — the sections with no
// truthful rental equivalent are simply gone, not replaced with
// invented ones.
//
// Miami is live now, not launching: /rent renders the operator
// inventory in src/lib/partner-fleet.ts. The numbers in the stat band
// are computed from that array at build time so they cannot drift away
// from what a visitor can actually browse.
//
// Operators are never named on this page — "a vetted Miami operator",
// the same rule as every other customer-facing surface.

const MIAMI_VEHICLES = PARTNER_VEHICLES.filter((v) => v.market === "Miami");
const FLEET_COUNT = MIAMI_VEHICLES.length;
const CATEGORY_COUNT = new Set(MIAMI_VEHICLES.map((v) => v.category)).size;

export const metadata = {
  title: "Miami",
  description:
    "RYDA's live market. Exotic cars in Miami, listed by the independent operators who own and run them. Send your dates and a vetted Miami operator confirms directly with you — no card at request.",
  alternates: { canonical: `${SITE_URL}/locations/miami` },
};

export default function MiamiPage() {
  // SEO: Place + parent Organization JSON-LD describes the Miami market
  // for Google's knowledge graph.
  //
  // Still `Place` rather than `AutomotiveBusiness`, but for a different
  // reason than it used to be. The old comment said we would switch
  // once Miami shipped and we had "a public-facing partner facility
  // address to share". There is no such address and there never will
  // be: RYDA has no premises a customer can visit, and the cars are in
  // the operators' garages, not ours. LocalBusiness markup would claim
  // a storefront that does not exist. Address stays city-only for the
  // same reason; schema.org allows a partial PostalAddress.
  // The "<" -> "<" escape prevents script-context breakout.
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${SITE_URL}/locations/miami`,
    name: "RYDA Miami",
    description:
      "RYDA's live market. A listing platform for exotic-car rentals in Miami-Dade: the vehicles are owned, insured and operated by independent local operators, and RYDA passes booking requests to them.",
    url: `${SITE_URL}/locations/miami`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Miami",
      addressRegion: "FL",
      addressCountry: "US",
    },
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: "Miami-Dade County",
    },
  };
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": SITE_URL,
    name: "RYDA",
    url: SITE_URL,
    areaServed: [
      { "@type": "City", name: "Miami" },
      { "@type": "City", name: "Miami Beach" },
      { "@type": "City", name: "Coral Gables" },
      { "@type": "City", name: "Coconut Grove" },
      { "@type": "AdministrativeArea", name: "Miami-Dade County" },
    ],
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(placeJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Miami · Live
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            We start where the cars{" "}
            <span className="italic">already live.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Miami is RYDA&apos;s first market and, today, its only one.
            The cars are not ours: every listing belongs to an
            independent Miami operator who bought it, garages it and
            insures it. What RYDA does is put them in one grid, take
            your dates, and hand the request to the operator who runs
            that car.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/rent"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              Browse the Miami fleet
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-ink underline-offset-4 hover:text-red hover:underline"
            >
              How it works →
            </Link>
          </div>
        </div>
      </section>

      {/* What is actually here — every figure below is computed from the
          same inventory /rent renders, so nothing on this page can
          advertise a car a visitor cannot find. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <Stat number={String(FLEET_COUNT)} label="Cars listed in Miami" />
            <Stat number={String(CATEGORY_COUNT)} label="Vehicle categories" />
            <Stat number="0" label="Cars RYDA owns" />
          </div>
        </div>
      </section>

      {/* Why Miami */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Why Miami first
          </h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-soft">
            <p>
              Miami is not short of exotic cars for rent. It is short of
              one place to see them. The fleets here are independent
              businesses, their inventory lives across separate websites
              and social accounts, and comparing three of them means
              starting the same conversation three times.
            </p>
            <p>
              That is the problem RYDA exists to solve, and it is a
              problem you only have in a city with enough operators to
              make the search tiring. Miami is where we found the most
              of them, so it is where we started — with local operators
              we vetted, listing the cars they already rent out.
            </p>
            <p>
              Nothing about the arrangement makes the car ours. The
              operator sets the price and the terms, confirms whether
              the dates are free, and closes the rental on their own
              agreement and insurance. RYDA is paid by them, as a
              referral commission on the bookings we send — never as a
              markup on what you pay.
            </p>
          </div>
        </div>
      </section>

      {/* Renting here — the honest replacement for the old "Our Miami
          facility" block. Four cards, four things that are true of
          every Miami rental on this site. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Renting in Miami
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            The same four things are true of every car on this page,
            whichever operator runs it.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              title="A request, not a booking"
              body="Sending your dates reserves nothing and takes no card. A vetted Miami operator comes back to you with real availability and the final price."
            />
            <Feature
              title="Handover is the operator's"
              body="Where you collect the car, whether it can be delivered to you, the deposit and the mileage allowance are the operator's terms, agreed directly between you and them."
            />
            <Feature
              title="Their contract and insurance"
              body="The rental closes on the operator's own rental agreement and their coverage. RYDA is not a party to it, which is also why the operator, not RYDA, is the one who confirms it."
            />
            <Feature
              title="No RYDA garage"
              body="RYDA owns no vehicle and runs no storage, service or handover facility here or anywhere else. Every car sits in the garage of the operator who owns it."
            />
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="border-b border-rule bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Miami · Live now
          </p>
          <h2 className="mt-4 font-display text-4xl font-light sm:text-5xl">
            {FLEET_COUNT} cars, one request away.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Browse the Miami grid, send your dates, and let the operator
            take it from there. No card at request.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/rent"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream"
            >
              Browse the fleet →
            </Link>
            <HiddenWhenAuthed>
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream transition-colors hover:border-cream hover:bg-cream hover:text-ink"
              >
                Create an account
              </Link>
            </HiddenWhenAuthed>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-light text-ink tabular-nums sm:text-5xl">
        {number}
      </p>
      <p className="mt-2 text-xs uppercase tracking-wider text-mute">{label}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
