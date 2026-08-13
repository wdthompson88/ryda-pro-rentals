import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

// Rental-only sustainability page. The previous version was written for
// the co-ownership product and was built entirely out of numbers this
// repo cannot produce: "90% reduction in vehicles built", "~360 tons CO2
// avoided", "5x higher utilization", "0 idle storage acres", "150-250
// driven days vs 35". It also described RYDA facilities, RYDA vehicle
// transport, a 2027 hybrid/EV lineup chosen by member vote, and a
// carbon-offset programme. None of that exists.
//
// The replacement carries no statistics at all, and that is deliberate:
// a rental-flavoured substitute for a co-ownership statistic is still a
// fabricated statistic. RYDA measures requests, confirmed prices and
// charges — not mileage, fuel, or how many days a car is out — so there
// is no honest number to print here.
//
// Every claim below has a referent:
//   - owns/stores/insures/maintains/operates nothing .... /legal/terms §2
//   - one payment rail, on the operator's account ....... /legal/terms §6,
//                                                         /trust-and-safety
//   - the review covers company + Stripe verification ... partner_accounts,
//                                                         Stripe Express
//   - no offsets, no emissions data, no facilities ...... nothing in the
//                                                         repo does these
//
// Do not add an offset programme, a utilisation figure, an emissions
// estimate or a fleet-electrification roadmap to this page unless
// something in the codebase actually produces it.

export const metadata = {
  title: "Sustainability",
  description:
    "RYDA builds no cars and owns none. What a referral marketplace can honestly claim about its environmental footprint, and the figures we don't publish because we don't measure them.",
  alternates: { canonical: "/sustainability" },
};

export default function SustainabilityPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Sustainability
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            We don&apos;t build cars.{" "}
            <span className="italic">We don&apos;t own them either.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            RYDA is a referral marketplace. Every car listed here was
            already bought, insured and garaged by an independent Miami
            operator before we listed it. What RYDA adds is a way to find
            it.
          </p>
        </div>
      </section>

      {/* What the footprint actually is */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            The footprint
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            A listing grid, a request, an email.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              The honest version of this page is short, because the
              business is small in this direction. RYDA manufactures
              nothing and buys no vehicles. It runs no garage, no storage,
              no workshop and no transport. It does not own, store,
              insure, maintain or operate a single car on the platform —
              that is not a positioning line, it is what the Terms of
              Service commit us to.
            </p>
            <p>
              What the product physically consists of is a browse grid, a
              request form, an email to an operator, and a Stripe Checkout
              link created on that operator&apos;s own account once they
              confirm your dates. Everything with wheels, a roof or an
              insurance policy behind it belongs to somebody else.
            </p>
            <p>
              If RYDA does anything here at all, it is at the margin: it
              points demand at cars that already exist, and a car being
              rented is a car being used rather than sitting. That is the
              entire environmental argument for a referral marketplace —
              and it is an argument, not a measurement.
            </p>
          </div>
        </div>
      </section>

      {/* Limits. This section is what keeps the rest of the page honest:
          every item is something this repo does NOT do. Removing one
          requires shipping the thing it denies. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Limits
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What we don&apos;t claim.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            This page used to carry a row of statistics. They are gone,
            and nothing has replaced them, because we cannot stand behind
            a single one. Here is what is missing and why.
          </p>
          <ul className="mt-10 space-y-4 text-base leading-relaxed text-ink-soft">
            <li>
              <span className="font-medium text-ink">
                We don&apos;t publish emissions or utilisation figures.
              </span>{" "}
              RYDA records the request, the dates, the price the operator
              confirmed and the charge. It does not record mileage, fuel,
              or how many days a year a car is out — so there is no data
              set behind a number, and we would rather print none than
              print one we invented.
            </li>
            <li>
              <span className="font-medium text-ink">
                There is no carbon-offset programme.
              </span>{" "}
              Nothing at checkout offers one, and there is no offset
              partner. If that ever ships, you will meet it in the payment
              flow before you read about it here.
            </li>
            <li>
              <span className="font-medium text-ink">
                There are no RYDA facilities.
              </span>{" "}
              No storage, no climate-controlled garage, no renewable-energy
              supply to speak for, and no RYDA transport moving cars
              around. Where a car sleeps and how it reaches you are the
              operator&apos;s arrangements under the operator&apos;s
              rental agreement.
            </li>
            <li>
              <span className="font-medium text-ink">
                We don&apos;t vet operators on environmental grounds.
              </span>{" "}
              Our review covers the company and, through Stripe, its
              business and bank details. It does not look at how a
              building is powered or how a car is maintained, and we
              don&apos;t set an electrification target for fleets we
              don&apos;t own.
            </li>
            <li>
              <span className="font-medium text-ink">
                This is not a low-carbon product.
              </span>{" "}
              Renting a V12 for a weekend has a tailpipe, and no framing
              of shared use changes that. Directing existing demand at
              cars that already exist is the most this model can claim,
              and we are not going to dress it up as more.
            </li>
          </ul>
        </div>
      </section>

      {/* Closing — the same limits in the language that binds us. */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            The same thing, in binding terms
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Owning nothing is the whole model.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            The Terms of Service and the Platform Disclaimer say the same
            thing where it counts: RYDA does not own, store, insure,
            maintain or operate any vehicle listed here.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/trust-and-safety"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              What RYDA checks →
            </Link>
            <Link
              href="/legal/terms"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/5"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
