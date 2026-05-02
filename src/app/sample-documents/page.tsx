// Sample documents page — lets prospective buyers preview redacted
// versions of the legal + operational docs RYDA uses, so they (and
// their counsel) can review the structure before committing.

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Sample documents — RYDA",
  description:
    "Preview the legal and operational documents RYDA uses: Operating Agreement, Management Services Agreement, Pre-Purchase Inspection, insurance certificates, condition reports.",
};

const DOCS = [
  {
    category: "Legal · LLC structure",
    items: [
      {
        title: "Operating Agreement (sample)",
        meta: "Delaware LLC · ~34 pages · v1.0",
        purpose:
          "The LLC's constitution. Spells out share allocation, voting thresholds (75% supermajority for sales/modifications), distribution waterfall on dissolution, transfer rules (12-month minimum hold, 3% transfer fee), default remedies for delinquent members, and the rights of each co-owner.",
        signedBy: "Every co-owner at closing",
      },
      {
        title: "Management Services Agreement (sample)",
        meta: "Between LLC and RYDA · ~18 pages · v1.0",
        purpose:
          "A separate contract between the LLC (as principal) and RYDA (as service provider). Defines RYDA's scope: storage, insurance procurement, scheduling, maintenance coordination, member services. Termination clauses, fee schedule, performance standards. RYDA is replaceable by member vote.",
        signedBy: "LLC + RYDA",
      },
      {
        title: "Subscription Agreement (sample)",
        meta: "Member-to-LLC · ~8 pages · v1.0",
        purpose:
          "How a new member joins an existing LLC. Documents the member's share count, capital contribution, KYC representations, insurance disclosures, and acknowledgment of the Operating Agreement.",
        signedBy: "Each new member",
      },
    ],
  },
  {
    category: "Vehicle · acquisition & condition",
    items: [
      {
        title: "Pre-Purchase Inspection Report (sample)",
        meta: "F296 GTB · 14,280 mi · multi-point",
        purpose:
          "Third-party PPI from a marque-licensed shop. Engine compression, transmission, suspension, brakes, electrical, body panels, paint depth (with measurements), interior, road test. Photo log of every panel + defect annotations.",
        signedBy: "Inspecting technician + RYDA",
      },
      {
        title: "Certificate of Insurance (sample)",
        meta: "Agreed-value · A-rated US carrier",
        purpose:
          "$1M+ third-party liability, agreed-value physical damage, theft, passenger protection. The LLC named as primary insured; every approved member named as a named insured. RYDA is broker of record.",
        signedBy: "Carrier + LLC",
      },
      {
        title: "Title Evidence (sample)",
        meta: "Title issued in LLC name",
        purpose:
          "Demonstrates that the vehicle's title is held in the LLC's name only. RYDA does not appear on the title and never can. Members own membership interests in the LLC, which owns the asset.",
        signedBy: "DMV-issued",
      },
      {
        title: "Quarterly Condition Report (sample)",
        meta: "Q1 2026 · F296",
        purpose:
          "Quarterly status report: current odometer, service performed, fluids replaced, tire wear, any cosmetic events, photo log. Posted to every co-owner's portal automatically.",
        signedBy: "RYDA operations team",
      },
    ],
  },
  {
    category: "Operational · use & service",
    items: [
      {
        title: "Booking Rules & Fair-Use Policy",
        meta: "~6 pages",
        purpose:
          "How shared days are reserved on the calendar, peak-season caps (max consecutive days during high-demand windows), cancellation rules, no-show consequences, transfer-of-day mechanics.",
        signedBy: "Acknowledged by every member",
      },
      {
        title: "Track-Day Rider (sample)",
        meta: "Optional · per-event",
        purpose:
          "Insurance rider for sanctioned track events. Adds coverage for on-track incidents that the standard policy excludes. Required for any track use of an eligible vehicle.",
        signedBy: "Member + carrier",
      },
      {
        title: "Damage Reserve Policy",
        meta: "~4 pages",
        purpose:
          "How the LLC's damage reserve is funded, what it covers (minor incidents below the deductible threshold), what triggers a member assessment, and when reserves are returned at LLC dissolution.",
        signedBy: "Defined in Operating Agreement",
      },
    ],
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
            Every document the LLC produces, available as a redacted
            sample. Hand these to your counsel and your tax advisor;
            they should be able to review the structure end-to-end
            before any commitment is made.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact?type=Membership&note=Sample%20documents%20packet#form"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Request the full packet →
            </Link>
            <Link
              href="/member-protection"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              How your money is protected
            </Link>
          </div>
        </div>
      </section>

      {/* Doc list */}
      {DOCS.map((group) => (
        <section
          key={group.category}
          className="border-b border-rule [&:nth-child(even)]:bg-cream-2"
        >
          <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                {group.category}
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {group.items.map((doc, i) => (
                <Reveal key={doc.title} delayMs={i * 60}>
                  <div className="h-full rounded-2xl border border-rule bg-surface p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-2 text-[10px] font-bold uppercase tracking-wider text-red">
                        PDF
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg text-ink">
                          {doc.title}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-mute">
                          {doc.meta}
                        </p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                      {doc.purpose}
                    </p>
                    <div className="mt-5 flex items-baseline justify-between border-t border-rule pt-4">
                      <p className="text-[11px] text-mute">
                        Signed by · <span className="text-ink-soft">{doc.signedBy}</span>
                      </p>
                      <Link
                        href="/contact?type=Membership&note=Request%20sample%20doc#form"
                        className="text-xs font-medium text-red hover:text-red-deep"
                      >
                        Request →
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* What you don't see */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What sample documents won&apos;t cover
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What stays private until closing.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              Other members&apos; identities, capital contributions, and
              transfer prices are private to the parties involved. RYDA
              does not publish a member directory or a transfer-price
              ticker.
            </p>
            <p>
              The LLC&apos;s bank statements and cash position are
              shared with active co-owners on a quarterly basis but not
              published publicly. Once you&apos;re a member, you have
              access to the full operational view of any LLC you
              participate in.
            </p>
            <p>
              Vendor pricing (insurance premiums, storage rates,
              maintenance shop labor rates) is shared with members at
              cost in the quarterly reports — but the underlying
              vendor agreements are RYDA&apos;s commercial documents.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Want the full packet for a specific car?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We&apos;ll send the Operating Agreement, MSA, sample PPI,
            sample insurance certificate, and condition report for the
            vehicle you&apos;re considering — reviewable by your counsel
            before any commitment.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Pick a car →
          </Link>
        </div>
      </section>
    </>
  );
}
