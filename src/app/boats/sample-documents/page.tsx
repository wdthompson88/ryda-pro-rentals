// Boats sample-documents page — parallel of /sample-documents but
// boat-specific. Adds Coast Guard documentation, marine survey,
// captain employment agreement, hurricane plan, etc.

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Sample documents — RYDA Boats",
  description:
    "Preview the legal and operational documents RYDA Boats uses: Operating Agreement, Management Services Agreement, marine survey, Coast Guard documentation, captain agreements.",
};

const DOCS = [
  {
    category: "Legal · LLC structure",
    items: [
      {
        title: "Operating Agreement (sample)",
        meta: "LLC · ~36 pages · v1.0",
        purpose:
          "The LLC's constitution. Spells out share allocation, voting thresholds (75% supermajority for sales/modifications), distribution waterfall on dissolution, transfer rules (12-month minimum hold, 3% transfer fee), default remedies for delinquent members, peak-window protection rules, and the rights of each co-owner.",
        signedBy: "Every co-owner at closing",
      },
      {
        title: "Management Services Agreement (sample)",
        meta: "Between LLC and RYDA · ~22 pages · v1.0",
        purpose:
          "A separate contract between the LLC (as principal) and RYDA (as service provider). Defines RYDA's scope: slip + dockage, captain employment, fuel procurement, insurance procurement, scheduling, maintenance, hurricane prep, member services. RYDA is replaceable by member vote.",
        signedBy: "LLC + RYDA",
      },
      {
        title: "Subscription Agreement (sample)",
        meta: "Member-to-LLC · ~10 pages · v1.0",
        purpose:
          "How a new member joins an existing LLC. Documents the member's share count, capital contribution, KYC representations, boating experience disclosures, USCG documentation transfer paperwork, and acknowledgment of the Operating Agreement.",
        signedBy: "Each new member",
      },
    ],
  },
  {
    category: "Vessel · acquisition & condition",
    items: [
      {
        title: "Marine Survey Report (sample)",
        meta: "Wajer 55 S · 280 hrs · SAMS-accredited",
        purpose:
          "Pre-purchase survey from a SAMS-accredited surveyor. Hull, structural integrity, engine borescope and oil analysis, electrical, plumbing, navigation/electronics, rigging (sailboats), running gear, sea trial, and a hull haul-out + bottom inspection. Photo log of every panel + defect annotations.",
        signedBy: "Surveyor + RYDA",
      },
      {
        title: "Certificate of Insurance (sample)",
        meta: "Agreed-value · A-rated marine carrier",
        purpose:
          "$1M+ third-party liability, agreed-value hull damage, theft, passenger protection, oil spill / pollution, salvage. The LLC named as primary insured; every approved member named as a named insured. RYDA is broker of record.",
        signedBy: "Carrier + LLC",
      },
      {
        title: "USCG Certificate of Documentation (sample)",
        meta: "Federal documentation · LLC-named",
        purpose:
          "Federal Coast Guard documentation in the LLC's name (e.g. \"Wajer 55 S RYDA LLC\"). Members are not on the document — the LLC is. Renewal handled annually by RYDA.",
        signedBy: "USCG-issued",
      },
      {
        title: "Quarterly Condition Report (sample)",
        meta: "Q1 2026 · Wajer 55 S",
        purpose:
          "Quarterly status report: current engine hours, service performed (oil changes, anode replacement, prop alignment), fluids replaced, hull condition, any cosmetic events, photo log. Posted to every co-owner's portal automatically.",
        signedBy: "RYDA marine ops team",
      },
    ],
  },
  {
    category: "Crew · captain & service",
    items: [
      {
        title: "Captain Employment Agreement (sample)",
        meta: "USCG-licensed · per-vessel",
        purpose:
          "Employment contract between the LLC and the dedicated captain. Defines duties, hour limits, shore-based responsibilities (provisioning coordination, mate scheduling), liability split with insurance, and termination clauses. Captain reports to RYDA but is paid by the LLC.",
        signedBy: "Captain + LLC + RYDA",
      },
      {
        title: "Bareboat Qualification Form (sample)",
        meta: "USCG-license verification · ~3 pages",
        purpose:
          "For members on the Riva or Lagoon who wish to operate bareboat (without a captain). Documents license verification, prior boating experience, an in-water check-out cruise with a RYDA captain, and an insurance rider acknowledgment.",
        signedBy: "Member + RYDA captain + LLC",
      },
    ],
  },
  {
    category: "Operational · use & service",
    items: [
      {
        title: "Booking Rules & Peak-Window Policy",
        meta: "~7 pages",
        purpose:
          "How shared days are reserved on the calendar, peak-window protection (one protected weekend per share before any co-owner gets a second), short-notice vs. planned booking thresholds, cancellation rules, no-show consequences.",
        signedBy: "Acknowledged by every member",
      },
      {
        title: "Hurricane Preparedness Plan",
        meta: "Miami market · ~6 pages",
        purpose:
          "Standing operating procedure for named storms. Pre-defined haul-out triggers (Atlantic basin, latitude of Cuba), partner yard contracts, member-notification protocols, return-to-water timeline. The cost is bundled in annual ops, no per-event charge.",
        signedBy: "Defined in MSA + Operating Agreement",
      },
      {
        title: "Damage Reserve Policy",
        meta: "~4 pages",
        purpose:
          "How the LLC's damage reserve is funded, what it covers (minor incidents, deductibles below threshold), how grounding incidents are assessed (50% deductible split for negligence), and when reserves are returned at LLC dissolution.",
        signedBy: "Defined in Operating Agreement",
      },
      {
        title: "Charter Opt-In Agreement (sample)",
        meta: "~5 pages",
        purpose:
          "How a co-owner can opt their unused entitlement into the RYDA charter pool. Revenue split (65/35 you / RYDA), peak-season set-asides, charter-specific insurance disclosures, and how charter revenue is distributed to members pro-rata.",
        signedBy: "Per opt-in member + LLC",
      },
    ],
  },
];

