// /partners — RYDA Fleet Partner Program landing page (B2B).
// Pitch to exotic-rental operators: list your inventory with us, our
// pre-screened HNW members come to you, you keep the operational
// relationship + pricing control.
//
// Sourced from the user-provided 1-pager PDF (May 2026).

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Fleet Partner Program",
  description:
    "RYDA's Fleet Partner Program lets exotic-rental operators reach our pre-screened HNW members. List your inventory, hold your rates, keep your client relationships. Miami launch Q3 2026.",
  alternates: { canonical: "/partners" },
};

const BENEFITS: { label: string; body: string }[] = [
  {
    label: "Discovery by clients already looking",
    body: "RYDA members are actively searching for exotic rentals in Miami. Your listings reach an audience with intent — not cold traffic you've paid to warm up.",
  },
  {
    label: "Pre-screened renters",
    body: "Every RYDA member passes multi-layer underwriting — identity, driving record, and financial verification. Fewer problems, better clients.",
  },
  {
    label: "Higher effective rates",
    body: "Clients coming through RYDA aren't price-shopping on aggregators. They're looking for the right car, which lets you hold your rates.",
  },
  {
    label: "Professional listing presentation",
    body: "Your cars appear in a polished, luxury-positioned context — not alongside budget rentals. The platform reflects the tier your fleet is at.",
  },
  {
    label: "No marketing overhead",
    body: "No ad accounts, no SEO, no content calendar. You run the rentals; RYDA handles the audience.",
  },
  {
    label: "You stay in control",
    body: "Set your own availability, pricing, and blackout dates. RYDA is a channel — not a middleman that takes over your client relationships.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Apply",
    body: "Tell us about your company and fleet. We respond to every application personally within 3 business days.",
  },
  {
    n: "02",
    title: "Fleet review",
    body: "We confirm which vehicles meet RYDA's standards — modern, well-presented exotics from marques our members seek.",
  },
  {
    n: "03",
    title: "Listing setup",
    body: "We work with you on photos, specs, pricing, and availability to present your cars the way they deserve.",
  },
  {
    n: "04",
    title: "Live",
    body: "Your fleet goes live on RYDA. Enquiries reach you directly. You handle it from there, exactly as you do today.",
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
            Fleet Partner Program · Miami 2026 · For exotic rental companies
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
            The audience your fleet{" "}
            <span className="italic text-red">deserves.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            RYDA is a curated platform for exotic car rentals, built
            for a membership of high-net-worth clients actively looking
            to book. If you have the cars and not the marketing reach,
            we&apos;re a natural fit — list your inventory with us and
            let the demand come to you.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact?type=Partnership&note=Fleet%20Partner%20Program%20application"
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

      {/* What you get — 6 benefits */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What you get
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Six reasons RYDA pays back the listing.
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

      {/* Getting listed — 4 steps */}
      <section id="how-it-works" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Getting listed
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            From application to live in days, not months.
          </h2>

          <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
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

      {/* CTA */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Let&apos;s talk
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            Let&apos;s talk about your fleet.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-cream/85">
            We respond to every partner application personally within
            three business days. No commitment — just a conversation
            about whether RYDA is the right channel for you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact?type=Partnership&note=Fleet%20Partner%20Program%20application"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Get in touch →
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
