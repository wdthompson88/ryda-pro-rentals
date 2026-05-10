import { SiteHeader } from "@/components/site-header";
import {
  MembershipPageTemplate,
  type MembershipFeatureGroup,
  type MembershipTier,
} from "@/components/shared/membership-page";
import { earlyPricingCTA } from "@/lib/launch-config";

export const metadata = {
  title: "Boats Membership — Core, Blue — Black",
  description:
    "RYDA Boats membership: Core (free), Blue ($500/yr), Black ($1,500/yr). Co-own or charter. Captain-hours bank, priority slip windows, hurricane prep, marine surveys.",
};

const FEATURES: MembershipFeatureGroup[] = [
  {
    group: "Access",
    items: [
      { label: "Browse the full RYDA Boats portfolio", core: true, blue: true, black: true },
      { label: "Charter any available hull", core: true, blue: true, black: true },
      { label: "Claim co-ownership shares · transfer to other members", core: false, blue: true, black: true },
      { label: "In-app messaging with co-owners + captains", core: true, blue: true, black: true },
      { label: "Marine survey + LLC documents", core: true, blue: true, black: true },
      { label: "Member directory (boats + cars)", core: false, blue: true, black: true },
      { label: "Member-to-member share transfers", core: false, blue: true, black: true },
      { label: "Off-market hull pre-list visibility", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Priority",
    items: [
      { label: "Priority access to new listings", core: false, blue: "24-hour", black: "48-hour" },
      { label: "Buy-in credit", core: false, blue: "$200", black: "$500" },
      { label: "Acquisition fee discount", core: false, blue: "10% off", black: "Waived (1st share)" },
      { label: "Priority booking window, peak season (Memorial → Labor)", core: false, blue: "+2 days", black: "+5 days" },
      { label: "Charter-pool first dibs (when an owner opens days)", core: false, blue: true, black: true },
    ],
  },
  {
    group: "Service & operations",
    items: [
      { label: "24/7 captain dispatch + dockside help", core: true, blue: true, black: true },
      { label: "Annual hurricane-prep pass (haul, store, re-launch)", core: false, blue: true, black: true },
      { label: "Captain-hours bank (over and above included)", core: false, blue: "2 hrs", black: "8 hrs" },
      { label: "Pre-trip provisioning (food, fuel, ice)", core: false, blue: "1 trip", black: "3 trips" },
      { label: "Service hours / year (itinerary, slips, restaurants)", core: false, blue: "1", black: "3" },
      { label: "Dedicated marine account contact", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Events",
    items: [
      { label: "Quarterly Sunset Sail · happy hour from a flagship hull", core: false, blue: true, black: true },
      { label: "Member captains' breakfast (Miami, Bahamas)", core: false, blue: true, black: true },
      { label: "Miami International Boat Show, member preview day", core: false, blue: true, black: true },
      { label: "Annual rendezvous (Bimini, Exuma, or member-voted)", core: false, blue: false, black: true },
      { label: "Annual founders' weekend on the water", core: false, blue: false, black: true },
      { label: "Travel programming (Caribbean week, Mediterranean, etc.)", core: false, blue: "Open to all (paid)", black: "Priority + included" },
    ],
  },
];

const TIERS: MembershipTier[] = [
  {
    key: "core",
    name: "Core",
    price: "Free",
    priceSub: "",
    tagline: "Browse the boats portfolio and charter any available hull. Upgrade to Blue or Black to claim a co-ownership share.",
    cta: "Get started",
  },
  {
    key: "blue",
    name: "Blue",
    price: "$500",
    priceSub: "/year",
    tagline: "For active members on the water. Priority booking windows, hurricane-prep pass, captain-hours bank, member-to-member share transfers.",
    cta: "Choose Blue",
  },
  {
    key: "black",
    name: "Black",
    price: "$1,500",
    priceSub: "/year",
    tagline: "Premium everything. Annual rendezvous, dedicated marine account contact, off-market hull access.",
    cta: "Choose Black",
  },
];

export default function BoatsMembershipPage() {
  const earlyCta = earlyPricingCTA();

  return (
    <>
      <SiteHeader />
      <MembershipPageTemplate
        data={{
          accent: "marine",
          brandLabel: "RYDA Boats",
          hero: {
            eyebrow: "RYDA Boats · Membership",
            title: <>Three ways <span className="italic">aboard.</span></>,
            body:
              "Charter on the day. Co-own the hull on a 3-year planned exit. Five members per LLC, captain hours, hurricane prep, and slip priority bundled in — because owning a boat is nothing like owning a Ferrari, and we built the membership around that.",
          },
          tiers: TIERS,
          features: FEATURES,
          math: {
            intro:
              "Boats membership is structured around dock-and-go reality, not coupons. The perks save real time on the water.",
            details: [
              {
                tier: "Blue · $500/yr",
                detail:
                  "Active membership: $200 buy-in credit, hurricane-prep pass, +2 days peak-season booking priority, 2 captain-hours bank, one provisioning trip per year, member-to-member share transfers, member directory, and priority access to new hulls.",
              },
              {
                tier: "Black · $1,500/yr",
                detail:
                  "Premium everything: $500 buy-in credit, +5 days peak-season priority, 8 captain-hours bank, three provisioning trips, three service hours, waived first acquisition fee, annual rendezvous + founders' weekend, off-market hull pre-list visibility, and a dedicated marine account contact.",
              },
            ],
          },
          eligibility: [
            "28 or older with a valid US-issued ID",
            "Pass identity verification (KYC)",
            <>
              Operator&apos;s license (US, BVI, or equivalent) only required if you intend to skipper personally,
              most members don&apos;t. Hulls are crewed by default.
            </>,
            "No accredited-investor status required",
          ],
          cta: {
            headline: "Boats membership opens with the Miami launch.",
            body: earlyCta.body,
            href: "/signup?next=/boats",
          },
        }}
      />
    </>
  );
}
