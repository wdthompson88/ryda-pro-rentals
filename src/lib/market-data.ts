// Mock market data for the demo phase.
// When the secondary-market matching engine ships (post-securities counsel),
// this file gets replaced by real Supabase queries. Keep the same shape so
// nothing else has to change.

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
  pricePerShare: number;   // current ask price per share
  prevClose: number;       // yesterday's last trade
  annualOpCost: number;    // per share
  daysPerYear: number;     // entitlement
  milesPerYear: number;    // entitlement
  effectiveDailyCost: number;
  hero: string;            // hero image URL
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
    shares: 6,
    sharesAvailable: 2,
    pricePerShare: 56_667,
    prevClose: 56_240,
    annualOpCost: 11_800,
    daysPerYear: 50,
    milesPerYear: 4_000,
    effectiveDailyCost: 236,
    hero: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1920&q=80",
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
    pricePerShare: 99_000,
    prevClose: 100_350,
    annualOpCost: 14_200,
    daysPerYear: 30,
    milesPerYear: 2_500,
    effectiveDailyCost: 473,
    hero: "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=1920&q=80",
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
    shares: 6,
    sharesAvailable: 4,
    pricePerShare: 62_667,
    prevClose: 61_980,
    annualOpCost: 11_500,
    daysPerYear: 50,
    milesPerYear: 4_000,
    effectiveDailyCost: 230,
    hero: "https://images.unsplash.com/photo-1740806417439-490dba0d926a?auto=format&fit=crop&w=1920&q=80",
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
    shares: 8,
    sharesAvailable: 2,
    pricePerShare: 60_000,
    prevClose: 60_400,
    annualOpCost: 14_800,
    daysPerYear: 40,
    milesPerYear: 3_000,
    effectiveDailyCost: 370,
    hero: "https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=1920&q=80",
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
    shares: 8,
    sharesAvailable: 0,
    pricePerShare: 63_750,
    prevClose: 62_900,
    annualOpCost: 13_200,
    daysPerYear: 40,
    milesPerYear: 3_000,
    effectiveDailyCost: 330,
    hero: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1920&q=80",
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
    rentalAvailable: false,
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
    pricePerShare: 130_900,
    prevClose: 128_750,
    annualOpCost: 26_580,
    daysPerYear: 30,
    milesPerYear: 2_000,
    effectiveDailyCost: 886,
    hero: "/cars/aston-valhalla.webp",
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
    rentalAvailable: false,
    trackEligible: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Mock price history. Real version pulls from a `share_trades` table.
// ─────────────────────────────────────────────────────────────────────────

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "5Y" | "MAX";
export type PricePoint = { t: string; price: number };

const DAY_MS = 24 * 3600 * 1000;
const BACKBONE_DAYS = 365 * 7; // 7 years
const BACKBONE_VOL = 0.012;    // ~1.2% daily walk
const BACKBONE_TREND = -0.0001; // slight backwards drift so target is "up" over 7 yrs

const backboneCache = new Map<string, PricePoint[]>();

/**
 * The single source of truth for a vehicle's price history. Every timeframe
 * is derived from this one walk so that overlapping windows agree exactly:
 * the last point of `1W` equals the value at "7 days ago" inside `1M`, etc.
 *
 * Walks BACKWARDS from the current price for stability — the latest point is
 * always exactly `vehicle.pricePerShare`.
 */
function getBackbone(vehicle: Vehicle): PricePoint[] {
  const cached = backboneCache.get(vehicle.symbol);
  if (cached) return cached;

  const seed = symbolToSeed(vehicle.symbol);
  const rng = mulberry32(seed);
  const target = vehicle.pricePerShare;
  const now = Date.now();

  const points: PricePoint[] = new Array(BACKBONE_DAYS);
  let p = target;
  for (let i = BACKBONE_DAYS - 1; i >= 0; i--) {
    points[i] = { t: new Date(now - (BACKBONE_DAYS - 1 - i) * DAY_MS).toISOString(), price: round2(p) };
    // Walk backwards in time: subtract typical daily move + slight trend.
    const move = (rng() - 0.5) * 2 * BACKBONE_VOL * p;
    p = p - move - BACKBONE_TREND * p;
    // Prevent unrealistic drifts.
    if (p < target * 0.3) p = target * 0.4;
    if (p > target * 2.5) p = target * 1.8;
  }
  // Force last point to match current price exactly.
  points[BACKBONE_DAYS - 1] = { t: new Date(now).toISOString(), price: target };

  backboneCache.set(vehicle.symbol, points);
  return points;
}

/**
 * Generates an intraday (today) walk going from yesterday's close to the
 * current price across ~78 5-minute bars (6.5 trading hours).
 * Independent of the daily backbone — markets-style intraday flavor.
 */
function intradayWalk(vehicle: Vehicle): PricePoint[] {
  const seed = symbolToSeed(vehicle.symbol) + 7919; // offset so it doesn't collide
  const rng = mulberry32(seed);
  const target = vehicle.pricePerShare;
  const open = vehicle.prevClose;
  const points = 78;
  const now = Date.now();
  const spanMs = 6.5 * 3600 * 1000;

  const series: PricePoint[] = [];
  let p = open;
  // Linear path from open to target plus noise.
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trend = open + (target - open) * progress;
    const noise = (rng() - 0.5) * 2 * 0.003 * p;
    p = trend + noise;
    series.push({
      t: new Date(now - spanMs + (i / (points - 1)) * spanMs).toISOString(),
      price: round2(p),
    });
  }
  // Pin the endpoints exactly so the header math is clean.
  series[0] = { t: series[0].t, price: open };
  series[series.length - 1] = { t: new Date(now).toISOString(), price: target };
  return series;
}

/** Number of points to display per timeframe (resampled from backbone). */
const TF_POINTS: Record<Timeframe, number> = {
  "1D": 78,
  "1W": 56,
  "1M": 60,
  "3M": 90,
  "YTD": 90,
  "1Y": 120,
  "5Y": 180,
  "MAX": 200,
};

/** Number of *days* of history each timeframe should include. */
function daysForTimeframe(tf: Timeframe): number {
  if (tf === "1D") return 1;
  if (tf === "1W") return 7;
  if (tf === "1M") return 30;
  if (tf === "3M") return 90;
  if (tf === "YTD") {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.max(1, Math.floor((now.getTime() - jan1.getTime()) / DAY_MS));
  }
  if (tf === "1Y") return 365;
  if (tf === "5Y") return 365 * 5;
  return BACKBONE_DAYS; // MAX
}

/** Resample a price series down to N evenly-spaced points (last point preserved). */
function resample(points: PricePoint[], n: number): PricePoint[] {
  if (points.length <= n) return points;
  const out: PricePoint[] = [];
  const step = (points.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) {
    const idx = Math.round(i * step);
    out.push(points[idx]);
  }
  // Always pin the last point exactly so the header price matches the backbone end.
  out[out.length - 1] = points[points.length - 1];
  return out;
}

export function generateHistory(vehicle: Vehicle, timeframe: Timeframe): PricePoint[] {
  if (timeframe === "1D") return intradayWalk(vehicle);

  const backbone = getBackbone(vehicle);
  const days = daysForTimeframe(timeframe);
  const slice = backbone.slice(Math.max(0, backbone.length - days));
  return resample(slice, TF_POINTS[timeframe]);
}

function symbolToSeed(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return h;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

export function changeFromPrev(price: number, prev: number) {
  const diff = price - prev;
  const pct = (diff / prev) * 100;
  return { diff, pct, isUp: diff >= 0 };
}
