import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FaqPageTemplate, type FaqSection } from "@/components/shared/faq-page";

export const metadata = {
  title: "FAQ",
  description:
    "Answers to the most common questions about RYDA membership, co-ownership, rentals and operations.",
};

const SECTIONS: FaqSection[] = [
  {
    title: "Co-ownership",
    questions: [
      { q: "What am I actually buying?", a: "A membership interest in a single-purpose LLC that owns a specific vehicle. The LLC's only assets are the vehicle, its insurance/operating reserves and a management contract with RYDA. You hold a registered legal interest, not a club point." },
      { q: "How many co-ownership shares per vehicle?", a: "10 shares per vehicle, split across up to 5 co-owners with a 2-share minimum per person. Each share entitles you to ~32 days and up to ~3,200 miles of usage per year (100 mi/day allowance). A single member can hold two shares or more, usage scales linearly." },
      { q: "Are RYDA co-ownership stakes securities?", a: "No. RYDA is a luxury access platform, not an investment platform. Each car is held in a member-managed LLC where you and 1–4 other co-owners hold authority over material decisions; RYDA is hired as a service provider via a separate management agreement. Co-ownership stakes are not registered securities and are not offered for investment purposes. No accredited-investor verification required." },
      { q: "Can I transfer my share whenever I want?", a: "After a 12-month minimum hold, yes, directly to another verified RYDA member. RYDA facilitates the LLC paperwork. There is no public marketplace and no order book. Settlement takes 1–3 business days. RYDA charges a 3% transfer fee on the agreed price." },
      { q: "What if a co-owner stops paying?", a: "The LLC's Operating Agreement has remedies, including forced transfer of the delinquent share. RYDA also keeps a maintenance reserve at the LLC level so vehicle ops continue uninterrupted while it's resolved." },
      { q: "What if a major mechanical issue comes up?", a: "RYDA only acquires certified pre owned vehicles, and every car gets a documented multi-point Pre-Purchase Inspection by a marque specialist before the LLC closes on it. Powertrain and major mechanical systems are covered by an active certified pre owned warranty during the LLC's first ownership period. Out-of-warranty repairs come from the LLC's maintenance reserve, not from co-owners' pockets. Co-owners aren't on the hook for surprise engine, transmission or driveline bills." },
      { q: "What if the car gets totaled?", a: "The vehicle carries agreed-value physical damage insurance. If totaled, the insurance proceeds go to the LLC, are distributed pro-rata to co-owners and the LLC is wound down. Most groups elect to roll proceeds into a replacement vehicle." },
    ],
  },
  {
    title: "Membership",
    questions: [
      { q: "Who can join?", a: "Verified individuals 28 years or older with a valid US driver's license, a clean recent driving record and the ability to pass identity verification (KYC). No accredited-investor status or financial qualification required, RYDA is a luxury access platform, not an investment platform." },
      { q: "Does membership cost anything?", a: "Three tiers. Core is free. Blue is $500/year ($350 early-member pricing, locked for life). Black is $1,500/year ($1,000 early-member pricing, locked for life). Most active members start on Blue." },
      { q: "Why 28+?", a: "Insurance carriers price exotic-car policies very aggressively for younger drivers. The 28+ minimum keeps fleet premiums manageable and matches the underwriting norm for collector and exotic policies in our market." },
      { q: "Can I join from anywhere in the US?", a: "Yes, but the actual vehicles only operate in our launch markets. Miami first (Q3 2026), then LA (2027), then NY (2027). Members anywhere in the US can join early to lock in early-member pricing." },
    ],
  },
  {
    title: "Operations",
    questions: [
      { q: "Where are the cars stored?", a: "In RYDA-vetted partner facilities, climate-controlled, 24/7 monitored, fully insured. Miami first, with LA and NY following." },
      { q: "Who maintains them?", a: "RYDA. We handle service, registration, inspections, photography and condition reports. Co-owners are not on call for any of it." },
      { q: "How do I book my time?", a: "Through the RYDA app, on a shared calendar with the other co-owners. Fair-use rules cap consecutive days during high season (May–September) at 7 per share, with 14 days allowed in low season." },
    ],
  },
  {
    title: "Rentals (try-before-you-buy)",
    questions: [
      { q: "Can I rent a RYDA car if I'm not a co-owner?", a: "Yes, members and prospective buyers can rent any available vehicle by the day. Rentals are priced for the high end ($1,800–$8,500/day depending on the car) and are intended as a try-before-you-buy for co-ownership." },
      { q: "What's included in a rental?", a: "Full insurance, 100 miles per day, 24/7 roadside and white-glove delivery if you choose it. Overage is $4/mile." },
      { q: "Why rentals at all? Aren't you focused on ownership?", a: "Yes, co-ownership is the core product. Rentals exist for two reasons: (1) prospective members get a real test-drive before committing six figures to a share, and (2) it supports vehicle utilization for co-owners who don't fully use their entitlement. We don't compete on price with generic rental marketplaces." },
    ],
  },
];

// Note: FAQPage Schema.org JSON-LD is emitted by FaqPageTemplate
// itself (see src/components/shared/faq-page.tsx). Adding a second
// page-level <script> would emit the same FAQPage block twice and
// risk confusing Google's rich-result parser. Per codex review of
// the cleanup batch.

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <FaqPageTemplate
        data={{
          accent: "red",
          hero: {
            eyebrow: "FAQ",
            title: "Everything we get asked, answered honestly.",
            body: (
              <>
                Questions we haven&apos;t covered?{" "}
                <Link href="/contact#form" className="text-red hover:text-red-deep">
                  Send us a question
                </Link>
                , we add new ones here when they come up.
              </>
            ),
          },
          sections: SECTIONS,
          cta: {
            title: "Still have a question?",
            body: "Talk to a real human. 30-minute call, no commitment.",
            links: [{ href: "/contact#consultation", label: "Book a consultation" }],
          },
        }}
      />
    </>
  );
}
