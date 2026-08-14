// /partners — RYDA Fleet Partner Program landing page (B2B).
// Pitch to Miami rental operators: list your inventory with us, we pass
// on the requests we get, you keep the operational relationship and
// pricing control.
//
// This page previously promised operators that "every RYDA member
// passes multi-layer underwriting — identity, driving record, and
// financial verification", sold an audience of "pre-screened HNW
// members", and dated the market as "Miami launch Q3 2026". None of
// that is true: the only check in the codebase is an OPTIONAL Stripe
// Identity document + selfie session (api/kyc/start) that no rental
// surface gates on, there is no membership table or tier anywhere, and
// Miami is live. An operator handing over a car on the strength of a
// screening RYDA does not perform is the most expensive falsehood on
// the site, so those claims are deleted rather than softened.

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Fleet Partner Program",
  description:
    "RYDA lists Miami rental operators' cars, passes on the requests it receives, and takes a commission on the bookings it brings. Hold your own rates, keep your own client relationships.",
  alternates: { canonical: "/partners" },
};

const BENEFITS: { label: string; body: string }[] = [
  {
    label: "Leads arrive whole",
    body: "A request reaches RYDA with the customer's name, email, phone, the exact car, the dates and any note. Our team checks it and passes the lot to you, contact details included, so you answer the customer yourself.",
  },
  {
    label: "You decide who you rent to",
    body: "RYDA offers renters an optional identity check through Stripe — photo ID plus a live selfie — and nothing on RYDA depends on it. Licence, age, driving history and deposit are yours to set and check, exactly as they are on a walk-in.",
  },
  {
    label: "A listing page per car",
    body: "Every vehicle gets its own page: photography, specs, your daily rate, and a request form. RYDA lists everyday cars through exotics, and each one gets the same treatment.",
  },
  {
    label: "No marketing overhead",
    body: "No ad accounts, no SEO, no content calendar. You run the rentals; RYDA runs the site.",
  },
  {
    label: "You stay in control",
    body: "You set the rate, you confirm the dates, and the rental runs on your own agreement and insurance. RYDA is the channel that brings the customer to you and takes a commission when it does.",
  },
];

// The commercial term, stated before anyone applies. It used to appear
// for the first time on the post-approval dashboard — after Stripe KYC
// was already signed — which is the worst possible moment to learn
// there's a fee. DEFAULT_COMMISSION_PCT must track the 0041 default
// (commission_rate 0.150); per-operator rates are set in admin.
const DEFAULT_COMMISSION_PCT = 15;

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Apply",
    body: "Create an account, then tell us about your company and fleet from your partner dashboard. Your application sits as pending until a RYDA admin reviews it.",
  },
  {
    n: "02",
    title: "Fleet review",
    body: "We go through your vehicles with you and agree which ones RYDA lists.",
  },
  {
    n: "03",
    title: "Listing setup",
    body: "We work with you on photos, specs and pricing so each car reads the way you'd want it to.",
  },
  {
    n: "04",
    title: "Activate payments",
    body: "We send you a Stripe onboarding link. Stripe verifies your business and bank details, and bookings are charged directly to your connected account — RYDA's commission is collected as a platform fee on each charge.",
  },
  {
    n: "05",
    title: "Live",
    body: "Your fleet goes live on RYDA. Requests come in through the site, our team passes each one to you, you confirm the dates and price, and the customer pays on your own Stripe account.",
  },
];

export default function PartnersPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Fleet Partner Program · Miami · For rental operators
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
            Your cars, <span className="italic text-red">listed in Miami.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            RYDA is a Miami rental marketplace spanning everyday cars
            through exotics. We list your fleet, pass on the requests we
            receive, and take a commission when one turns into a booking.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup?as=partner"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
            >
              Apply to list your fleet →
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What you get
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What listing with RYDA gets you.
          </h2>

          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <li
                key={b.label}
                className="rounded-2xl border border-rule bg-surface p-6"
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 font-display text-xl text-ink">{b.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {b.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Getting listed */}
      <section id="how-it-works" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Getting listed
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Five steps from application to live.
          </h2>

          <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
            {STEPS.map((s) => (
              <li key={s.n}>
                <p className="font-display text-2xl text-red">{s.n}</p>
                <p className="mt-3 font-display text-xl text-ink">{s.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What it costs — stated up front, before the application and
          well before Stripe onboarding. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What it costs
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
            {DEFAULT_COMMISSION_PCT}% commission on bookings RYDA brings you.
            Nothing else.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="font-display text-xl text-ink">
                No listing or monthly fee
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                No setup cost, no subscription, no minimum. If RYDA sends
                you nothing, RYDA earns nothing.
              </p>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="font-display text-xl text-ink">
                Taken at the moment of payment
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                You confirm the price with the client. The customer pays on
                your own Stripe account and the {DEFAULT_COMMISSION_PCT}%
                is deducted automatically — no invoices, no chasing. On a
                $2,000 booking that&apos;s $
                {(2000 * (1 - DEFAULT_COMMISSION_PCT / 100)).toLocaleString(
                  "en-US",
                )}{" "}
                to you.
              </p>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="font-display text-xl text-ink">
                Your rates stay yours
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                RYDA never marks up your price to the client, and the rate
                is agreed with you before you go live — the standard is{" "}
                {DEFAULT_COMMISSION_PCT}%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          {/* On the bg-ink band the eyebrow must be red-bright — standard
              red is tuned for cream and fails AA on ink. */}
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Let&apos;s talk
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            Let&apos;s talk about your fleet.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-cream/85">
            Tell us what you run and we&apos;ll come back to you. No
            commitment — just a conversation about whether RYDA is the
            right channel for you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup?as=partner"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Apply as a partner →
            </Link>
            {/* type must be "Partnership" — the only partner-ish value
                in the contact form's VALID_TYPES; anything else lands
                as "Other" with no triage intent. */}
            <Link
              href="/contact?type=Partnership&note=Fleet%20Partner%20Program%20question"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Ask a question first
            </Link>
            <Link
              href="mailto:partners@ryda.pro"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              partners@ryda.pro
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
