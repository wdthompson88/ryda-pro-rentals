import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { InvestorInquiryForm } from "@/components/investor-inquiry-form";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

// /investors — a public investor contact surface, nothing more.
//
// The previous version described a different company: "a US
// member-managed supercar co-ownership platform, structured around real
// LLC ownership of real vehicles, with professional operations under a
// separate Management Services Agreement", launching Miami in Q3 2026.
// None of that is what this repo builds, and the launch date and round
// stage had no referent at all. The disclaimer footer likewise turned on
// co-ownership stakes, which do not exist here.
//
// Two rules for this page, both inherited:
//   1. The public surface carries the MODEL and nothing quantitative
//      beyond what the product itself shows. Round size, projections and
//      use of funds stay in the deck — a public raise number makes
//      prospective renters (who fund the actual revenue) read the
//      business as an experiment rather than an operator.
//   2. Every model claim matches /legal/terms and /trust-and-safety
//      word for word in substance: no card at request, the Checkout link
//      is created on the operator's connected account, the commission is
//      a platform fee on that charge, and RYDA owns no vehicle.
//
// The one figure on the page is the live fleet count, computed from the
// same array /rent renders, so it cannot drift away from what a visitor
// can actually count. Do not hardcode it, and do not add a second
// number.

const FLEET_COUNT = PARTNER_VEHICLES.length;

export const metadata = {
  title: "Investor inquiry",
  alternates: { canonical: "/investors" },
};

export default function InvestorsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Investors
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            A referral marketplace for{" "}
            <span className="italic">car rentals.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            RYDA owns no vehicles and carries no fleet.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
            The round, the numbers and the deck are not published on this
            page. Tell us who you are and the team will send them by
            email.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="#request-deck"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              Request the deck
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-ink underline-offset-4 hover:text-red hover:underline"
            >
              How the product works →
            </Link>
          </div>
        </div>
      </section>

      {/* The model — same four facts the customer-facing pages state,
          stated once for an investor audience. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            The model
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
            Demand routing, not asset ownership.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            <ModelCard
              label="What we list"
              value={`${FLEET_COUNT} cars in Miami`}
              note="Every one owned and operated by an independent local operator we've reviewed. The browse grid is the whole of the inventory — there is no second fleet behind it."
            />
            <ModelCard
              label="What we own"
              value="No vehicles"
              note="RYDA does not own, store, insure, maintain or operate any car on the platform. No acquisition capital, no garage, no residual exposure, no insurance book."
            />
            <ModelCard
              label="How a booking starts"
              value="A request, not a reservation"
              note="The customer sends dates. No card is taken and nothing is held. The operator confirms availability and the final price directly with them, on the operator's own contract and insurance."
            />
            <ModelCard
              label="How revenue is earned"
              value="A fee on the operator's charge"
              note="Once the operator confirms, RYDA emails a Stripe Checkout link created on that operator's connected account. The rental is paid to the operator; RYDA's commission is collected as a platform fee on the same charge, and is never added to the customer's price."
            />
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-ink-soft">
            The customer-facing description of the same mechanism is on{" "}
            <Link
              href="/how-it-works"
              className="font-medium text-red hover:text-red-deep"
            >
              How it works
            </Link>
            , and the binding version is in the{" "}
            <Link
              href="/legal/terms"
              className="font-medium text-red hover:text-red-deep"
            >
              Terms of Service
            </Link>
            . They say the same thing; if they ever don&apos;t, the Terms
            are the ones that count.
          </p>
        </div>
      </section>

      {/* Inquiry form */}
      <section id="request-deck" className="border-b border-rule">
        <div className="mx-auto max-w-2xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-mute">
            Request the deck
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Send a quick inquiry.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            Name, email, optional firm, anticipated check size. It is
            recorded and emailed to the team with your address on
            reply-to, and a person answers it.
          </p>
          <InvestorInquiryForm />
          <p className="mt-8 text-xs text-mute">
            By submitting, you agree the deck and any materials we send
            are confidential and not for distribution.
          </p>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-12 text-center text-xs leading-relaxed text-mute sm:px-10">
          <p>
            This page is provided for information only. It is not an offer
            to sell, or a solicitation of an offer to buy, any security.
          </p>
        </div>
      </section>
    </>
  );
}

function ModelCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="bg-surface p-6 sm:p-7">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        {label}
      </p>
      <p className="mt-3 font-display text-xl leading-snug text-ink">{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{note}</p>
    </div>
  );
}
