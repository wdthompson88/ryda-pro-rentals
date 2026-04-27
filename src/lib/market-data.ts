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
    hero: "https://images.unsplash.com/photo-1614026480418-bd11fde2f0fd?auto=format&fit=crop&w=1920&q=80",
    description:
      "The lightest, most powerful series-production McLaren ever. Spider configuration with carbon roof.",
    specs: {
      engine: "4.0L twin-turbo V8",
      power: "740 hp",
      zeroToSixty: "2.7s",
      topSpeed: "206 mph",
      transmission: "7-speed SSG",
      color: "Volcano Yellow / Carbon Black",
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
    hero: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1920&q=80",
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

/**
 * Generates a deterministic, realistic-looking price history for a vehicle.
 * Uses a seed derived from the symbol so the chart is stable across reloads.
 */
export function generateHistory(
  vehicle: Vehicle,
  timeframe: Timeframe,
): PricePoint[] {
  const now = Date.now();
  const seed = symbolToSeed(vehicle.symbol);

  const tfConfig: Record<
    Timeframe,
    { points: number; spanMs: number; volatility: number }
  > = {
    "1D":  { points: 78,  spanMs: 6.5 * 3600 * 1000,        volatility: 0.004 },
    "1W":  { points: 30,  spanMs: 7   * 24 * 3600 * 1000,    volatility: 0.012 },
    "1M":  { points: 30,  spanMs: 30  * 24 * 3600 * 1000,    volatility: 0.025 },
    "3M":  { points: 60,  spanMs: 90  * 24 * 3600 * 1000,    volatility: 0.04  },
    "YTD": { points: 80,  spanMs: 120 * 24 * 3600 * 1000,    volatility: 0.05  },
    "1Y":  { points: 120, spanMs: 365 * 24 * 3600 * 1000,    volatility: 0.07  },
    "5Y":  { points: 180, spanMs: 5 * 365 * 24 * 3600 * 1000, volatility: 0.20 },
    "MAX": { points: 200, spanMs: 7 * 365 * 24 * 3600 * 1000, volatility: 0.28 },
  };

  const { points, spanMs, volatility } = tfConfig[timeframe];
  const trendBias = ((seed % 7) - 3) * 0.0008; // drift per step
  const start = now - spanMs;

  // Walk backwards from current price to determine starting price,
  // then walk forwards generating intermediate points.
  const target = vehicle.pricePerShare;
  const rng = mulberry32(seed + (timeframe.charCodeAt(0) || 1));

  // Compute a starting value such that after random walk we end near target.
  const totalSteps = points;
  const driftPerStep = (Math.random() < 0.5 ? -1 : 1) * volatility * 0.3;
  let startPrice = target * (1 - driftPerStep * totalSteps - trendBias * totalSteps);
  if (startPrice < target * 0.5) startPrice = target * 0.7;
  if (startPrice > target * 1.5) startPrice = target * 1.3;

  const series: PricePoint[] = [];
  let p = startPrice;
  for (let i = 0; i < points; i++) {
    const step = (rng() - 0.5) * 2 * volatility * p + trendBias * p;
    p = Math.max(p + step, target * 0.4);
    const t = new Date(start + (i / (points - 1)) * spanMs).toISOString();
    series.push({ t, price: round2(p) });
  }

  // Force the last point to equal current price so the header always matches.
  series[series.length - 1] = { t: new Date(now).toISOString(), price: target };
  return series;
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
