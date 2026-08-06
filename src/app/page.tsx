import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { RentalListings } from "@/components/rental-listings";

// Rental-first homepage (Aug 2026 pivot). Rentals are THE product; the
// old three-vertical splitter is retired from / (the splitter-intro
// component stays in the tree, unused, in case we resurrect it).
//
// Structure is deliberately Cars&Bids-inventory-first: a compact intro
// strip, then the full marketplace grid — the same merged partner +
// RYDA-fleet inventory /rent used to render. / is now the canonical
// home for the grid; /rent 308s here so old links and indexed pages
// consolidate onto one URL. /rent/[slug] detail pages are unaffected.
//
// Lead-gen model in one breath: browse → request with dates → a vetted
// Miami operator confirms and closes the rental on their own contract
// and insurance. Operators pay RYDA a referral commission on bookings
// we send them. We never name operators on listings.

export const metadata: Metadata = {
  title: "Rent Miami's most-wanted exotics",
  description:
    "Miami's most-wanted exotics. One request away. Browse the full fleet, send your dates, and a vetted Miami operator confirms directly with you. A 30-second account — no card, no payment through RYDA.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* Compact intro strip. One headline, one supporting sentence —
          the grid below is the hero, not this copy. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Exotic rentals · Miami
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-light leading-[1.05] text-ink sm:text-5xl">
            Miami&apos;s most-wanted exotics. One request away.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Pick a car, send your dates, and a vetted Miami operator
            confirms directly with you. A 30-second account — no card, no
            payment through RYDA — and your price is the operator&apos;s
            price.{" "}
            <Link
              href="/how-it-works"
              className="font-medium text-red hover:text-red-deep"
            >
              How it works →
            </Link>
          </p>
        </div>
      </section>

      {/* Full marketplace grid — merged partner + rental-available RYDA
          inventory, identical assembly to the old /rent page (the
          component owns the data merge; we just mount it). */}
      <section id="available" aria-label="Available rentals">
        <RentalListings />
      </section>

      {/* The model, compressed to one strip. Full narrative lives on
          /how-it-works; this is the 10-second version for scanners who
          made it past the grid. */}
      <section className="border-t border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-2xl text-ink">
            One request. A named operator. The keys.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <MiniStep
              n="01"
              title="Browse"
              body="Real, bookable inventory. Every listing is run by a vetted Miami operator — no brokers, no bait cars."
            />
            <MiniStep
              n="02"
              title="Request with dates"
              body="One request with your dates. A 30-second account keeps your details saved — no card, no payment through RYDA."
            />
            <MiniStep
              n="03"
              title="Take the keys"
              body="The operator confirms availability and price directly with you, on their own contract and insurance, and hands you the keys."
            />
          </div>
          <p className="mt-8 max-w-2xl text-xs leading-relaxed text-mute">
            Operators pay RYDA a referral commission on bookings we send
            them — that&apos;s the whole model. Inquiring through RYDA
            never costs you more than going direct.{" "}
            <Link
              href="/how-it-works"
              className="font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              Full details →
            </Link>
          </p>
        </div>
      </section>

      {/* Quiet co-ownership pointer. The program is parked, not dead —
          the only homepage reference is this one line. */}
      <section className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-3 px-6 py-10 sm:px-10">
          <p className="text-sm text-ink-soft">
            Looking for RYDA co-ownership? The program is parked while
            rentals take the road.
          </p>
          <Link
            href="/co-ownership"
            className="text-sm font-medium text-ink underline-offset-4 hover:text-red hover:underline"
          >
            Founding member waitlist — 2027 →
          </Link>
        </div>
      </section>
    </>
  );
}

function MiniStep({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="font-display text-2xl text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
