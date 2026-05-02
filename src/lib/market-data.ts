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
  listingStart: string;    // ISO date — "period listing" start
  listingEnd: string;      // ISO date — "period listing" end
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
};

export const VEHICLES: Vehicle[] = [
  {
    symbol: "F296",
    ticker: "F296",
    name: "Ferrari 296 GTB",
    year: 2024,
    market: "Miami",
    category: "Coupe",
    brand: "Ferrari",
    fullPrice: 340_000,
    shares: 10,
    sharesAvailable: 4,
    pricePerShare: 34_000,
    annualOpCost: 7_080,
    annualSoloCarrying: 46_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 236,
    cylinders: 6,
    drive: "AWD",
    listingStart: "2026-04-15",
    listingEnd: "2026-10-15",
    hero: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1920&q=80",
    currentMiles: 14_280,
    description:
      "The Ferrari 296 GTB redefines the modern V6, paired with a plug-in hybrid system delivering 830 hp. Our example is finished in Rosso Corsa with Nero Alcantara interior, full carbon package, and lift system.",
    specs: {
      engine: "3.0L twin-turbo V6 + dual electric motors",
      power: "830 hp",
      zeroToSixty: "2.9s",
      topSpeed: "205 mph",
      transmission: "8-speed dual-clutch",
      color: "Rosso Corsa / Nero Alcantara",
    },
    rentalDailyRate: 2_400,
    rentalAvailable: true,
    trackEligible: true,
  },
  {
    symbol: "L780",
    ticker: "L780",
    name: "Lamborghini Aventador Ultimae",
    year: 2022,
    market: "Miami",
    category: "Convertible",
    brand: "Lamborghini",
    fullPrice: 900_000,
    shares: 10,
    sharesAvailable: 3,
    pricePerShare: 90_000,
    annualOpCost: 14_200,
    annualSoloCarrying: 48_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 473,
    cylinders: 12,
    drive: "AWD",
    listingStart: "2026-03-30",
    listingEnd: "2026-09-30",
    hero: "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1920&q=80",
    currentMiles: 23_650,
    description:
      "The final naturally-aspirated V12 Aventador. Our Ultimae Roadster is one of 250 produced worldwide.",
    specs: {
      engine: "6.5L naturally-aspirated V12",
      power: "780 hp",
      zeroToSixty: "2.8s",
      topSpeed: "221 mph",
      transmission: "7-speed ISR",
      color: "Verde Selvans / Nero Ade",
    },
    rentalDailyRate: 4_500,
    rentalAvailable: true,
    trackEligible: false,
  },
  {
    symbol: "MC75",
    ticker: "MC75",
    name: "McLaren 750S Spider",
    year: 2024,
    market: "Los Angeles",
    category: "Convertible",
    brand: "McLaren",
    fullPrice: 376_000,
    shares: 10,
    sharesAvailable: 7,
    pricePerShare: 37_600,
    annualOpCost: 6_900,
    annualSoloCarrying: 50_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 230,
    cylinders: 8,
    drive: "RWD",
    listingStart: "2026-04-22",
    listingEnd: "2026-10-22",
    hero: "https://images.unsplash.com/photo-1740806417439-490dba0d926a?auto=format&fit=crop&w=1920&q=80",
    currentMiles: 11_840,
    flipImage: true,
    description:
      "The lightest, most powerful series-production McLaren ever. Spider configuration with carbon roof.",
    specs: {
      engine: "4.0L twin-turbo V8",
      power: "740 hp",
      zeroToSixty: "2.7s",
      topSpeed: "206 mph",
      transmission: "7-speed SSG",
      color: "Pearl White / Carbon Black",
    },
    rentalDailyRate: 2_800,
    rentalAvailable: true,
    trackEligible: true,
  },
  {
    symbol: "RRC",
    ticker: "RRC",
    name: "Rolls-Royce Cullinan Black Badge",
    year: 2023,
    market: "New York",
    category: "SUV",
    brand: "Rolls-Royce",
    fullPrice: 480_000,
    shares: 10,
    sharesAvailable: 4,
    pricePerShare: 48_000,
    annualOpCost: 11_840,
    annualSoloCarrying: 58_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 395,
    cylinders: 12,
    drive: "AWD",
    listingStart: "2026-04-10",
    listingEnd: "2026-10-10",
    hero: "https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=1920&q=80",
    imagePosition: "center 65%",
    currentMiles: 18_320,
    description:
      "Black Badge Cullinan with Starlight Headliner and bespoke interior. Ideal for the long-distance gentleman driver.",
    specs: {
      engine: "6.75L twin-turbo V12",
      power: "600 hp",
      zeroToSixty: "5.0s",
      topSpeed: "155 mph",
      transmission: "8-speed automatic",
      color: "Diamond Black / Mandarin",
    },
    rentalDailyRate: 1_800,
    rentalAvailable: true,
    trackEligible: false,
  },
  {
    symbol: "812",
    ticker: "812",
    name: "Ferrari 812 GTS",
    year: 2023,
    market: "Miami",
    category: "Convertible",
    brand: "Ferrari",
    fullPrice: 510_000,
    shares: 10,
    sharesAvailable: 0,
    pricePerShare: 51_000,
    annualOpCost: 10_560,
    annualSoloCarrying: 36_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 352,
    cylinders: 12,
    drive: "RWD",
    listingStart: "2026-03-15",
    listingEnd: "2026-09-15",
    hero: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1920&q=80",
    currentMiles: 16_450,
    flipImage: true,
    description:
      "The last front-engined V12 Ferrari. Roof-down, 800 horses on tap.",
    specs: {
      engine: "6.5L naturally-aspirated V12",
      power: "800 hp",
      zeroToSixty: "2.9s",
      topSpeed: "211 mph",
      transmission: "7-speed dual-clutch",
      color: "Rosso Maranello / Crema",
    },
    rentalDailyRate: 3_200,
    rentalAvailable: true,
    trackEligible: false,
  },
  {
    symbol: "AM-V",
    ticker: "AM-V",
    name: "Aston Martin Valhalla",
    year: 2025,
    market: "New York",
    category: "Hypercar",
    brand: "Aston Martin",
    fullPrice: 1_190_000,
    shares: 10,
    sharesAvailable: 5,
    pricePerShare: 119_000,
    annualOpCost: 26_580,
    annualSoloCarrying: 62_000,
    daysPerYear: 30,
    milesPerYear: 3_000,
    effectiveDailyCost: 886,
    cylinders: 8,
    drive: "AWD",
    listingStart: "2026-04-25",
    listingEnd: "2026-10-25",
    hero: "/cars/aston-valhalla.webp",
    flipImage: true,
    currentMiles: 3_510,
    description:
      "Aston Martin's first true hypercar. Plug-in hybrid V8 with 1,080 hp. One of 999 worldwide.",
    specs: {
      engine: "4.0L twin-turbo V8 + dual electric motors",
      power: "1,080 hp",
      zeroToSixty: "2.5s",
      topSpeed: "217 mph",
      transmission: "8-speed dual-clutch",
      color: "Lunar White / Carbon Onyx",
    },
    rentalDailyRate: 8_500,
    rentalAvailable: true,
    trackEligible: true,
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
// certified pre owned doctrine — 2-year planned exit
// ─────────────────────────────────────────────────────────────────────────
// We curate certified pre owned vehicles and hold each one for ~2 years
// OR until the odometer crosses ~50,000 miles, whichever comes first.
// At exit, the LLC sells the car and proceeds are distributed pro-rata.
// Modeled assumption: the curated fleet depreciates ~10% over the
// 2-year hold. We use a flat 10% across drive-only AND rental-opt-in
// scenarios — the number already absorbs the heavier mileage profile
// of the rental path (50% pool occupancy + 100 mi/day allowance
// across both shareholder and rental usage). Per-vehicle depreciation
// curves vary in reality (Aventador Ultimae appreciates, Cullinan
// depreciates faster) but a flat rate keeps the calculator honest
// and simple.
// Members can still transfer their share to another verified member at
// any time after the 12-month minimum hold; the 2-year (or 50K-mile)
// sale is the default exit baseline shown in pricing and calculators.

export const HOLDING_YEARS = 2;
export const HOLDING_MILES_CAP = 50_000; // alt sale trigger: whichever comes first
export const TARGET_DEPRECIATION_PCT = 10; // % over the full 2-year hold

// Standard shareholder mileage allowance — matches GM LUXE & industry
// norm. 32 days × 100 mi/day = 3,200 mi/yr per share.
export const MILES_PER_DAY_PER_SHARE = 100;
export const DAYS_PER_SHARE = 30;

// ─────────────────────────────────────────────────────────────────────────
// BOOKING POLICY — two-tier scheduling (inspired by Pacaso SmartStay)
// ─────────────────────────────────────────────────────────────────────────
// We split bookings into two clear modes so members can reason about the
// calendar without hunting through a wall of rules:
//
//   1. SHORT-NOTICE DRIVES — "it's sunny this weekend"
//      The closer-in window. Quick, opportunistic, unlimited in count
//      so long as the calendar is open. A hard cap on consecutive days
//      keeps short-notice from monopolising peak weekends.
//
//   2. PLANNED DRIVES — "I'm planning my Hamptons run in August"
//      The longer-horizon window. Each share gets a fixed number of
//      active reservations at any given time, so the queue stays fair.
//      Consecutive-day caps are higher than short-notice (peak: 7 / off
//      peak: 14) so members can take genuine trips.
//
// Both modes consume the share's annual entitlement (DAYS_PER_SHARE,
// MILES_PER_DAY_PER_SHARE). The split is a UX/fairness layer — not a
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
  // Annotated peak periods — Miami today; LA / NY when we list those
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
// MARKETS — for portfolio grouping
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
      "Hamptons summer, Hudson Valley fall, Manhattan winter garage. NY skews GT and SUV — cars built for the road from East 79th to Sag Harbor.",
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
// drive-only and rental scenarios — our certified pre owned maintenance + curated mileage
// caps keep the resale story consistent.

export const RENTAL_DEFAULTS = {
  // Total non-service days available in a year
  daysAvailablePerYear: 340,
  // What % of POOLED days actually book. Members get first call on the
  // calendar, so the pool is the leftover (mostly weekday/off-peak)
  // days — harder to fill than a fully-controlled rental fleet's
  // calendar. Industry fleet averages run 200–240 booked days/yr on
  // 340 available days (~60–70%); the leftover-pool reality is lower.
  // 50% on a 220-day pool = 110 booked days = ~230 active days/yr
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
  rentablePoolDays: number;       // 340 − ownerUseDaysTotal
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

