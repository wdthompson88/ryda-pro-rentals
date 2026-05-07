// Mock fleet data for the demo phase.
// When the live fleet ships, this file gets replaced by real Supabase
// queries. Keep the same shape so nothing else has to change.

export type Vehicle = {
  symbol: string;          // e.g. "F296" for Ferrari 296
  ticker: string;          // short display ticker
  name: string;            // "Ferrari 296 GTB"
  year: number;
  market: "Miami" | "Los Angeles" | "New York";
  category: "Coupe" | "Convertible" | "GT" | "SUV" | "Hypercar";
  brand: string;
  fullPrice: number;       // total vehicle price
  shares: number;          // total shares (e.g. 6)
  sharesAvailable: number; // shares available right now
  pricePerShare: number;   // current per-share buy-in
  annualOpCost: number;    // per share all-in annual contribution
  annualSoloCarrying: number; // industry-typical carrying cost for solo ownership of this vehicle (insurance + storage + maintenance + depreciation reserve)
  daysPerYear: number;     // entitlement
  milesPerYear: number;    // entitlement
  effectiveDailyCost: number;
  cylinders: number;       // 0 for fully electric
  drive: "RWD" | "AWD";    // drivetrain
  listingStart: string;    // ISO date, "period listing" start
  listingEnd: string;      // ISO date, "period listing" end
  hero: string;            // hero image URL
  flipImage?: boolean;     // mirror horizontally so the car faces right
  imagePosition?: string;  // CSS object-position to center the car in crops (default "center")
  currentMiles: number;    // odometer at present moment
  description: string;
  specs: {
    engine: string;
    power: string;
    zeroToSixty: string;
    topSpeed: string;
    transmission: string;
    color: string;
  };
  // Rental side
  rentalDailyRate: number;
  rentalAvailable: boolean;
  trackEligible: boolean;
  // Rally-anatomy editorial fields. All optional — vehicles without
  // populated values render gracefully (the sections collapse). Lets
  // us roll out per-asset provenance one car at a time without
  // touching the entire fleet.
  provenance?: ProvenanceEvent[];
  conditionCheck?: ConditionItem[];
  pressQuote?: { body: string; source: string };
  // Optional live market-data embed URL (e.g. classic.com widget).
  // Renders an iframe in the "Live market data" section on the
  // listing page. Generic naming so we can swap providers later
  // (Hagerty, BaT, etc.) without renaming. Section gracefully
  // collapses if not set.
  liveMarketEmbed?: string;
};

// One date-stamped event in the vehicle's history. Order from oldest
// to newest. Use ISO month precision (YYYY-MM) — not day — since
// auction listings rarely include the exact day.
export type ProvenanceEvent = {
  date: string;        // "2024-03" or "Mar 2024" — display-as-given
  title: string;       // "Built at Maranello"
  detail: string;      // one-sentence elaboration
};

// Yes/No or short-value originality + condition flags. Inspired by
// Rally's exhaustive originality checklist — single biggest credibility
// signal on a per-asset basis. "passed" or "yes" gets a green check;
// "no" or "modified" gets a neutral icon. Long values render as text.
export type ConditionItem = {
  label: string;       // "Matching numbers"
  value: string;       // "Yes" | "Original" | "Modified — exhaust only"
  passed: boolean;     // true = green check, false = neutral
};

