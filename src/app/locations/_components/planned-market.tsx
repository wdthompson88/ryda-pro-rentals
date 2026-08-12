import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/site-url";

// Shared layout for a city RYDA does not list cars in yet.
//
// This replaces src/components/coming-soon-location.tsx for the two
// planned markets. That component could not be reused with honest
// props because the false claims were hardcoded in its body, not
// passed in: an "Inaugural fleet preview" of cars RYDA would own, a
// "final lineup confirmed with the local member cohort", a priority
// list where "early-member pricing will be locked for life", and a
// closing band announcing that "all RYDA operations launch in Miami in
// Q3 2026" — which is also wrong in the other direction, since Miami
// is live. There is no membership, no RYDA fleet and no pricing to
// lock, so the sections carrying those promises are gone rather than
// reworded, and the file lives under _components (a private folder,
// not a route) because it is only ever these two pages.
//
// What a planned market may say is narrow: no cars are listed here
// yet, here is why the city is on our list, and here is how to tell us
// you want it. No launch quarter — the ones that used to be printed
// here (Q1 2027 / Q3 2027) did not even agree with the ones in
// market-data.ts (Q2 2027 / Q4 2027), which is what an invented date
// looks like from the outside.
//
// The copy below states flatly that every listing on RYDA is a Miami
// car. That is true because PartnerVehicle.market is the literal type
// "Miami" — the inventory cannot currently hold anything else. If a
// second market ever ships, this file and MARKETS[...].status have to
// move together, and this page stops applying to that city entirely.

export function PlannedMarket({
  city,
  state,
  slug,
  whyParagraphs,
}: {
  city: string;
  state: string;
  slug: string;
  whyParagraphs: string[];
}) {
  // SEO: `Place`, never `AutomotiveBusiness` — there is no business to
  // visit in this city, and no vehicles listed in it. The
  // disambiguatingDescription says exactly that so a search snippet
  // cannot imply otherwise. The "<" -> "<" escape prevents
  // script-context breakout.
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${SITE_URL}/locations/${slug}`,
    name: `RYDA ${city}`,
    description: `A city RYDA plans to cover. No ${city} operators list vehicles on RYDA yet; the platform's listings are in Miami.`,
    disambiguatingDescription: `RYDA does not list any vehicles in ${city}.`,
    url: `${SITE_URL}/locations/${slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: state,
      addressCountry: "US",
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
            {city}, {state} · No listings yet
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {city} is{" "}
            <span className="italic">not live yet.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            There are no {city} cars on RYDA. Everything you can browse
            today is in Miami, listed by independent operators who own
            and run those cars. We would rather say that plainly than
            put a launch quarter on a page and hope.
          </p>
        </div>
      </section>

      {/* Why here */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Why {city} is on the list
          </h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-soft">
            {whyParagraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* What opening a market actually takes */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What has to happen first
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            RYDA owns no cars, so it cannot open a city by shipping any
            there. A market starts when operators in it are listed.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Card
              title={`Operators in ${city}`}
              body={`Independent fleets that already rent their own cars out, vetted the same way the Miami operators were. Until some are listed, there is nothing on this page to browse.`}
            />
            <Card
              title="The same terms as Miami"
              body="One grid, one request, your dates. No card at request, no markup on the operator's price, and the rental closing on the operator's own contract and insurance."
            />
            <Card
              title="Then the cars appear"
              body="New markets show up in the same place as everything else — the browse grid. There is no separate launch event to wait for and no list that unlocks it early."
            />
          </div>
        </div>
      </section>

      {/* Two ways to be useful about it */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">
                Want {city}?
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
                There is no priority list and nothing to hold. Telling us
                is still worth doing — where people ask for a market is
                part of how we decide where to look for operators next.
              </p>
              <Link
                href={`/contact?type=Other&note=${encodeURIComponent(
                  `Market request: ${city}`,
                )}`}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
              >
                Tell us you want {city} →
              </Link>
            </div>
            <div>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">
                Run a fleet here?
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
                {city} opens when {city} operators list on it. If you own
                and rent out exotic inventory in the city, that is the
                conversation we are actually looking for.
              </p>
              <Link
                href="/partners"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full border border-rule bg-surface px-7 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                For operators →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live today */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Live today
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            Miami is where the cars are.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Every listing on RYDA today is a Miami car, run by a vetted
            local operator. Browse it, send your dates, and the operator
            confirms directly with you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/rent"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream"
            >
              Browse the fleet →
            </Link>
            <Link
              href="/locations/miami"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream transition-colors hover:border-cream hover:bg-cream hover:text-ink"
            >
              See Miami
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
