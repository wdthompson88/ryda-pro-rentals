import { SiteHeader } from "@/components/site-header";
import { FaqPageTemplate, type FaqSection } from "@/components/shared/faq-page";
import { FAQ_ITEMS } from "@/lib/boat-content";

export const metadata = {
  title: "FAQ — RYDA Boats",
  description:
    "Answers to the most common questions about RYDA Boats: co-ownership, captain protocol, slip rotation, hurricane prep, charter opt-in, exit doctrine.",
};

const SECTIONS: FaqSection[] = [
  {
    title: "Co-ownership",
    questions: [
      { q: "What am I actually buying?", a: "A membership interest in a single-purpose LLC that owns a specific yacht. The LLC's only assets are the vessel, its insurance/operating reserves, and a management contract with RYDA. You hold a registered legal interest, not a club point." },
      { q: "How many co-ownership shares per hull?", a: "10 shares per hull, split across up to 5 co-owners with a 2-share minimum per person. Each share entitles you to ~32 days and up to ~1,600 nautical miles of usage per year (50 nm/day allowance). A single member can hold two shares or more, usage scales linearly." },
      { q: "Are RYDA Boats co-ownership stakes securities?", a: "No. RYDA is a luxury access platform, not an investment platform. Each boat is held in a member-managed LLC where you and up to 4 other co-owners hold authority over material decisions; RYDA is hired as a service provider via a separate Management Services Agreement. Co-ownership stakes are not registered securities and are not offered for investment purposes. No accredited-investor verification required." },
      { q: "Can I transfer my share whenever I want?", a: "After a 12-month minimum hold, yes, directly to another verified RYDA member. RYDA facilitates the LLC paperwork and Coast Guard documentation transfer. There is no public marketplace and no order book. Settlement takes 3–5 business days. RYDA charges a 3% transfer fee on the agreed price." },
      { q: "What if a co-owner stops paying?", a: "The LLC's Operating Agreement has remedies, including forced transfer of the delinquent share. RYDA also keeps a maintenance reserve at the LLC level so slip, captain, and insurance continue uninterrupted while it's resolved." },
    ],
  },
  {
    title: "Operations",
    questions: FAQ_ITEMS,
  },
];

export default function BoatsFaqPage() {
  return (
    <>
      <SiteHeader />
      <FaqPageTemplate
        data={{
          accent: "marine",
          hero: {
            eyebrow: "RYDA Boats · FAQ",
            title: <>The boat-side questions <span className="italic">members ask first.</span></>,
            body:
              "Co-ownership structure, slip rotation, captain protocol, hurricane prep, charter opt-in, and the 3-year exit. Shorter and direct.",
          },
          sections: SECTIONS,
          cta: {
            title: "Still have a question?",
            body: "We answer every email. The team is small and the inboxes are real.",
            links: [
              { href: "/boats/portfolio", label: "See the fleet →" },
              { href: "/contact?type=Membership&note=RYDA+Boats#form", label: "Email us", variant: "secondary" },
            ],
          },
        }}
      />
    </>
  );
}
