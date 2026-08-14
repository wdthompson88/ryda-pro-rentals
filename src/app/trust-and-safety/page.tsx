import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

// Rental Trust & Safety. The previous version of this page was written
// for co-owners — LLC titling, PPI reports, agreed-value policies, a
// 24/7 member line, and (on a rental-only site) "no rental" listed as a
// prohibited vehicle use. None of that exists in this product.
//
// The rule for every claim below: it has a referent in the codebase.
//   - operator review + approval status ....... partner_accounts (0042),
//                                               /admin/partners
//   - business + bank verification ............ Stripe Express onboarding;
//                                               partners.stripe_account_id /
//                                               stripe_onboarded_at (0041)
//   - "refused, not queued" ................... payment-link route 409s on
//                                               a paused or un-onboarded
//                                               operator
//   - one payment rail ........................ /api/admin/inquiries/[id]/
//                                               payment-link (Stripe
//                                               Checkout, direct charge)
//   - "rejected rather than marked paid" ...... connect-webhook's
//                                               connected-account check
//   - listings paused / off the grid .......... rental_listings.status (0044)
//   - the operator is not named ............... D6; rowToRentalListing and
//                                               customerEmailHtml both omit
//                                               the operator's identity
//
// Anything without a referent is stated as a LIMIT instead of a promise
// — see the "What we don't claim" section. Do not add background checks,
// vehicle inspections, insurance verification, or 24/7 support here
// unless something in the repo actually does them.
//
// "Vetted" is defined exactly once, in the #vetting section below. Any
// other use of the word on the site links there or drops the word.

export const metadata: Metadata = {
  title: "Trust & Safety",
  description:
    "What RYDA checks before an operator can list, how a rental payment actually moves, and where RYDA's responsibility ends and the operator's begins.",
  alternates: { canonical: "/trust-and-safety" },
};

