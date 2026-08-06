import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal, RevealStagger } from "@/components/reveal";

// Rental-first "How it works" (Aug 2026 pivot). The old co-ownership
// doctrine page (5-step lifecycle, exit doctrine, 4-way comparison)
// lives in git history; co-ownership itself is parked at /co-ownership.
//
// This page has one job: explain the lead-gen model honestly in under
// a minute — browse, request with dates, a vetted operator confirms and
// closes the rental on their own contract and insurance. RYDA earns a
// referral commission from the operator, never a markup from you.

export const metadata: Metadata = {
  title: "How it works",
  description:
    "One request. A named operator. The keys. Browse Miami's exotic rental fleet, request your dates, and a vetted operator confirms directly with you — on their contract, at their price. RYDA earns a referral commission from operators, never a markup from you.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              How it works · Exotic rentals · Miami
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
              One request. A named operator.{" "}
              <span className="italic">The keys.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              RYDA is the front door to Miami&apos;s exotic-rental fleets.
              You browse one curated grid, send one request with your
              dates, and the vetted operator who runs that car confirms
              availability and price directly with you — then closes the
              rental on their own contract and insurance.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Three steps */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <Reveal>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Three steps between you and the car.
            </h2>
          </Reveal>
          <RevealStagger
            className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-3"
            staggerMs={80}
          >
            <Step
              n="01"
              title="Browse"
              body="One grid, the whole fleet — Lamborghini, Ferrari, McLaren and the rest of Miami's most-wanted inventory. Every listing is real, bookable stock run by a vetted Miami operator. We don't put operator names on listings; we put cars."
            />
            <Step
              n="02"
              title="Request with dates"
              body="Pick your dates and send one request. A 30-second account keeps your details saved for next time — no card, no payment through RYDA. Signed in, the form fills itself and your requests are tracked in one place."
            />
            <Step
              n="03"
              title="Operator confirms — and hands you the keys"
              body="Your request goes straight to the operator who runs that car. They come back to you by name, confirm availability and price, and close the rental on their own contract and insurance. Delivery, deposit, and mileage terms are theirs — agreed directly between you."
            />
          </RevealStagger>
        </div>
      </section>

      {/* The model — commission transparency */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              The model
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
              Operators pay RYDA a referral commission on bookings we
              send them — that&apos;s the whole model.
            </h2>
          </Reveal>
          <RevealStagger
            className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-3"
            staggerMs={80}
          >
            {[
              {
                label: "Your price",
                value: "The operator's price",
                note: "Inquiring through RYDA never costs you more than going direct. No markup, no booking fee, no membership required to request.",
              },
              {
                label: "Who you rent from",
                value: "A vetted Miami operator",
                note: "We vet the operators behind every listing — real fleets, real insurance, real garages. Listings stay unbranded; the operator introduces themselves when they confirm.",
              },
              {
                label: "Where money moves",
                value: "Never through RYDA",
                note: "No card at request, no payment through RYDA — ever. You pay the operator on their contract, exactly as you would going direct.",
              },
            ].map((c) => (
              <div key={c.label} className="bg-surface p-6 sm:p-7">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                  {c.label}
                </p>
                <p className="mt-3 font-display text-xl leading-snug text-ink">
                  {c.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {c.note}
                </p>
              </div>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* Accounts note */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <Reveal>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                  Why the account?
                </p>
                <h2 className="mt-3 font-display text-3xl text-ink">
                  Thirty seconds, once.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                  A 30-second account keeps your details saved for next
                  time — no card, no payment through RYDA. Your name and
                  contact autofill on every future request, and you can
                  see every inquiry you&apos;ve sent in one place. That&apos;s
                  it; there&apos;s nothing to subscribe to and nothing to
                  cancel.
                </p>
              </div>
              <div className="flex items-end lg:col-span-5">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
                  >
                    Create the account →
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-rule bg-surface px-7 text-sm font-medium text-ink hover:border-ink"
                  >
                    Browse the fleet first
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA + parked co-ownership pointer */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          {/* Ink bands take the bright accent — standard `red` is tuned
              for cream and fails AA on bg-ink. */}
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Ready when you are
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            The fleet is one request away.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Browse the full Miami grid, send your dates, and let the
            operator take it from there.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream"
          >
            See the cars →
          </Link>
          <p className="mt-10 text-sm text-cream/70">
            Here for co-ownership?{" "}
            <Link
              href="/co-ownership"
              className="font-medium text-cream underline-offset-4 hover:underline"
            >
              Founding member waitlist — 2027
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
