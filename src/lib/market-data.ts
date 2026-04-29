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
  daysPerYear: number;     // entitlement
  milesPerYear: number;    // entitlement
  effectiveDailyCost: number;
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
    daysPerYear: 34,
    milesPerYear: 4_000,
    effectiveDailyCost: 208,
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
    pricePerShare: 99_000,
    annualOpCost: 14_200,
    daysPerYear: 34,
    milesPerYear: 2_500,
    effectiveDailyCost: 418,
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
    daysPerYear: 34,
    milesPerYear: 4_000,
    effectiveDailyCost: 203,
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
    daysPerYear: 34,
    milesPerYear: 3_000,
    effectiveDailyCost: 348,
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
    daysPerYear: 34,
    milesPerYear: 3_000,
    effectiveDailyCost: 311,
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
    annualOpCost: 26_580,
    daysPerYear: 34,
    milesPerYear: 2_000,
    effectiveDailyCost: 782,
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
    rentalAvailable: false,
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