export default function BoatsSampleDocumentsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Sample documents · Boats
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Read the paperwork{" "}
            <span className="italic">before you wire.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Every document the LLC produces — Operating Agreement,
            Management Services Agreement, marine survey, Coast Guard
            documentation, captain agreements, hurricane plan — available
            as a redacted sample. Hand these to your counsel and your
            tax advisor before any commitment.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact?type=Membership&note=RYDA%20Boats%20sample%20documents%20packet#form"
              className="inline-flex h-12 items-center justify-center rounded-full bg-marine px-7 text-sm font-medium text-cream hover:bg-marine-deep"
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

      {DOCS.map((group) => (
        <section
          key={group.category}
          className="border-b border-rule [&:nth-child(even)]:bg-cream-2"
        >
          <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                {group.category}
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {group.items.map((doc, i) => (
                <Reveal key={doc.title} delayMs={i * 60}>
                  <div className="h-full rounded-2xl border border-rule bg-surface p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-2 text-[10px] font-bold uppercase tracking-wider text-marine">
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
                        Signed by ·{" "}
                        <span className="text-ink-soft">{doc.signedBy}</span>
                      </p>
                      <Link
                        href="/contact?type=Membership&note=Request%20boat%20sample%20doc#form"
                        className="text-xs font-medium text-marine hover:text-marine-deep"
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

      {/* What's not in the packet */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
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
              available to seated members through the member portal,
              not in the public sample packet.
            </p>
            <p>
              Insurance carrier names, partner yard contracts, and
              captain employment specifics are redacted in the
              public-facing documents but available in their actual
              form to counsel during member due-diligence.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            See how your buy-in is structured.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Schedule a 30-minute call. We&apos;ll walk through any of
            these documents line-by-line.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/boats/portfolio"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
            >
              See the fleet →
            </Link>
            <Link
              href="/contact?type=Membership&note=RYDA+Boats#form"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Schedule a call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
