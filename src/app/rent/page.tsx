import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import {
  RentalListings,
  RentalListingsFromUrl,
} from "@/components/rental-listings";
import { formatUSD } from "@/lib/market-data";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

// /rent — the canonical browse page (founder decision, Aug 2026):
// "/" is a full landing page that tells the story; the car-browsing
// grid lives HERE and users click through to it. This page mounts the
// operator inventory the homepage briefly hosted during the
// inventory-first experiment (the component owns the data; we just
// mount it). /rent/[slug] detail pages are unaffected.
//
// Lead-gen model in one breath: browse → request with dates → RYDA
// passes the request to the operator who runs that car → the operator
// confirms and closes the rental on their own contract and insurance.
// Operators pay RYDA a referral commission on bookings we send them. We
// never name operators on listings.
//
// The intro copy describes the WHOLE grid, not the top of it. Six of
// the 37 listings are category "Exotic"; the rest are SUVs, sedans,
// convertibles, a seven-seater and an EV, and 21 of 37 are under $300 a
// day. Selling this page as an exotics grid describes a sixth of what
// renders below it. Numbers here are derived from PARTNER_VEHICLES so
// they cannot drift from the cards.

const FLEET_COUNT = PARTNER_VEHICLES.length;
const MAKE_COUNT = new Set(PARTNER_VEHICLES.map((v) => v.make)).size;
const RATES = PARTNER_VEHICLES.map((v) => v.dailyRate);
const MIN_RATE = Math.min(...RATES);
const MAX_RATE = Math.max(...RATES);

export const metadata: Metadata = {
  title: "Rent — browse the Miami fleet",
  description: `Browse every car on RYDA's Miami rental grid — ${FLEET_COUNT} listings across ${MAKE_COUNT} makes, ${formatUSD(MIN_RATE)} to ${formatUSD(MAX_RATE)} a day. SUVs, sedans, convertibles and an EV alongside the exotics. Send your dates and a vetted Miami operator confirms directly with you. No card at request.`,
  alternates: { canonical: "/rent" },
};

export default function RentPage() {
  // Deliberately NO searchParams prop here: searchParams is a
  // request-time API and awaiting it would silently flip this page —
  // the primary conversion surface, backed by fully static in-repo
  // inventory — from a static prerender to per-request dynamic
  // rendering. ?q= (landing-page hero search) is instead read
  // client-side by RentalListingsFromUrl inside the Suspense boundary
  // below, which keeps the route static.

  return (
    <>
      <SiteHeader />

      {/* Compact intro strip. One headline, one supporting sentence —
          the grid below is the point of this page, not the copy. */}
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            The fleet · Miami
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-light leading-[1.05] text-ink sm:text-5xl">
            Browse the fleet.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {FLEET_COUNT} cars across {MAKE_COUNT} makes — everyday cars
            through exotics, {formatUSD(MIN_RATE)} to {formatUSD(MAX_RATE)}{" "}
            a day. Every one is in Miami, and every one is real, bookable
            stock run by an independent operator we vet. Send your dates; we
            pass your request to the operator, who confirms availability and
            price directly with you. No card at request.{" "}
            <Link
              href="/how-it-works"
              className="font-medium text-red hover:text-red-deep"
            >
              How it works →
            </Link>
          </p>
        </div>
      </section>

      {/* Full marketplace grid — every operator listing. RentalListings
          owns the search/filter bar, the vehicle-count strip, and the
          card grid.

          useSearchParams suspends during prerender, so the unfiltered
          grid is the Suspense fallback: the static HTML ships the full
          inventory (SEO + no layout hole), and on hydration the
          URL-aware wrapper takes over, seeding ?q= and remounting the
          grid whenever the query in the URL changes. */}
      <section id="available" aria-label="Available rentals">
        <Suspense fallback={<RentalListings />}>
          <RentalListingsFromUrl />
        </Suspense>
      </section>
    </>
  );
}
