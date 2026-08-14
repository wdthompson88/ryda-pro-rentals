import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

// Rental-only press page. The previous version was a fact sheet written
// to be quoted verbatim, and what it invited a journalist to quote was
// the co-ownership company: "daily supercar rentals + member-only
// fractional co-ownership", vehicles held in member-managed LLCs with
// RYDA hired as operations provider under an MSA, and an invented
// "~$221/day steady-state ops on a co-owned Ferrari". It also claimed a
// 2027 LA/NY footprint, a founding year, a funding stage, an eight-piece
// brand-asset library and a working relationship with national press.
//
// A fact sheet is the one surface where an invented fact travels
// furthest, so every line below is one this repo can substantiate:
//   - referral marketplace, owns/insures/operates nothing .. /legal/terms §2
//   - request takes no card, is not a booking .............. /legal/terms §5
//   - Checkout link on the operator's connected account,
//     commission as a platform fee ........................ /legal/terms §6,
//                                                            /trust-and-safety
//   - listings never name the operator (D6) ................ rowToRentalListing,
//                                                            customerEmailHtml
//   - Miami only ........................................... src/lib/partner-fleet
//   - RYDA LLC, Miami FL; press@ryda.pro ................... /legal/terms §14,
//                                                            /about
//
// There is no brand-asset library in this repo — the wordmark is type,
// not a logo file — so the asset grid is gone rather than restated as
// eight dashed placeholders promising files nobody can send. Do not add
// a founding year, a headcount, a funding stage, a market outside Miami
// or a customer-cost comparison without something in the code behind it.

// This page carries its own `description` deliberately. Next merges
// metadata per top-level key, so a page with no description inherits the
// root layout's — the consumer rental pitch, marques and all. Deleting a
// page description therefore removes nothing; it forwards whatever the
// root says. Both lines below are restatements of copy already on this
// page.
export const metadata = {
  title: "Press",
  description:
    "Fact sheet and press contact for RYDA, a referral marketplace for car rentals in Miami.",
  alternates: { canonical: "/press" },
};

export default function PressPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Press
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            What RYDA is, in the words{" "}
            <span className="italic">we&apos;d want quoted.</span>
          </h1>
          <p className="mt-8 text-base text-ink-soft">
            Press contact:{" "}
            <a
              href="mailto:press@ryda.pro"
              className="font-medium text-red hover:text-red-deep"
            >
              press@ryda.pro
            </a>
          </p>
        </div>
      </section>

      {/* Fact sheet */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Fact sheet
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            Quotable as written. If a line you need isn&apos;t here, it is
            because we can&apos;t substantiate it — ask us rather than
            estimating it.
          </p>
          <dl className="mt-10 space-y-5 text-sm">
            <Fact label="Legal entity" value="RYDA LLC" />
            <Fact label="Headquarters" value="Miami, FL" />
            <Fact
              label="What it is"
              value="A referral marketplace for car rentals."
            />
            <Fact
              label="Where it operates"
              value="Miami, FL. Every car on the platform is a Miami car."
            />
            <Fact
              label="The vehicles"
              value="Owned, garaged, insured and operated by independent local operators. RYDA owns none of them, and does not store, insure, maintain or operate any of them."
            />
            <Fact
              label="How a booking happens"
              value="A customer browses the grid and sends a request with dates. No card is taken at request and the request does not reserve the car. The operator confirms availability and the final price directly with the customer."
            />
            <Fact
              label="How payment works"
              value="Once the operator confirms, RYDA emails a Stripe Checkout link created on that operator's own connected Stripe account. The rental is paid to the operator; RYDA's commission is collected as a platform fee on the same charge."
            />
            <Fact
              label="How RYDA earns"
              value="A referral commission, agreed with the operator up front and charged to the operator. It is never added to the customer's price."
            />
            <Fact
              label="Whose contract"
              value="The operator's own rental agreement and insurance. RYDA is not a party to it, and deposits, cancellation, mileage and damage terms are the operator's."
            />
            <Fact
              label="Operator names"
              value="Listings don't name the operator. The operator introduces themselves when they confirm, before the customer is asked to pay anything."
            />
            <Fact
              label="Founders"
              value="Three co-founders. Names and biographies are on the About page."
            />
            <Fact label="Press contact" value="press@ryda.pro" />
          </dl>
        </div>
      </section>

      {/* What RYDA is not — the corrections most likely to be needed. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Common mix-ups
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
            Four things RYDA isn&apos;t.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="Not a rental company"
              body="RYDA holds no fleet, no rental agreement and no insurance policy. The operator holds all three, and the rental is a contract between the customer and them."
            />
            <Pillar
              title="Not a co-ownership programme"
              body="There are no shares, no vehicle LLCs, no membership tiers and nothing to buy into. Earlier descriptions of RYDA as fractional ownership describe a product this platform does not offer."
            />
            <Pillar
              title="Not an insurer or a broker"
              body="RYDA does not underwrite, place or verify any policy. Cover comes from the operator's own insurance under the operator's own agreement."
            />
            <Pillar
              title="Not a payment processor"
              body="Stripe is. RYDA sends one Checkout link, created on the operator's connected account, and its commission rides on that charge as a platform fee."
            />
          </div>
        </div>
      </section>

      {/* Images and marks — an honest statement of what we can clear,
          replacing an eight-tile grid of assets that do not exist. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Images and marks
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            There is no press kit.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              We would rather say that than publish a download page for
              files we don&apos;t have. The RYDA wordmark is set in type
              rather than drawn as a logo, and there is no asset library
              behind it yet.
            </p>
            <p>
              For anything else — the wordmark, a founder portrait, a
              detail you want to get right — write to{" "}
              <a
                href="mailto:press@ryda.pro"
                className="font-medium text-red hover:text-red-deep"
              >
                press@ryda.pro
              </a>{" "}
              with the publication and the intended use, and we will tell
              you plainly what we can and can&apos;t provide.
            </p>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Corrections and interviews
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            If something here is wrong, tell us.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            This page exists so a story about RYDA describes the business
            that actually ships. Corrections, interview requests and
            questions about how the model works all reach a person at the
            same address.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:press@ryda.pro"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              press@ryda.pro
            </a>
            <Link
              href="/contact?type=Press#form"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/5"
            >
              Send a press request
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-rule pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="text-sm leading-relaxed text-ink sm:max-w-md sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-rule pt-5">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
