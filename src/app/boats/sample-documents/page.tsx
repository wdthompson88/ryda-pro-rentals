import { SiteHeader } from "@/components/site-header";
import {
  SampleDocumentsPageTemplate,
  type SampleDocumentGroup,
} from "@/components/shared/sample-documents-page";

export const metadata = {
  title: "Sample documents — RYDA Boats",
  description:
    "Preview the legal and operational documents RYDA Boats uses: Operating Agreement, Management Services Agreement, marine survey, Coast Guard documentation, captain agreements.",
};

const DOCS: SampleDocumentGroup[] = [
  {
    category: "Legal · LLC structure",
    items: [
      { title: "Operating Agreement (sample)", meta: "LLC · ~36 pages · v1.0", purpose: "The LLC's constitution. Spells out share allocation, voting thresholds (75% supermajority for sales/modifications), distribution waterfall on dissolution, transfer rules (12-month minimum hold, 3% transfer fee), default remedies for delinquent members, peak-window protection rules, and the rights of each co-owner.", signedBy: "Every co-owner at closing" },
      { title: "Management Services Agreement (sample)", meta: "Between LLC and RYDA · ~22 pages · v1.0", purpose: "A separate contract between the LLC (as principal) and RYDA (as service provider). Defines RYDA's scope: slip + dockage, captain employment, fuel procurement, insurance procurement, scheduling, maintenance, hurricane prep, member services. RYDA is replaceable by member vote.", signedBy: "LLC + RYDA" },
      { title: "Subscription Agreement (sample)", meta: "Member-to-LLC · ~10 pages · v1.0", purpose: "How a new member joins an existing LLC. Documents the member's share count, capital contribution, KYC representations, boating experience disclosures, USCG documentation transfer paperwork, and acknowledgment of the Operating Agreement.", signedBy: "Each new member" },
    ],
  },
  {
    category: "Vessel · acquisition & condition",
    items: [
      { title: "Marine Survey Report (sample)", meta: "Wajer 55 S · 280 hrs · SAMS-accredited", purpose: "Pre-purchase survey from a SAMS-accredited surveyor. Hull, structural integrity, engine borescope and oil analysis, electrical, plumbing, navigation/electronics, rigging (sailboats), running gear, sea trial, and a hull haul-out + bottom inspection. Photo log of every panel + defect annotations.", signedBy: "Surveyor + RYDA" },
      { title: "Certificate of Insurance (sample)", meta: "Agreed-value · A-rated marine carrier", purpose: "$1M+ third-party liability, agreed-value hull damage, theft, passenger protection, oil spill / pollution, salvage. The LLC named as primary insured; every approved member named as a named insured. RYDA is broker of record.", signedBy: "Carrier + LLC" },
      { title: "USCG Certificate of Documentation (sample)", meta: "Federal documentation · LLC-named", purpose: "Federal Coast Guard documentation in the LLC's name (e.g. \"Wajer 55 S RYDA LLC\"). Members are not on the document, the LLC is. Renewal handled annually by RYDA.", signedBy: "USCG-issued" },
      { title: "Quarterly Condition Report (sample)", meta: "Q1 2026 · Wajer 55 S", purpose: "Quarterly status report: current engine hours, service performed (oil changes, anode replacement, prop alignment), fluids replaced, hull condition, any cosmetic events, photo log. Posted to every co-owner's portal automatically.", signedBy: "RYDA marine ops team" },
    ],
  },
  {
    category: "Crew · captain & service",
    items: [
      { title: "Captain Employment Agreement (sample)", meta: "USCG-licensed · per-vessel", purpose: "Employment contract between the LLC and the dedicated captain. Defines duties, hour limits, shore-based responsibilities (provisioning coordination, mate scheduling), liability split with insurance, and termination clauses. Captain reports to RYDA but is paid by the LLC.", signedBy: "Captain + LLC + RYDA" },
      { title: "Bareboat Qualification Form (sample)", meta: "USCG-license verification · ~3 pages", purpose: "For members on the Riva or Lagoon who wish to operate bareboat (without a captain). Documents license verification, prior boating experience, an in-water check-out cruise with a RYDA captain, and an insurance rider acknowledgment.", signedBy: "Member + RYDA captain + LLC" },
    ],
  },
  {
    category: "Operational · use & service",
    items: [
      { title: "Booking Rules & Peak-Window Policy", meta: "~7 pages", purpose: "How shared days are reserved on the calendar, peak-window protection (one protected weekend per share before any co-owner gets a second), short-notice vs. planned booking thresholds, cancellation rules, no-show consequences.", signedBy: "Acknowledged by every member" },
      { title: "Hurricane Preparedness Plan", meta: "Miami market · ~6 pages", purpose: "Standing operating procedure for named storms. Pre-defined haul-out triggers (Atlantic basin, latitude of Cuba), partner yard contracts, member-notification protocols, return-to-water timeline. The cost is bundled in annual ops, no per-event charge.", signedBy: "Defined in MSA + Operating Agreement" },
      { title: "Damage Reserve Policy", meta: "~4 pages", purpose: "How the LLC's damage reserve is funded, what it covers (minor incidents, deductibles below threshold), how grounding incidents are assessed (50% deductible split for negligence), and when reserves are returned at LLC dissolution.", signedBy: "Defined in Operating Agreement" },
      { title: "Charter Opt-In Agreement (sample)", meta: "~5 pages", purpose: "How a co-owner can opt their unused entitlement into the RYDA charter pool. Revenue split (65/35 you / RYDA), peak-season set-asides, charter-specific insurance disclosures, and how charter revenue is distributed to members pro-rata.", signedBy: "Per opt-in member + LLC" },
    ],
  },
];

export default function BoatsSampleDocumentsPage() {
  return (
    <>
      <SiteHeader />
      <SampleDocumentsPageTemplate
        data={{
          accent: "marine",
          detailed: true,
          hero: {
            eyebrow: "Sample documents · Boats",
            title: <>Read the paperwork <span className="italic">before you wire.</span></>,
            body:
              "Every document the LLC produces, Operating Agreement, Management Services Agreement, marine survey, Coast Guard documentation, captain agreements, hurricane plan, available as a redacted sample. Hand these to your counsel and your tax advisor before any commitment.",
            links: [
              { href: "/contact?type=Membership&note=RYDA%20Boats%20sample%20documents%20packet#form", label: "Request the full packet →" },
              { href: "/member-protection", label: "How your money is protected", variant: "secondary" },
            ],
          },
          docs: DOCS,
          requestHref: "/contact?type=Membership&note=Request%20boat%20sample%20doc#form",
          privacySection: {
            eyebrow: "What sample documents won't cover",
            title: "What stays private until closing.",
            paragraphs: [
              "Other members' identities, capital contributions, and transfer prices are private to the parties involved. RYDA does not publish a member directory or a transfer-price ticker.",
              "The LLC's bank statements and cash position are available to seated members through the member portal, not in the public sample packet.",
              "Insurance carrier names, partner yard contracts, and captain employment specifics are redacted in the public-facing documents but available in their actual form to counsel during member due-diligence.",
            ],
          },
          cta: {
            title: "See how your buy-in is structured.",
            body: "Schedule a 30-minute call. We'll walk through any of these documents line-by-line.",
            links: [
              { href: "/boats/portfolio", label: "See the fleet →" },
              { href: "/contact?type=Membership&note=RYDA+Boats#form", label: "Schedule a call", variant: "secondary" },
            ],
          },
        }}
      />
    </>
  );
}
