// Boat fleet data — RYDA Boats vertical.
// Mirrors src/lib/market-data.ts (cars) so the boats surfaces can use
// equivalent helpers and types. Boats parity intentionally close to
// cars where it makes sense (10 shares, 30 days/share/yr, two-tier
// booking) and explicitly different where the asset class demands it
// (3-year hold vs cars' 2, 1500 nm/yr instead of miles, captain
// included by default, peak protection adapted for boating season).

import { formatUSD } from "@/lib/market-data";

export type Boat = {
  slug: string;             // URL slug, e.g. "wajer-55s"
  hullId: string;           // short ticker, e.g. "W55"
  name: string;             // full display, e.g. "Wajer 55 S"
  brand: string;
  model: string;
  year: number;
  category:
    | "Center Console"
    | "Day Cruiser"
    | "Sport Yacht"
    | "Sailing Catamaran"
    | "Sportfisher";
  market: "Miami" | "Los Angeles" | "New York";
  hailingPort: string;       // marina, e.g. "Miami Beach Marina"

  // Hull dimensions
  lengthFt: number;
  beamFt: number;
  draftFt: number;

  // Performance
  maxSpeedKnots: number;
  cruiseSpeedKnots: number;
  rangeNm: number;
  engines: string;
  totalHp: number;

  // Capacity
  capacity: number;          // day-passenger headcount
  sleeps: number;            // overnight berths (0 for day boats)

  // Economics
  fullPrice: number;
  shares: number;            // always 10 for parity with cars
  sharesAvailable: number;
  pricePerShare: number;
  annualOpCost: number;      // per share, all-in
  annualSoloCarrying: number; // industry-typical solo carrying for that boat
  daysPerYear: number;
  nmPerYear: number;         // nautical-miles allowance per share
  effectiveDailyCost: number;

  // Listing window
  listingStart: string;      // ISO
  listingEnd: string;        // ISO

  // Visual
  hero: string;              // Unsplash photo URL
  flipImage?: boolean;
  imagePosition?: string;

  // Operational
  currentEngineHours: number;
  description: string;
  specs: {
    engine: string;
    power: string;
    topSpeed: string;
    range: string;
    fuelCap: string;
    waterCap: string;
  };

  // Charter side
  rentalDailyRate: number;
  rentalAvailable: boolean;
  captainIncluded: boolean;  // true = crewed only, false = bareboat option
};

// ─────────────────────────────────────────────────────────────────────────
// THE FLEET
// ─────────────────────────────────────────────────────────────────────────
// Four boats. The same four show up on both the co-own portfolio and
// the rentals page (ownership and charter access on the same hulls).