export const VEHICLES: Vehicle[] = [
  // 2023 Porsche 911 GT3 RS — flagship of the new fleet.
  // 8.7K mi, no accidents, North Miami sourced.
  // Photo: Chalk over black, optioned with red Magnesium center-
  // lock wheels and matching red GT3 RS livery decals.
  {
    symbol: "GT3",
    ticker: "GT3",
    name: "Porsche 911 GT3 RS",
    year: 2023,
    market: "Miami",
    category: "Coupe",
    brand: "Porsche",
    fullPrice: 375_000,
    shares: 10,
    sharesAvailable: 8,
    pricePerShare: 37_500,
    annualOpCost: 7_800,
    annualSoloCarrying: 52_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 260,
    cylinders: 6,
    drive: "RWD",
    listingStart: "2026-07-15",
    listingEnd: "2027-01-15",
    hero: "/cars/gt3/1.jpg",
    currentMiles: 8_754,
    description:
      "Type 992 GT3 RS in Chalk over black, factory-spec swan-neck wing, optioned with red Magnesium center-lock wheels and matching GT3 RS livery decals. 518 hp 4.0L flat-six wound to 9,000 rpm. Track-eligible at Homestead-Miami; the most potent road car Porsche builds short of the GT2 RS.",
    specs: {
      engine: "4.0L naturally-aspirated flat-six",
      power: "518 hp",
      zeroToSixty: "3.0s",
      topSpeed: "184 mph",
      transmission: "7-speed PDK",
      color: "Chalk / Black leather · red Magnesium wheels",
    },
    rentalDailyRate: 2_400,
    rentalAvailable: true,
    trackEligible: true,
    liveMarketEmbed: "https://www.classic.com/widget/PZW4xru5ZmOsVQl",
  },
  // 2020 Lamborghini Huracán EVO Spyder
  // Roof-down V10 theater. Pre-LP4 RWD spec.
  // Photo: Nero Noctis over black with contrast red brake calipers,
  // forged gloss-black wheels — the murdered-out spec.
  {
    symbol: "HEVO",
    ticker: "HEVO",
    name: "Lamborghini Huracán EVO Spyder",
    year: 2020,
    market: "Miami",
    category: "Convertible",
    brand: "Lamborghini",
    fullPrice: 229_000,
    shares: 10,
    sharesAvailable: 6,
    pricePerShare: 22_900,
    annualOpCost: 4_800,
    annualSoloCarrying: 40_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 160,
    cylinders: 10,
    drive: "RWD",
    listingStart: "2026-07-22",
    listingEnd: "2027-01-22",
    hero: "/cars/hevo/1.jpg",
    currentMiles: 41_074,
    description:
      "Nero Noctis over black, gloss-black forged wheels, red brake calipers — the all-black spec. The pre-LP4 EVO Spyder in its purer rear-drive configuration: 5.2L V10 unfiltered through quad exhausts. Roof drops in 17 seconds at up to 31 mph; A1A as nature intended.",
    specs: {
      engine: "5.2L naturally-aspirated V10",
      power: "602 hp",
      zeroToSixty: "3.3s",
      topSpeed: "202 mph",
      transmission: "7-speed dual-clutch",
      color: "Nero Noctis / Nero",
    },
    rentalDailyRate: 1_800,
    rentalAvailable: true,
    trackEligible: true,
    liveMarketEmbed: "https://www.classic.com/widget/32VWAJSRxMwtVx",
  },
  // 2010 Ferrari 458 Italia
  // The last NA mid-engine V8 Ferrari. Modern collector status approaching.
  // Photo: Nero Daytona over Nero on aftermarket forged HRE wheels.
  // Note: 1 minor incident reported per Carfax (2018) — fully repaired,
  // PPI-cleared. Disclosed openly on the listing for credibility.
  {
    symbol: "F458",
    ticker: "F458",
    name: "Ferrari 458 Italia",
    year: 2010,
    market: "Miami",
    category: "Coupe",
    brand: "Ferrari",
    fullPrice: 189_000,
    shares: 10,
    sharesAvailable: 7,
    pricePerShare: 18_900,
    annualOpCost: 3_900,
    annualSoloCarrying: 32_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 130,
    cylinders: 8,
    drive: "RWD",
    listingStart: "2026-08-10",
    listingEnd: "2027-02-10",
    hero: "/cars/f458/1.jpg",
    currentMiles: 45_802,
    description:
      "Nero Daytona over Nero on aftermarket forged HRE wheels. The last naturally-aspirated mid-engine V8 Ferrari before turbocharging took over the marque. One minor incident reported in 2018, fully repaired and pre-purchase inspection cleared.",
    specs: {
      engine: "4.5L naturally-aspirated V8",
      power: "562 hp",
      zeroToSixty: "3.4s",
      topSpeed: "202 mph",
      transmission: "7-speed dual-clutch",
      color: "Nero Daytona / Nero",
    },
    rentalDailyRate: 1_400,
    rentalAvailable: true,
    trackEligible: true,
    liveMarketEmbed: "https://www.classic.com/widget/jq6D35IyAJ2sRJY",
  },
  // 2019 Lamborghini Urus
  // The everyday Lamborghini. AWD twin-turbo V8.
  // Photo: Grigio Lynx over Cuoio brown, gloss-black diamond-cut
  // 22-inch wheels.
  // CARFAX 1-Owner.
  {
    symbol: "URS",
    ticker: "URS",
    name: "Lamborghini Urus",
    year: 2019,
    market: "Miami",
    category: "SUV",
    brand: "Lamborghini",
    fullPrice: 161_000,
    shares: 10,
    sharesAvailable: 9,
    pricePerShare: 16_100,
    annualOpCost: 3_400,
    annualSoloCarrying: 24_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 113,
    cylinders: 8,
    drive: "AWD",
    listingStart: "2026-08-25",
    listingEnd: "2027-02-25",
    hero: "/cars/urs/1.jpg",
    currentMiles: 57_434,
    description:
      "Grigio Lynx over Cuoio. CARFAX 1-Owner. The everyday Lamborghini — 641 hp twin-turbo V8, room for five, air suspension lift, Brembo carbon-ceramics on 22-inch diamond-cut gloss-black wheels. School run on Tuesday, A1A on Saturday.",
    specs: {
      engine: "4.0L twin-turbo V8",
      power: "641 hp",
      zeroToSixty: "3.6s",
      topSpeed: "190 mph",
      transmission: "8-speed automatic",
      color: "Grigio Lynx / Cuoio Granato",
    },
    rentalDailyRate: 1_100,
    rentalAvailable: true,
    trackEligible: false,
    liveMarketEmbed: "https://www.classic.com/widget/1r3RypFEOm1FqDx",
  },
  // 2023 Chevrolet Corvette Z06
  // 670-hp flat-plane V8, sub-3s 0-60.
  // Photo: Silver Flare Metallic over Adrenaline Red, gloss-black
  // wheels (Jackie Cooper Imports, Tulsa OK).
  {
    symbol: "Z06",
    ticker: "Z06",
    name: "Chevrolet Corvette Z06",
    year: 2023,
    market: "Miami",
    category: "Coupe",
    brand: "Chevrolet",
    fullPrice: 105_000,
    shares: 10,
    sharesAvailable: 8,
    pricePerShare: 10_500,
    annualOpCost: 2_200,
    annualSoloCarrying: 13_500,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 73,
    cylinders: 8,
    drive: "RWD",
    listingStart: "2026-09-10",
    listingEnd: "2027-03-10",
    hero: "/cars/z06/1.jpg",
    currentMiles: 4_084,
    description:
      "Silver Flare Metallic over Adrenaline Red, on gloss-black wheels. The first flat-plane V8 in a production Corvette: 5.5L LT6 spinning to 8,600 rpm and making 670 hp without a turbo or supercharger. Sub-5K miles. America's mid-engine answer to Maranello.",
    specs: {
      engine: "5.5L flat-plane naturally-aspirated V8",
      power: "670 hp",
      zeroToSixty: "2.6s",
      topSpeed: "195 mph",
      transmission: "8-speed dual-clutch",
      color: "Silver Flare Metallic / Adrenaline Red",
    },
    rentalDailyRate: 850,
    rentalAvailable: true,
    liveMarketEmbed: "https://www.classic.com/widget/7LV4GzuWy6vFr3n",
    trackEligible: true,
  },
  // 2022 Porsche 911 Carrera
  // Porsche Certified Pre-Owned. The most usable car in the fleet.
  // Photo: Aventurine Green Metallic over black (deep gunmetal-
  // green that reads gray in most light), satin-platinum wheels.
  {
    symbol: "P911",
    ticker: "P911",
    name: "Porsche 911 Carrera",
    year: 2022,
    market: "Miami",
    category: "Coupe",
    brand: "Porsche",
    fullPrice: 118_000,
    shares: 10,
    sharesAvailable: 9,
    pricePerShare: 11_800,
    annualOpCost: 2_500,
    annualSoloCarrying: 14_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 83,
    cylinders: 6,
    drive: "RWD",
    listingStart: "2026-09-22",
    listingEnd: "2027-03-22",
    hero: "/cars/p911/1.jpg",
    currentMiles: 10_200,
    description:
      "Aventurine Green Metallic over black (reads as deep gunmetal in most light) on satin-platinum wheels. Type 992 base Carrera, Porsche Certified Pre-Owned. 379 hp 3.0L twin-turbo flat-six — the entry to the 992 platform and arguably the most usable everyday supercar in production. Sport Chrono and Premium packages optioned.",
    specs: {
      engine: "3.0L twin-turbo flat-six",
      power: "379 hp",
      zeroToSixty: "4.0s",
      topSpeed: "182 mph",
      transmission: "8-speed PDK",
      color: "Aventurine Green Metallic / Black leather",
    },
    rentalDailyRate: 700,
    rentalAvailable: true,
    trackEligible: true,
    liveMarketEmbed: "https://www.classic.com/widget/W7o4G0uyxY2sMDj",
  },
];


// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

export function getVehicleBySymbol(symbol: string) {
  return VEHICLES.find(
    (v) => v.symbol.toLowerCase() === symbol.toLowerCase(),
  );
}

export function formatUSD(n: number, opts: { decimals?: number } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────
// certified pre owned doctrine, 2-year planned exit
// ─────────────────────────────────────────────────────────────────────────
// We curate certified pre owned vehicles and hold each one for ~2 years
// OR until the odometer crosses ~60,000 miles, whichever comes first.
// At exit, the LLC sells the car and proceeds are distributed pro-rata.
// Modeled assumption: the curated fleet depreciates ~10% over the
// 2-year hold. We use a flat 10% across drive-only AND rental-opt-in
// scenarios, the number already absorbs the heavier mileage profile
// of the rental path (50% pool occupancy + 100 mi/day allowance
// across both shareholder and rental usage). Per-vehicle depreciation
// curves vary in reality (Aventador Ultimae appreciates, Cullinan
// depreciates faster) but a flat rate keeps the calculator honest
// and simple.
// Members can still transfer their share to another verified member at
// any time after the 12-month minimum hold; the 2-year (or 60K-mile)
// sale is the default exit baseline shown in pricing and calculators.

export const HOLDING_YEARS = 2;
export const HOLDING_MILES_CAP = 60_000; // alt sale trigger (~60K-75K depending on certified pre owned program)
export const TARGET_DEPRECIATION_PCT = 10; // % over the full 2-year hold

// Standard shareholder mileage allowance, matches GM LUXE & industry
// norm. 30 days × 100 mi/day = 3,000 mi/yr per share (matches DAYS_PER_SHARE
// + MILES_PER_DAY_PER_SHARE constants below; vehicle records use
// daysPerYear: 30, milesPerYear: 3_000).
export const MILES_PER_DAY_PER_SHARE = 100;
export const DAYS_PER_SHARE = 30;

// ─────────────────────────────────────────────────────────────────────────
// BOOKING POLICY, two-tier scheduling (inspired by Pacaso SmartStay)
// ─────────────────────────────────────────────────────────────────────────
// We split bookings into two clear modes so members can reason about the
// calendar without hunting through a wall of rules:
//
//   1. SHORT-NOTICE DRIVES, "it's sunny this weekend"
//      The closer-in window. Quick, opportunistic, unlimited in count
//      so long as the calendar is open. A hard cap on consecutive days
//      keeps short-notice from monopolising peak weekends.
//
//   2. PLANNED DRIVES, "I'm planning my Hamptons run in August"
//      The longer-horizon window. Each share gets a fixed number of
//      active reservations at any given time, so the queue stays fair.
//      Consecutive-day caps are higher than short-notice (peak: 7 / off
//      peak: 14) so members can take genuine trips.
//
// Both modes consume the share's annual entitlement (DAYS_PER_SHARE,
// MILES_PER_DAY_PER_SHARE). The split is a UX/fairness layer, not a
// separate quota.
//
// PEAK PROTECTION: each share gets one "protected peak window" before
// any single co-owner can book a second peak slot, so dominant
// schedulers can't lock down the calendar.

export const BOOKING_POLICY = {
  shortNotice: {
    minDaysAdvance: 1,
    maxDaysAdvance: 7,
    maxConsecutiveDays: 3,
    activeLimitPerShare: null, // unlimited so long as calendar is open
  },
  planned: {
    minDaysAdvance: 8,
    maxDaysAdvance: 365,
    maxConsecutiveDaysPeak: 7,
    maxConsecutiveDaysOffPeak: 14,
    activeLimitPerShare: 4,
  },
  peakProtection: {
    protectedWindowsPerShare: 1, // 1 protected peak window per share
    description:
      "One protected peak weekend or event window per share before any co-owner can book a second.",
  },
  // Annotated peak periods, Miami today; LA / NY when we list those
  // markets. Pulled into the calendar for visual treatment + warning
  // copy when a member tries to book a peak slot they're not entitled
  // to under peak protection.
  peakWindows: {
    Miami: [
      { label: "Miami Grand Prix", monthsApprox: "May" },
      { label: "Art Basel", monthsApprox: "Dec" },
      { label: "Spring Break", monthsApprox: "Mar" },
      { label: "Holiday week", monthsApprox: "Dec 24 – Jan 2" },
    ],
    "Los Angeles": [
      { label: "Goodwood week / Pebble", monthsApprox: "Aug" },
      { label: "Holiday week", monthsApprox: "Dec 24 – Jan 2" },
    ],
    "New York": [
      { label: "Hamptons summer", monthsApprox: "Jul – Aug" },
      { label: "Holiday week", monthsApprox: "Dec 24 – Jan 2" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// MARKETS, for portfolio grouping
// ─────────────────────────────────────────────────────────────────────────
// Pacaso groups inventory by destination first; we group by US market.
// Used by the portfolio page to lay out "Miami flagship" / "LA coming"
// / "NY coming" sections. `status` drives whether the section shows a
// "launching in [date]" tag.

export type MarketKey = "Miami" | "Los Angeles" | "New York";
export type MarketStatus = "live" | "coming-2027";

export const MARKETS: Record<
  MarketKey,
  {
    label: string;
    status: MarketStatus;
    launchLabel?: string; // shown when status === "coming-2027"
    blurb: string;
    hero: string; // image URL for the market header
  }
> = {
  Miami: {
    label: "Miami",
    status: "live",
    blurb:
      "Highest US per-capita exotic density. Year-round driving, no state income tax. Our Miami flagship fleet runs out of a climate-controlled Wynwood facility.",
    hero: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=2000&q=80",
  },
  "Los Angeles": {
    label: "Los Angeles",
    status: "coming-2027",
    launchLabel: "Q2 2027",
    blurb:
      "Mulholland, Pebble, the canyons. The LA fleet leans coupe-heavy with a track-eligible bias and our Pasadena storage partner.",
    hero: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=2000&q=80",
  },
  "New York": {
    label: "New York",
    status: "coming-2027",
    launchLabel: "Q4 2027",
    blurb:
      "Hamptons summer, Hudson Valley fall, Manhattan winter garage. NY skews GT and SUV, cars built for the road from East 79th to Sag Harbor.",
    hero: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=2000&q=80",
  },
};

export function getVehiclesByMarket(market: MarketKey): Vehicle[] {
  return VEHICLES.filter((v) => v.market === market);
}

export type ShareEconomics = {
  shares: number;
  holdYears: number;
  depreciationPct: number;
  buyIn: number;          // pricePerShare × shares
  annualCarrying: number; // annualOpCost × shares (per year)
  totalCarrying: number;  // annualCarrying × holdYears
  totalSpend: number;     // buyIn + totalCarrying
  estimatedResale: number;// buyIn × (1 − depreciationPct/100)
  netCost: number;        // totalSpend − estimatedResale
  totalDays: number;      // daysPerYear × shares × holdYears
  netPerDay: number;      // netCost / totalDays (rounded)
  carryingPerDay: number; // annualOpCost / daysPerYear (rounded)
};

/**
 * Two-year share economics with the resale baked in. Defaults to one
 * share, the doctrinal 2-year hold, and the 10% depreciation model.
 */
// ─────────────────────────────────────────────────────────────────────────
// Rental opt-in (shareholders can pool unused days into the rental program)
// ─────────────────────────────────────────────────────────────────────────
// Miami exotic-rental fleets average ~200–240 booked days/yr. RYDA lets
// shareholders opt their unused entitlement into the rental pool. Revenue
// is split: RYDA keeps a management fee (operations + booking + insurance
// admin + a damage reserve), shareholders keep the rest, distributed
// pro-rata to the days each share contributes.
//
// Depreciation is held constant at TARGET_DEPRECIATION_PCT across both
// drive-only and rental scenarios, our certified pre owned maintenance + curated mileage
// caps keep the resale story consistent.

export const RENTAL_DEFAULTS = {
  // Total non-service days available in a year
  daysAvailablePerYear: 320,
  // What % of POOLED days actually book. Members get first call on the
  // calendar, so the pool is the leftover (mostly weekday/off-peak)
  // days, harder to fill than a fully-controlled rental fleet's
  // calendar. Industry fleet averages run 200–240 booked days/yr on
  // 320 available days (~60–70%); the leftover-pool reality is lower.
  // 50% on a 200-day pool = 100 booked days = ~220 active days/yr
  // total when combined with member-driven days. Honest middle.
  defaultOccupancyPct: 50,
  // Owners realistically keep some days for themselves before pooling.
  defaultOwnerUseDaysPerShare: 12,
  // RYDA's cut covers operations, booking, insurance admin, damage
  // reserve. Members net the rest.
  defaultManagementFeePct: 35,
};

export type RentalEconomics = {
  ownerUseDaysPerShare: number;   // days each share-holder keeps for self
  ownerUseDaysTotal: number;      // × shares-issued (usually 10)
  rentablePoolDays: number;       // 320 − ownerUseDaysTotal
  occupancyPct: number;
  bookedDays: number;             // rentablePoolDays × occupancyPct
  dailyRate: number;
  grossRevenue: number;           // bookedDays × dailyRate
  managementFeePct: number;
  rydaTake: number;               // grossRevenue × mgmtFeePct
  shareholderPool: number;        // grossRevenue − rydaTake
  perShareAnnualIncome: number;   // shareholderPool / shares
  perShareTotalIncome: number;    // × holdYears (for the 2-yr math)
  carryingOffsetPct: number;      // perShareAnnualIncome / annualOpCost
};

export function computeRentalEconomics(
  v: Vehicle,
  opts: {
    holdYears?: number;
    occupancyPct?: number;
    ownerUseDaysPerShare?: number;
    managementFeePct?: number;
    dailyRate?: number;
  } = {},
): RentalEconomics {
  const holdYears = opts.holdYears ?? HOLDING_YEARS;
  const occupancyPct = opts.occupancyPct ?? RENTAL_DEFAULTS.defaultOccupancyPct;
  const ownerUseDaysPerShare =
    opts.ownerUseDaysPerShare ?? RENTAL_DEFAULTS.defaultOwnerUseDaysPerShare;
  const managementFeePct =
    opts.managementFeePct ?? RENTAL_DEFAULTS.defaultManagementFeePct;
  const dailyRate = opts.dailyRate ?? v.rentalDailyRate ?? 2_500;

  const ownerUseDaysTotal = ownerUseDaysPerShare * v.shares;
  const rentablePoolDays = Math.max(
    0,
    RENTAL_DEFAULTS.daysAvailablePerYear - ownerUseDaysTotal,
  );
  const bookedDays = Math.round(rentablePoolDays * (occupancyPct / 100));
  const grossRevenue = bookedDays * dailyRate;
  const rydaTake = Math.round(grossRevenue * (managementFeePct / 100));
  const shareholderPool = grossRevenue - rydaTake;
  const perShareAnnualIncome = Math.round(shareholderPool / v.shares);
  const perShareTotalIncome = perShareAnnualIncome * holdYears;
  const carryingOffsetPct =
    v.annualOpCost === 0
      ? 0
      : Math.round((perShareAnnualIncome / v.annualOpCost) * 100);

  return {
    ownerUseDaysPerShare,
    ownerUseDaysTotal,
    rentablePoolDays,
    occupancyPct,
    bookedDays,
    dailyRate,
    grossRevenue,
    managementFeePct,
    rydaTake,
    shareholderPool,
    perShareAnnualIncome,
    perShareTotalIncome,
    carryingOffsetPct,
  };
}

export function computeShareEconomics(
  v: Vehicle,
  opts: {
    shares?: number;
    holdYears?: number;
    depreciationPct?: number;
  } = {},
): ShareEconomics {
  const shares = opts.shares ?? 1;
  const holdYears = opts.holdYears ?? HOLDING_YEARS;
  const depreciationPct = opts.depreciationPct ?? TARGET_DEPRECIATION_PCT;

  const buyIn = v.pricePerShare * shares;
  const annualCarrying = v.annualOpCost * shares;
  const totalCarrying = annualCarrying * holdYears;
  const totalSpend = buyIn + totalCarrying;

  const residualPct = (100 - depreciationPct) / 100;
  const estimatedResale = Math.round(buyIn * residualPct);

  const netCost = totalSpend - estimatedResale;
  const totalDays = v.daysPerYear * shares * holdYears;
  const netPerDay = totalDays > 0 ? Math.round(netCost / totalDays) : 0;
  const carryingPerDay =
    v.daysPerYear > 0 ? Math.round(v.annualOpCost / v.daysPerYear) : 0;

  return {
    shares,
    holdYears,
    depreciationPct,
    buyIn,
    annualCarrying,
    totalCarrying,
    totalSpend,
    estimatedResale,
    netCost,
    totalDays,
    netPerDay,
    carryingPerDay,
  };
}

