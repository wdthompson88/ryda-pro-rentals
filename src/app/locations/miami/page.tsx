import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HiddenWhenAuthed } from "@/components/auth-aware";
import { SITE_URL } from "@/lib/site-url";

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
// inventory in src/lib/partner-fleet.ts.
//
// Three later corrections, all of them deletions:
//
//   1. Fleet-wide statistics are out of copy by operator decision. The
//      stat band (cars listed / vehicle categories / cars RYDA owns)
//      and the "N cars, one request away" close both counted the
//      fleet, so both are gone, along with the PARTNER_VEHICLES import
//      that fed them. Per-listing rates on /rent and /rent/[symbol]
//      are unaffected — this rule is about aggregates.
//   2. "Vetted" is defined in exactly one place, on /trust-and-safety,
//      and every use of the word has to route the reader there. Neither
//      use on this page could (one was a meta description, one was a
//      plain string prop), so both were deleted rather than linked.
//   3. The grid is not exotics-only and there is not a roster of
//      operators, so copy here says neither. Phrasing is per listing —
//      "the operator who runs that car" — which stays true whether the
//      platform has one operator or twenty.
//
// Operators are never named on this page (D6).

export const metadata = {
  title: "Miami",
  description:
    "Rental cars in Miami, everyday to exotic, listed by the independent operator who owns and runs each one. Send your dates — no card at request.",
  alternates: { canonical: `${SITE_URL}/locations/miami` },
};

export default function MiamiPage() {
  // SEO: a single Place node describing the Miami market for Google's
  // knowledge graph.
  //
  // The second node that used to sit beside it — an Organization with
  // "@id": SITE_URL and areaServed Miami / Miami Beach / Coral Gables /
  // Coconut Grove / Miami-Dade — is deleted, for two reasons. It was a
  // duplicate: layout.tsx already emits an Organization on every page,
  // under a different @id ("#organization"), so this one published a
  // second, competing RYDA entity. And its areaServed re-added exactly
  // the false coverage layout.tsx had stripped out: four named
  // localities, none of which has a listing of its own. Coverage claims
  // follow the inventory, and the inventory's market field is the
  // literal type "Miami".
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
    // Machine-readable, so it carries the same two corrections the
    // prose does: not exotics-only, and no plural roster of operators.
    description:
      "A listing platform for car rentals in Miami-Dade: each vehicle is owned, insured and operated by the independent operator who lists it, and RYDA passes rental requests on to them.",
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

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(placeJsonLd).replace(/</g, "\\u003c"),
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
              href="/#how-it-works"
              className="text-sm font-medium text-ink underline-offset-4 hover:text-red hover:underline"
            >
              How it works →
            </Link>
          </div>
        </div>
      </section>

      {/* The stat band that used to sit here — cars listed in Miami,
          vehicle categories, cars RYDA owns — is deleted. Every figure
          in it was a fleet-wide aggregate, and aggregates are out of
          copy. */}

      {/* What RYDA does here. Two paragraphs are missing from this
          section on purpose. The first argued that Miami is full of
          exotic-car fleets whose sites are tiring to compare, which is
          both exotics-only framing and a claim about a market RYDA has
          not surveyed; the second said RYDA started here because it
          "found the most of them" and listed "local operators we
          vetted". One operator is on the platform. Both are gone; what
          is left is the part that describes the actual arrangement. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What RYDA does here
          </h2>
          <p className="mt-8 text-base leading-relaxed text-ink-soft">
            The operator sets the price and the terms, confirms whether
            the dates are free, and closes the rental on their own
            agreement and insurance. RYDA is paid by the operator, as a
            referral commission — never as a markup on what you pay.
          </p>
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
          {/* "The same four things are true of every car on this page,
              whichever operator runs it" is deleted: "whichever"
              implies a roster to choose between. The four cards say
              what they say without a preamble. */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              title="A request, not a booking"
              body="Sending your dates reserves nothing and takes no card. Availability and the final price come from the operator who runs the car."
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
          {/* Was "{FLEET_COUNT} cars, one request away." The count is a
              fleet-wide aggregate; the rest of the sentence is true on
              its own. */}
          <h2 className="mt-4 font-display text-4xl font-light sm:text-5xl">
            One request away.
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

// The Stat component went with the stat band it was written for.

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
