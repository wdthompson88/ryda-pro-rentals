// Sample documents page, a simple list of the legal + operational
// docs RYDA uses, with a single CTA to request the redacted PDF
// packet. Detailed inline copy was demoted to internal-only reference
// per the CEO's polish pass; the public surface stays a quiet index
// rather than a deep walkthrough.

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Sample documents — RYDA",
  description:
    "The legal and operational documents RYDA uses. Request the redacted packet to review with your counsel.",
};

const DOCS: { category: string; items: string[] }[] = [
  {
    category: "Legal · LLC structure",
    items: [
      "Operating Agreement",
      "Management Services Agreement",
      "Subscription Agreement",
    ],
  },
  {
    category: "Vehicle · acquisition & condition",
    items: [
      "Pre-Purchase Inspection Report",
      "Certificate of Insurance",
      "Title Evidence",
      "Quarterly Condition Report",
    ],
  },
  {
    category: "Operational · use & service",
    items: ["Booking Rules & Fair-Use Policy", "Damage Reserve Policy"],
  },
];

export default function SampleDocumentsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Sample documents
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Read the paperwork{" "}
            <span className="italic">before you wire.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            We&apos;ll send a redacted packet you can hand to your counsel
            and tax advisor before any commitment is made.
          </p>
          <div className="mt-10">
            <Link
              href="/contact?type=Membership&note=Sample%20documents%20packet#form"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Request the full packet →
            </Link>
          </div>
        </div>
      </section>

      {/* Doc list, quiet index, no inline detail */}
      {DOCS.map((group) => (
        <section
          key={group.category}
          className="border-b border-rule [&:nth-child(even)]:bg-cream-2"
        >
          <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              {group.category}
            </p>
            <ul className="mt-6 divide-y divide-rule">
              {group.items.map((title) => (
                <li
                  key={title}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <p className="font-display text-base text-ink">{title}</p>
                  <Link
                    href="/contact?type=Membership&note=Request%20sample%20doc#form"
                    className="text-xs font-medium text-red hover:text-red-deep"
                  >
                    Request sample &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Want the packet for a specific car?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Pick the vehicle you&apos;re considering and we&apos;ll
            tailor the redacted packet to that LLC.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Pick a car &rarr;
          </Link>
        </div>
      </section>
    </>
  );
}
