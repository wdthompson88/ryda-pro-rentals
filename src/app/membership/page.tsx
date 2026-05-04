import { SiteHeader } from "@/components/site-header";
import {
  MembershipPageTemplate,
  type MembershipFeatureGroup,
  type MembershipTier,
} from "@/components/shared/membership-page";
import { earlyPricingCTA } from "@/lib/launch-config";

export const metadata = {
  title: "Membership — RYDA",
  description:
    "RYDA Core (free), Blue ($500/yr), and Black ($1,500/yr). Compare what each tier unlocks.",
};

const FEATURES: MembershipFeatureGroup[] = [
  {
    group: "Access",
    items: [
      { label: "Browse all vehicles in every market", core: true, blue: true, black: true },
      { label: "Rent any available vehicle", core: true, blue: true, black: true },
      { label: "Claim co-ownership shares · transfer to other members", core: false, blue: true, black: true },
      { label: "In-app messaging with co-owners", core: true, blue: true, black: true },
      { label: "Inspection reports + LLC documents", core: true, blue: true, black: true },
      { label: "Member directory access", core: false, blue: true, black: true },
      { label: "Member-to-member share transfers", core: false, blue: true, black: true },
      { label: "Off-market vehicle pre-list visibility", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Priority",
    items: [
      { label: "Priority access to new listings", core: false, blue: "24-hour", black: "48-hour" },
      { label: "Buy-in credit", core: false, blue: "$200", black: "$500" },
      { label: "Acquisition fee discount", core: false, blue: "10% off", black: "Waived (1st share)" },
    ],
  },
  {
    group: "Service",
    items: [
      { label: "Free white-glove deliveries / year", core: false, blue: "1", black: "3" },
      { label: "Free service hours / year", core: false, blue: "1", black: "3" },
      { label: "Free pre-trip vehicle prep / year", core: false, blue: false, black: "1" },
      { label: "24/7 roadside assistance", core: true, blue: true, black: true },
      { label: "Standard handover (pickup)", core: true, blue: true, black: true },
      { label: "Dedicated account contact", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Events",
    items: [
      { label: "Quarterly Cars & Cuban Coffee", core: false, blue: true, black: true },
      { label: "Member networking dinners", core: false, blue: true, black: true },
      { label: "Quarterly flagship events (Pebble, GP weekend, Art Basel)", core: false, blue: false, black: true },
      { label: "Annual founders' weekend", core: false, blue: false, black: true },
      { label: "Travel programming (Keys road trip, Monterey, etc.)", core: false, blue: "Open to all (paid)", black: "Priority + included" },
    ],
  },
];

const TIERS: MembershipTier[] = [
  {
    key: "core",
    name: "Core",
    price: "Free",
    priceSub: "",
    tagline: "Browse the fleet and rent any available vehicle. Upgrade to Blue or Black to claim a co-ownership share.",
    cta: "Get started",
  },
  {
    key: "blue",
    name: "Blue",
    price: "$500",
    priceSub: "/year",
    tagline: "For active members. Priority on new vehicles, monthly meetups, member-to-member share transfers.",
    cta: "Choose Blue",
  },
  {
    key: "black",
    name: "Black",
    price: "$1,500",
    priceSub: "/year",
    tagline: "Premium everything. Travel programming, flagship events, dedicated contact.",
    cta: "Choose Black",
  },
];

export default function MembershipPage() {
  const earlyCta = earlyPricingCTA();

  return (
    <>
      <SiteHeader />
      <MembershipPageTemplate
        data={{
          accent: "red",
          brandLabel: "RYDA",
          hero: {
            eyebrow: "Membership",
            title: <>Three doors <span className="italic">into RYDA.</span></>,
            body: "Core to browse and rent. Blue or Black to claim a share.",
          },
          tiers: TIERS,
          features: FEATURES,
          math: {
            intro: "Membership is structured around access and service, not coupons.",
            details: [
              {
                tier: "Blue · $500/yr",
                detail:
                  "Active membership: a $200 buy-in credit, one complimentary white-glove delivery, member-to-member share transfers, member directory, and priority access to new vehicles.",
              },
              {
                tier: "Black · $1,500/yr",
                detail:
                  "Premium everything: a $500 buy-in credit, three deliveries, three service hours, waived first acquisition fee, flagship event programming (Pebble, Miami GP, Art Basel), and a dedicated account contact.",
              },
            ],
          },
          eligibility: [
            "28 or older with a valid US driver's license and clean recent record",
            "Pass identity verification (KYC)",
            "No accredited-investor status required",
          ],
          cta: {
            headline: earlyCta.headline,
            body: earlyCta.body,
            href: "/signup",
          },
        }}
      />
    </>
  );
}
