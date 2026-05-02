// Body copy for the RYDA Boats marketing surfaces. Lives separately
// from boat-data.ts so the data file stays focused on the fleet
// schema; this file is just strings.

export const HERO_EYEBROW = "RYDA Boats · Miami launch · Q3 2026";
export const HERO_HEADLINE = {
  prefix: "Co-own or charter the world's",
  highlight: "most beautiful boats.",
};
export const HERO_SUBHEAD =
  "Each boat is held in a member-managed LLC. Up to 5 verified members co-own every hull, with a 2-share minimum per person. RYDA runs the operations end-to-end, slip, captain, fuel, insurance, hurricane prep. Three-year planned exit; transferable to other members after twelve months.";

export const PORTFOLIO_HERO = {
  eyebrow: "RYDA Portfolio · Boats",
  headline: {
    prefix: "Floating real estate,",
    highlight: "held in an LLC.",
  },
  subhead:
    "Four flagship hulls in Biscayne Bay today. LA + NY in 2027. Up to 5 co-owners per hull (2-share minimum), 32 days/share/year, 1,600 nautical miles included, three-year planned exit.",
};

// Five-step model for the /boats/how-it-works page (and home overview).
export const HOW_IT_WORKS_STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Verify",
    body: "Apply and complete identity verification.",
  },
  {
    n: "02",
    title: "Choose",
    body: "Browse the curated fleet. Every boat passes a multi-point Pre-Purchase Inspection by the dealer before a single share is sold.",
  },
  {
    n: "03",
    title: "Co-own",
    body: "RYDA forms a LLC for up to 5 members to hold the vessel. You sign the operating agreement and fund your share (2 shares minimum per person).",
  },
  {
    n: "04",
    title: "Cruise",
    body: "Book your time on the RYDA smart calendar. Each share unlocks ~32 days and ~1,600 nautical miles a year (50 nm/day).",
  },
  {
    n: "05",
    title: "Exit",
    body: "RYDA sells the boat at year 2–3 OR a defined operating-hours threshold depending on the certified pre owned program. Proceeds split pro-rata. Need out earlier? Transfer your share to another verified member after the 12-month minimum hold.",
  },
];

// FAQ, boat-specific. Same shape as the cars FAQ.
export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What's actually included in the annual operating cost?",
    a: "Slip rental at the boat's hailing marina, captain hours for member trips (up to your share's 30 day allowance), fuel up to a generous monthly budget, full agreed-value hull and liability insurance, hurricane prep + haul-out, spring commission and fall lay-up service, USCG documentation renewal, and a maintenance reserve. The big visible costs, slip and crew, are bundled. Excess fuel beyond the monthly budget and any optional add-ons (sport-fishing rigging on the Pershing, dive package, etc.) are billed at cost.",
  },
  {
    q: "Can I skipper the boat myself, or is a captain always required?",
    a: "Crewed by default. Every charter and most member trips ship with a RYDA-vetted captain, it's the cheapest way to keep the insurance carriers happy and the safest way to keep the boat in good shape. Bareboat is available on the Riva Aquariva and the Lagoon 50 for members who hold a USCG-recognized license (OUPV/Six-Pack or higher) and complete a check-out cruise with our captains. Sport yachts (Pershing) are crewed only.",
  },
  {
    q: "How does hurricane prep work?",
    a: "Miami-based hulls are hauled to our partner yard in Coconut Grove between June 1 and October 31 whenever a named storm enters the Atlantic basin and crosses the latitude of Cuba. The cost is bundled into the annual operating cost, members pay nothing additional during a hurricane season, even with multiple storm calls. Off-season haul-out (Dec–Mar in Miami) is also bundled. NY-based hulls winter at our Connecticut partner yard.",
  },
  {
    q: "What happens if a member damages the boat?",
    a: "Standard playbook: agreed-value hull insurance covers the repair after a deductible. The deductible is paid from the LLC's maintenance reserve and rebilled pro-rata to all members, the at-fault member doesn't bear the deductible alone, but they do bear a 50% share of any insurance-rate increase resulting from the incident. Grossly negligent operation (i.e. operating outside RYDA's protocols) shifts the deductible entirely to the at-fault member. Documented in the Operating Agreement.",
  },
  {
    q: "How does the charter (rental) opt-in work?",
    a: "Members can opt their unused entitlement into the charter pool. Defaults: 12 owner-use days kept per share, the rest pooled. Charter occupancy on the boats fleet runs around 35% on a 240-day available pool (84 booked days/yr per hull), and revenue splits 65/35 (members / RYDA) distributed pro-rata. Caribbean season (Dec–Apr) charters are the highest-revenue window for sport yachts and are typically booked solid by mid-October.",
  },
  {
    q: "What's the survey and acquisition process before a boat is listed?",
    a: "Independent marine survey from a SAMS-accredited surveyor; engine borescope and oil analysis (where applicable); rigging survey on sailboats; sea trial under the surveyor and our captain; and a hull haul-out and bottom inspection. The acquisition LLC closes on the boat only after the survey clears. Members receive the full survey report at signing. We do not list a boat where a major item is open.",
  },
  {
    q: "How does Coast Guard documentation work with the LLC?",
    a: "Each boat is documented federally with the US Coast Guard in the LLC's name (e.g. \"Wajer 55 S RYDA LLC\"). Members are not on the document, the LLC is. State sales-tax mitigation strategies (sales-tax-free purchase, offshore documentation, or charter-fleet exemptions where applicable) are evaluated case-by-case with the LLC's tax counsel. RYDA does not provide tax advice; we coordinate with the LLC's accountant.",
  },
  {
    q: "Why a 3-year planned exit?",
    a: "Boats depreciate slowly, with classic models (the Aquariva is the obvious example) sometimes appreciating with the right buyer. A 3-year hold lets us realize a stronger residual on the median sale and aligns with the typical owner usage pattern. The 12-month minimum hold and member-to-member transfer mechanics still apply in case you need to exit earlier.",
  },
];
