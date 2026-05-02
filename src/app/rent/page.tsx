import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { RentalListings } from "@/components/rental-listings";
import { VEHICLES } from "@/lib/market-data";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

export const metadata = {
  title: "Rent — RYDA",
  description:
    "Rent a curated supercar by the day. Hand-prepared, fully insured, white-glove delivered. Miami · LA · NYC.",
};

export default function RentPage() {
  const totalRentals =
    VEHICLES.filter((v) => v.rentalAvailable).length + PARTNER_VEHICLES.length;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Try before you buy
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Drive it before you own a piece of it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Hand-prepared, fully insured, white-glove delivered. Some of
            these are also part of the RYDA co-ownership fleet, rent one
            for a weekend, claim a share if it fits.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#available"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              See {totalRentals} available cars →
            </Link>
          </div>
        </div>
      </section>

      {/* Unified rental grid, RYDA fleet + extended Miami inventory */}
      <section id="available">
        <RentalListings />
      </section>

      {/* What's included */}
      <section className="border-y border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-3xl text-ink">
            What every RYDA rental includes
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="Full insurance"
              body="$1M third-party liability. Agreed-value physical damage with a low deductible."
            />
            <Pillar
              title="White-glove handover"
              body="Vehicle delivered washed, fueled and prepped. Photo-documented condition both ways."
            />
            <Pillar
              title="24/7 roadside"
              body="Single number, single call. Replacement vehicle if anything goes wrong on the road."
            />
            <Pillar
              title="100 miles / day"
              body="Industry-standard included mileage. Overage at $4/mile."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Beyond the rental
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Renting is your test drive. Ownership is the relationship.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            The RYDA co-ownership fleet runs ~$236/day in steady-state
            ops on a Ferrari versus ~$2,400/day to rent it. RYDA holds
            each car for 2 years, then sells and distributes proceeds.
            That's where we want you to land.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            See the fleet →
          </Link>
        </div>
      </section>
    </>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