export default function TrustAndSafetyPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Trust &amp; Safety
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            What RYDA checks, and where it stops.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Every car RYDA lists is owned and operated by an independent
            Miami operator. We review the operator, the payment runs on
            Stripe, and we keep the record. The car, the contract and the
            insurance are theirs.
          </p>
        </div>
      </section>

      {/* The D6 disclosure boundary, explained rather than glossed over.
          Listings genuinely do not carry the operator's identity —
          rowToRentalListing drops partner_id and the customer
          confirmation email never names them — so the honest thing is to
          say why, and to say what the rule does NOT do. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Who you&apos;re renting from
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Listings don&apos;t name the operator. That&apos;s deliberate.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              No listing here says which operator runs the car. It
              isn&apos;t coyness — the browse grid, the car page, the
              data behind them and the confirmation email you get all
              leave the operator&apos;s identity out on purpose.
            </p>
            <p>
              It is a disclosure rule, not a shield. It decides when you
              learn the operator&apos;s name, not whether you learn it —
              and it is no substitute for reading their rental agreement
              when it arrives, because that agreement is what governs the
              rental.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars grid */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <Pillar
              eyebrow="Operators"
              title="Reviewed before anything goes live"
              body="Listing with RYDA starts with an application — company, contact, phone, website, fleet size — that a person reviews. The status on that application is set by RYDA, not by the operator; an operator cannot put themselves live."
            />
            <Pillar
              eyebrow="Verification"
              title="Stripe verifies the business and the bank account"
              body="Approved operators complete Stripe Express onboarding, where Stripe checks their business details and the bank account payouts land in. Until that is finished RYDA's own system refuses to create a payment link for them — the attempt is rejected, not queued."
            />
            <Pillar
              eyebrow="Requests"
              title="No card at request"
              body="A request carries your name, your contact details and your dates. It takes no card, it is not a booking, and it does not reserve the car. Nothing is charged until you and the operator have agreed on the dates and the price."
            />
            <Pillar
              eyebrow="Payments"
              title="One rail, and it's Stripe"
              body="The only payment RYDA ever sends is a Stripe Checkout link, emailed after the operator confirms. The charge is created on the operator's own connected Stripe account, and RYDA's commission is collected as a platform fee on that same charge."
            />
            <Pillar
              eyebrow="Records"
              title="The booking is written down"
              body="RYDA keeps the request, the dates, the price the operator confirmed, the charge and the commission on it. We cannot decide a dispute between you and an operator, but we can produce what we hold."
            />
            <Pillar
              eyebrow="Enforcement"
              title="An operator can be switched off"
              body="An operator's account can be paused. While it is, no new payment link can be created for any of their cars, and their listings can be pulled from the browse grid. It is the one lever RYDA has, and it is a real one."
            />
          </div>
        </div>
      </section>

      {/* What the review actually is — and the SINGLE canonical
          definition of "vetted", at #vetting. The word had been stripped
          and reinstated four times because it was never defined
          anywhere; the ruling is that it stays, is defined here, and
          every other use on the site either links here or drops the
          word. Its scope is bounded by what the code does — Stripe
          Connect onboarding — so do not widen it with inspections,
          insurance checks, licence checks or background checks. */}
      <section id="vetting" className="scroll-mt-24 border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            The review
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What &ldquo;vetted&rdquo; actually means.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Where this site calls an operator vetted, it means one thing:
            the operator has completed Stripe Connect onboarding, which
            verifies their business details and the bank account their
            payouts reach. That is the whole of it. RYDA does not inspect
            the cars, verify anyone&apos;s insurance, check driving
            licences or run background checks. Until that onboarding is
            finished, RYDA&apos;s own system refuses to create a payment
            link for that operator — the attempt is rejected, not queued.
          </p>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Three other things stand between an operator&apos;s
            application and a car appearing on RYDA, and none of them is
            part of that word. The limits are further down this page,
            stated plainly.
          </p>
          <div className="mt-10 space-y-5">
            <Coverage
              line="A company, reviewed by a person"
              detail="An application carries the company name, the contact, a phone number, a website and a fleet size, and it is read one at a time rather than approved automatically. Under review, approved, paused: that status is RYDA's to set and RYDA's to withdraw."
            />
            <Coverage
              line="Listings set up with us, not uploaded"
              detail="Photos, specifications, pricing and availability are put together with the partnerships team rather than self-served. A car does not reach the browse grid without RYDA putting it there."
            />
            <Coverage
              line="A commission agreed before going live"
              detail="RYDA's referral commission is agreed with the operator up front and charged to the operator, as a fee on their own charge. It is never added to your price."
            />
          </div>
          <div className="mt-10 rounded-2xl border border-rule bg-cream-2 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-red">
              The same thing, in the language that governs it
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              The Terms of Service and the Platform Disclaimer describe
              this arrangement in binding terms, including where the
              review stops and what it does not warrant. If you only read
              one, read the disclaimer.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/legal/disclaimer"
                className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-red"
              >
                Platform Disclaimer →
              </Link>
              <Link
                href="/legal/terms"
                className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink hover:border-ink"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Payments — the anti-fraud section. RYDA has exactly one payment
          rail in code, which is what makes this statable. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Payments
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What a real RYDA payment request looks like.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            RYDA has one way of asking you for money, and it happens at
            one moment: after the operator has confirmed your dates and
            your price.
          </p>
          <div className="mt-8 space-y-5">
            <Coverage
              line="A Stripe Checkout link, by email"
              detail="It comes from RYDA once the operator has confirmed, and it opens Stripe's own hosted checkout page. That is the only payment RYDA sends. We don't take card numbers over the phone, and we don't ask for a wire, a bank transfer or a payment app."
            />
            <Coverage
              line="The charge lands on the operator's account"
              detail="Checkout is created on the operator's own connected Stripe account: the rental price is paid to them, and RYDA's commission is collected as a platform fee on the same charge. A payment is only ever matched to the operator whose link it was — one arriving from any other account is rejected rather than marked paid."
            />
            <Coverage
              line="Deposits and refunds belong to the operator"
              detail="A security deposit, a damage claim, a cancellation or a refund is handled by the operator under their rental agreement and from their own Stripe account. If the operator asks you for a deposit directly, that is theirs to arrange and it sits outside the RYDA link — ask them to put the terms in writing."
            />
          </div>
          <p className="mt-8 rounded-2xl border border-rule bg-surface p-6 text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">
              If something doesn&apos;t match:
            </span>{" "}
            a payment request that reaches you before an operator has
            confirmed your dates, or by any route other than a Stripe
            Checkout link, did not come from RYDA. Send it to us before
            you pay it.
          </p>
        </div>
      </section>

      {/* When something goes wrong */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            If something goes wrong
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Who to call, in order.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              n="01"
              title="Safety, then the report"
              body="After a collision, people come first and the police report comes second. The operator's insurer will want that report, and so will you."
            />
            <Step
              n="02"
              title="The operator"
              body="They hold the rental agreement, the insurance and the deposit. Breakdowns, damage, late returns, anything about the car — they are the counterparty on the rental, so they go first."
            />
            <Step
              n="03"
              title="Then tell RYDA"
              body="We hold the request, the dates, the confirmed price and the charge. Send us the booking and what happened; we'll provide those records and help where we reasonably can."
            />
            <Step
              n="04"
              title="What we can't do"
              body="RYDA is not a party to your rental agreement. We can't decide a dispute, order a refund or release a deposit — each of those runs through the operator and their own Stripe account."
            />
          </div>
          <p className="mt-12 max-w-2xl rounded-2xl border border-rule bg-surface p-6 text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">
              When the problem is the operator:
            </span>{" "}
            tell us anyway. A pattern of complaints is grounds for pausing
            an operator&apos;s account, and while it is paused no new
            payment link can be created for their cars. A complaint we
            never hear about cannot change anything.
          </p>
        </div>
      </section>

      {/* The limits. This is the section that keeps the rest of the page
          honest — every item here is something the codebase does NOT do.
          Deleting an item requires shipping the thing it denies. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Limits
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What we don&apos;t claim.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            A review is only worth anything if you know its edges. These
            are ours, and we would rather you read them here than
            discover them later.
          </p>
          <ul className="mt-10 space-y-4 text-base leading-relaxed text-ink-soft">
            <li>
              <span className="font-medium text-ink">
                We don&apos;t inspect the cars.
              </span>{" "}
              RYDA does not own, store, maintain or service any vehicle on
              this platform, and nobody from RYDA puts a car on a lift
              before it is listed. Condition is the operator&apos;s
              responsibility, and the handover is where you check it.
            </li>
            <li>
              <span className="font-medium text-ink">
                We don&apos;t verify insurance policies.
              </span>{" "}
              The rental closes on the operator&apos;s own insurance under
              their own agreement. RYDA is not an insurance broker and
              does not confirm any policy, its limits or its exclusions.
              Ask the operator for the certificate, and read what their
              agreement says about damage and deductibles.
            </li>
            <li>
              <span className="font-medium text-ink">
                We don&apos;t run driver background checks.
              </span>{" "}
              Eligibility to rent a particular car — minimum age, licence,
              proof of your own insurance, deposit — is set by the
              operator, not by RYDA, and it can differ between operators
              and between cars.
            </li>
            <li>
              <span className="font-medium text-ink">
                We aren&apos;t a party to the rental.
              </span>{" "}
              RYDA passes your request to the operator and sends the
              payment link once you both agree. The contract is between
              you and them, and it takes precedence on everything it
              covers: deposits, cancellation, mileage, fuel, additional
              drivers, damage.
            </li>
            <li>
              <span className="font-medium text-ink">
                We don&apos;t run a 24/7 line.
              </span>{" "}
              There is no RYDA roadside number and no replacement-vehicle
              guarantee from us. Roadside cover, if the rental has any,
              comes from the operator&apos;s agreement. Write to us and a
              person reads it — but mid-rental, the operator is the faster
              route.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA. Do not point this at /help — that tree is still the
          co-ownership help center (src/lib/help-content.ts: shares,
          membership, the portfolio), and it contradicts every claim on
          this page. The copy below splits questions into "for the
          operator" and "for us", so the primary is the channel that
          reaches us and the secondary is the rental FAQ. */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Ask before you book.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Questions about a car, a deposit or the insurance are for the
            operator when they reach out. Questions about how RYDA works,
            or about anything on this page, are for us.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/contact#form"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              Ask us a question →
            </Link>
            <Link
              href="/faq"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/5"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Pillar({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-red">
        {eyebrow}
      </p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Coverage({ line, detail }: { line: string; detail: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="font-display text-lg text-ink">{line}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

function Step({
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
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-2 font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
