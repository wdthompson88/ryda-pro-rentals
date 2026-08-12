import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import {
  RentalListings,
  RentalListingsFromUrl,
} from "@/components/rental-listings";

// /rent — the canonical browse page (founder decision, Aug 2026):
// "/" is a full landing page that tells the story; the car-browsing
// grid lives HERE and users click through to it. This page mounts the
// same merged partner + RYDA rentalAvailable inventory the homepage
// briefly hosted during the inventory-first experiment (the component
// owns the data merge; we just mount it). /rent/[slug] detail pages
// are unaffected.
//
// Lead-gen model in one breath: browse → request with dates → a vetted
// Miami operator confirms and closes the rental on their own contract
// and insurance. Operators pay RYDA a referral commission on bookings
// we send them. We never name operators on listings.

export const metadata: Metadata = {
  title: "Rent — browse the Miami fleet",
  description:
    "Browse every car on RYDA's Miami rental grid — Lamborghini, Ferrari, Rolls-Royce and the rest. Send your dates and a vetted Miami operator confirms directly with you. No card at request.",
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
            Every listing is real, bookable stock run by a vetted Miami
            operator. Send your dates and the operator confirms
            availability and price directly with you — no card at
            request.{" "}
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
          inventory. RentalListings owns the search/filter bar, the
          vehicle-count strip, and the card grid.

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