export const BOATS: Boat[] = [
  {
    slug: "wajer-55s",
    hullId: "W55",
    name: "Wajer 55 S",
    brand: "Wajer",
    model: "55 S",
    year: 2024,
    category: "Day Cruiser",
    market: "Miami",
    hailingPort: "Miami Beach Marina",
    lengthFt: 55,
    beamFt: 15.4,
    draftFt: 3.6,
    maxSpeedKnots: 45,
    cruiseSpeedKnots: 32,
    rangeNm: 320,
    engines: "Triple Volvo Penta IPS 800",
    totalHp: 1_800,
    capacity: 12,
    sleeps: 4,
    fullPrice: 1_950_000,
    shares: 10,
    sharesAvailable: 5,
    pricePerShare: 195_000,
    annualOpCost: 32_000,
    annualSoloCarrying: 380_000,
    daysPerYear: 30,
    nmPerYear: 1_500,
    effectiveDailyCost: 1_067,
    listingStart: "2026-04-15",
    listingEnd: "2026-10-15",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1920&q=80",
    currentEngineHours: 280,
    description:
      "The Wajer 55 S is the modern Day Cruiser benchmark — Dutch build quality, three-engine IPS pod drive, and a layout designed for fast-paced bay days and Bimini runs. Ours is finished in Wajer Grey with cream upholstery and a teak deck.",
    specs: {
      engine: "Triple Volvo Penta IPS 800",
      power: "1,800 hp combined",
      topSpeed: "45 knots",
      range: "320 nm @ 32 kts",
      fuelCap: "660 gal",
      waterCap: "120 gal",
    },
    rentalDailyRate: 14_500,
    rentalAvailable: true,
    captainIncluded: true,
  },
  {
    slug: "pershing-6x",
    hullId: "P6X",
    name: "Pershing 6X",
    brand: "Pershing",
    model: "6X",
    year: 2023,
    category: "Sport Yacht",
    market: "Miami",
    hailingPort: "Island Gardens, Miami",
    lengthFt: 64,
    beamFt: 16.2,
    draftFt: 4.5,
    maxSpeedKnots: 48,
    cruiseSpeedKnots: 36,
    rangeNm: 350,
    engines: "Twin MAN V12 1550 + Top System surface drives",
    totalHp: 3_100,
    capacity: 14,
    sleeps: 6,
    fullPrice: 4_200_000,
    shares: 10,
    sharesAvailable: 3,
    pricePerShare: 420_000,
    annualOpCost: 78_000,
    annualSoloCarrying: 880_000,
    daysPerYear: 30,
    nmPerYear: 1_500,
    effectiveDailyCost: 2_600,
    listingStart: "2026-03-30",
    listingEnd: "2026-09-30",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1920&q=80",
    flipImage: true,
    imagePosition: "center 40%",
    currentEngineHours: 410,
    description:
      "The Pershing 6X is the marquee sport yacht in our Miami fleet — surface drives for blistering bay-to-Bimini runs, three-cabin layout, and a beach-club aft platform that converts the swim step into a full lounge.",
    specs: {
      engine: "Twin MAN V12 1550",
      power: "3,100 hp combined",
      topSpeed: "48 knots",
      range: "350 nm @ 36 kts",
      fuelCap: "1,200 gal",
      waterCap: "210 gal",
    },
    rentalDailyRate: 32_000,
    rentalAvailable: true,
    captainIncluded: true,
  },
  {
    slug: "riva-aquariva-super",
    hullId: "RAS",
    name: "Riva Aquariva Super",
    brand: "Riva",
    model: "Aquariva Super",
    year: 2022,
    category: "Day Cruiser",
    market: "Miami",
    hailingPort: "Sunset Harbour Yacht Club",
    lengthFt: 33,
    beamFt: 8.5,
    draftFt: 2.6,
    maxSpeedKnots: 41,
    cruiseSpeedKnots: 30,
    rangeNm: 200,
    engines: "Twin Yanmar 8LV-370",
    totalHp: 740,
    capacity: 8,
    sleeps: 0,
    fullPrice: 750_000,
    shares: 10,
    sharesAvailable: 7,
    pricePerShare: 75_000,
    annualOpCost: 18_000,
    annualSoloCarrying: 165_000,
    daysPerYear: 30,
    nmPerYear: 1_500,
    effectiveDailyCost: 600,
    listingStart: "2026-04-22",
    listingEnd: "2026-10-22",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1920&q=80",
    imagePosition: "center 70%",
    currentEngineHours: 165,
    description:
      "The Aquariva is the most photographable boat in Italian history. Mahogany hull, polished stainless detailing, twin Yanmars to fly across the bay. A day boat for a member who wants something timeless.",
    specs: {
      engine: "Twin Yanmar 8LV-370",
      power: "740 hp combined",
      topSpeed: "41 knots",
      range: "200 nm @ 30 kts",
      fuelCap: "180 gal",
      waterCap: "30 gal",
    },
    rentalDailyRate: 8_500,
    rentalAvailable: true,
    captainIncluded: true,
  },
  {
    slug: "lagoon-50",
    hullId: "L50",
    name: "Lagoon 50",
    brand: "Lagoon",
    model: "50",
    year: 2024,
    category: "Sailing Catamaran",
    market: "Miami",
    hailingPort: "Coconut Grove Sailing Club",
    lengthFt: 50,
    beamFt: 26.6,
    draftFt: 4.6,
    maxSpeedKnots: 12,
    cruiseSpeedKnots: 8,
    rangeNm: 1_400,
    engines: "Twin Yanmar 4JH80",
    totalHp: 160,
    capacity: 10,
    sleeps: 8,
    fullPrice: 1_200_000,
    shares: 10,
    sharesAvailable: 4,
    pricePerShare: 120_000,
    annualOpCost: 28_000,
    annualSoloCarrying: 250_000,
    daysPerYear: 30,
    nmPerYear: 1_500,
    effectiveDailyCost: 933,
    listingStart: "2026-04-10",
    listingEnd: "2026-10-10",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1920&q=80",
    flipImage: true,
    imagePosition: "center 25%",
    currentEngineHours: 220,
    description:
      "The Lagoon 50 is built for distance. Four-cabin layout with crew quarters, full bluewater rig, generator and watermaker — capable of multi-day Bahamas runs without thinking about fuel or supplies.",
    specs: {
      engine: "Twin Yanmar 4JH80",
      power: "160 hp combined",
      topSpeed: "12 knots under power",
      range: "1,400 nm under power · unlimited under sail",
      fuelCap: "210 gal",
      waterCap: "200 gal + watermaker",
    },
    rentalDailyRate: 9_800,
    rentalAvailable: true,
    captainIncluded: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// CONSTANTS — boat-side doctrine
// ─────────────────────────────────────────────────────────────────────────
// Boats hold longer than cars (3 vs 2 years) because the asset class
// has a slower depreciation curve and members typically build a
// stronger relationship with a boat. We model 15% depreciation across
// the 3-year hold — slightly steeper than the curated CPO car fleet's
// 10% across 2 years, but still conservative for sport-yacht categories.

export const BOATS_HOLDING_YEARS = 3;
export const BOATS_TARGET_DEPRECIATION_PCT = 15;
export const NM_PER_DAY_PER_SHARE = 50; // 30 days × 50 nm = 1,500 nm/yr
export const BOATS_DAYS_PER_SHARE = 30;
// Engine-hours equivalent of cars' 50K-mile cap. ~2,000 engine hours
// is the conventional threshold where major service (engines, rigging,
// running gear) starts to dominate the carrying cost — the LLC sells
// at year 3 OR 2,000 hrs, whichever hits first.
export const BOATS_HOLDING_HOURS_CAP = 2_000;

// ─────────────────────────────────────────────────────────────────────────
// BOOKING POLICY — same two-tier shape as cars, adapted for boating
// ─────────────────────────────────────────────────────────────────────────
// Boat windows are tighter. Short-notice has a 1-3 day window (weather
// matters — booking a boat 7 days out is closer to "planned"). Planned
// caps at 6 months ahead. Off-peak runs aren't really off in Miami,
// so the off-peak consecutive cap is generous.

export const BOAT_BOOKING_POLICY = {
  shortNotice: {
    minDaysAdvance: 1,
    maxDaysAdvance: 3,
    maxConsecutiveDays: 2,
    activeLimitPerShare: null, // unlimited so long as calendar is open
  },
  planned: {
    minDaysAdvance: 4,
    maxDaysAdvance: 180,
    maxConsecutiveDaysPeak: 5,
    maxConsecutiveDaysOffPeak: 10,
    activeLimitPerShare: 4,
  },
  peakProtection: {
    protectedWindowsPerShare: 1,
    description:
      "One protected peak window per share before any co-owner can book a second.",
  },
  peakWindows: {
    Miami: [
      { label: "Memorial Day weekend", monthsApprox: "May" },
      { label: "July 4 weekend", monthsApprox: "Jul" },
      { label: "Miami Boat Week", monthsApprox: "Feb" },
      { label: "Holiday week", monthsApprox: "Dec 24 – Jan 2" },
    ],
    "Los Angeles": [
      { label: "July 4 weekend", monthsApprox: "Jul" },
      { label: "Labor Day weekend", monthsApprox: "Sep" },
    ],
    "New York": [
      { label: "July 4 weekend", monthsApprox: "Jul" },
      { label: "Hamptons summer", monthsApprox: "Jul – Aug" },
      { label: "Labor Day weekend", monthsApprox: "Sep" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// MARKETS — for portfolio grouping
// ─────────────────────────────────────────────────────────────────────────

export type BoatMarketKey = "Miami" | "Los Angeles" | "New York";
export type BoatMarketStatus = "live" | "coming-2027";

export const BOAT_MARKETS: Record<
  BoatMarketKey,
  {
    label: string;
    status: BoatMarketStatus;
    launchLabel?: string;
    blurb: string;
    hero: string;
  }
> = {
  // Market hero photos all share the confirmed-working yacht photo at
  // different position crops. We swap to vertical-specific imagery once
  // brand-approved assets are licensed.
  Miami: {
    label: "Miami",
    status: "live",
    blurb:
      "Biscayne Bay flagship. Stiltsville lunch runs, Bimini in two hours, full hurricane prep through our Coconut Grove partner yard. Fleet operates Apr–Nov in market, hauls Dec–Mar.",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
  },
  "Los Angeles": {
    label: "Los Angeles",
    status: "coming-2027",
    launchLabel: "Q3 2027",
    blurb:
      "Marina del Rey flagship with Catalina runs, Newport Harbor day trips, and Channel Islands overnighters. Year-round-able with the right hull.",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
  },
  "New York": {
    label: "New York",
    status: "coming-2027",
    launchLabel: "Q2 2027",
    blurb:
      "Sag Harbor + Hudson + Long Island Sound. Northeast summer season runs Apr–Oct; winter haul-out at our Connecticut yard partner.",
    hero:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// CHARTER (rental) defaults
// ─────────────────────────────────────────────────────────────────────────
// Boats are seasonal. ~4 months are spent hauled out for hurricane prep
// or off-season storage. Charter occupancy is materially lower than car
// rental occupancy — boats book only on good-weather days and crew
// availability is a hard constraint.

export const RENTAL_DEFAULTS_BOATS = {
  daysAvailablePerYear: 240,
  defaultOccupancyPct: 35,
  defaultOwnerUseDaysPerShare: 12,
  defaultManagementFeePct: 35,
};

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────

export function getBoatBySlug(slug: string): Boat | undefined {
  return BOATS.find((b) => b.slug.toLowerCase() === slug.toLowerCase());
}

export function getBoatsByMarket(market: BoatMarketKey): Boat[] {
  return BOATS.filter((b) => b.market === market);
}

export type BoatShareEconomics = {
  shares: number;
  holdYears: number;
  depreciationPct: number;
  buyIn: number;
  annualCarrying: number;
  totalCarrying: number;
  totalSpend: number;
  estimatedResale: number;
  netCost: number;
  totalDays: number;
  netPerDay: number;
  carryingPerDay: number;
};

export function computeBoatShareEconomics(
  b: Boat,
  opts: {
    shares?: number;
    holdYears?: number;
    depreciationPct?: number;
  } = {},
): BoatShareEconomics {
  const shares = opts.shares ?? 1;
  const holdYears = opts.holdYears ?? BOATS_HOLDING_YEARS;
  const depreciationPct = opts.depreciationPct ?? BOATS_TARGET_DEPRECIATION_PCT;

  const buyIn = b.pricePerShare * shares;
  const annualCarrying = b.annualOpCost * shares;
  const totalCarrying = annualCarrying * holdYears;
  const totalSpend = buyIn + totalCarrying;

  const residualPct = (100 - depreciationPct) / 100;
  const estimatedResale = Math.round(buyIn * residualPct);

  const netCost = totalSpend - estimatedResale;
  const totalDays = b.daysPerYear * shares * holdYears;
  const netPerDay = totalDays > 0 ? Math.round(netCost / totalDays) : 0;
  const carryingPerDay =
    b.daysPerYear > 0 ? Math.round(b.annualOpCost / b.daysPerYear) : 0;

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

export type BoatRentalEconomics = {
  ownerUseDaysPerShare: number;
  ownerUseDaysTotal: number;
  rentablePoolDays: number;
  occupancyPct: number;
  bookedDays: number;
  dailyRate: number;
  grossRevenue: number;
  managementFeePct: number;
  rydaTake: number;
  shareholderPool: number;
  perShareAnnualIncome: number;
  perShareTotalIncome: number;
  carryingOffsetPct: number;
};

export function computeBoatRentalEconomics(
  b: Boat,
  opts: {
    holdYears?: number;
    occupancyPct?: number;
    ownerUseDaysPerShare?: number;
    managementFeePct?: number;
    dailyRate?: number;
  } = {},
): BoatRentalEconomics {
  const holdYears = opts.holdYears ?? BOATS_HOLDING_YEARS;
  const occupancyPct =
    opts.occupancyPct ?? RENTAL_DEFAULTS_BOATS.defaultOccupancyPct;
  const ownerUseDaysPerShare =
    opts.ownerUseDaysPerShare ?? RENTAL_DEFAULTS_BOATS.defaultOwnerUseDaysPerShare;
  const managementFeePct =
    opts.managementFeePct ?? RENTAL_DEFAULTS_BOATS.defaultManagementFeePct;
  const dailyRate = opts.dailyRate ?? b.rentalDailyRate ?? 10_000;

  const ownerUseDaysTotal = ownerUseDaysPerShare * b.shares;
  const rentablePoolDays = Math.max(
    0,
    RENTAL_DEFAULTS_BOATS.daysAvailablePerYear - ownerUseDaysTotal,
  );
  const bookedDays = Math.round(rentablePoolDays * (occupancyPct / 100));
  const grossRevenue = bookedDays * dailyRate;
  const rydaTake = Math.round(grossRevenue * (managementFeePct / 100));
  const shareholderPool = grossRevenue - rydaTake;
  const perShareAnnualIncome = Math.round(shareholderPool / b.shares);
  const perShareTotalIncome = perShareAnnualIncome * holdYears;
  const carryingOffsetPct =
    b.annualOpCost === 0
      ? 0
      : Math.round((perShareAnnualIncome / b.annualOpCost) * 100);

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

// Re-export formatUSD for convenience so boat-side pages don't need to
// reach into market-data.
export { formatUSD };
