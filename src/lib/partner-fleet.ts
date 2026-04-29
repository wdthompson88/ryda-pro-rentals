// Partner rental fleet — operations partner inventory (currently GM LUXE
// Miami). Source of truth for inventory + rates: https://www.gmluxe.net/
//
// Photos: full galleries scraped from each product page and stored in
// partner-photos.ts. The `hero` and `gallery` fields below are
// auto-populated from PARTNER_PHOTOS by slug; explicit hero values can
// still be set per-entry to override the scraped first photo.

import { PARTNER_PHOTOS } from "./partner-photos";

export type PartnerCategory =
  | "Exotic"
  | "Convertible"
  | "SUV"
  | "Sedan"
  | "7-Seater"
  | "EV";

export type PartnerVehicle = {
  slug: string;            // url-safe identifier
  partner: "GM LUXE";      // partner brand (kept for ops attribution; not user-facing)
  partnerUrl: string;      // direct link to partner's product page
  year?: number;           // year if known
  make: string;            // "Lamborghini"
  model: string;           // "Huracán EVO"
  category: PartnerCategory;
  dailyRate: number;       // discounted rate currently shown
  regularRate: number;     // sticker rate
  market: "Miami";         // operations partner is Miami only today
  hero?: string;           // primary image (auto-resolved if omitted)
  gallery?: string[];      // additional images (auto-resolved if omitted)
  milesIncluded?: string;  // e.g., "100 mi/day"
};

/** Resolve the primary photo for a partner vehicle. Prefers the explicit
 *  `hero` field, falls back to the first scraped photo, then undefined. */
export function getPartnerHero(v: PartnerVehicle): string | undefined {
  if (v.hero) return v.hero;
  const scraped = PARTNER_PHOTOS[v.slug];
  return scraped && scraped.length > 0 ? scraped[0] : undefined;
}

/** Resolve the full gallery for a partner vehicle: hero first, then any
 *  additional scraped photos that don't duplicate the hero. */
export function getPartnerGallery(v: PartnerVehicle): string[] {
  const scraped = PARTNER_PHOTOS[v.slug] ?? [];
  const explicit: string[] = [];
  if (v.hero) explicit.push(v.hero);
  if (v.gallery) explicit.push(...v.gallery);
  // Combine in order: explicit first, then any scraped not already in explicit.
  const seen = new Set(explicit);
  const merged = [...explicit];
  for (const url of scraped) {
    if (!seen.has(url)) {
      merged.push(url);
      seen.add(url);
    }
  }
  return merged;
}

const GM_LUXE_BASE = "https://www.gmluxe.net";

function gm(path: string) {
  // Append UTM so GM LUXE can attribute referrals to RYDA for the 20% split.
  return `${GM_LUXE_BASE}${path}?utm_source=ryda&utm_medium=partner_listing&utm_campaign=fleet_2026`;
}

// ─────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────

export const PARTNER_VEHICLES: PartnerVehicle[] = [
  // ── Exotics ─────────────────────────────────────────────────────────
  {
    slug: "lamborghini-huracan-evo",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/lamborghini-huracan-evo"),
    make: "Lamborghini",
    model: "Huracán EVO",
    category: "Exotic",
    dailyRate: 1_105,
    regularRate: 1_300,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_0347ee5f49fe4f64a61fb1a81f29f4d8~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "lamborghini-huracan",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/lamborghini-huracan-1"),
    make: "Lamborghini",
    model: "Huracán",
    category: "Exotic",
    dailyRate: 1_150,
    regularRate: 1_350,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_6507abcd1aad463ebb8b02c522bc071b~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "lamborghini-huracan-sto",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/lamborghini-huracan-sto"),
    make: "Lamborghini",
    model: "Huracán STO",
    category: "Exotic",
    dailyRate: 1_403,
    regularRate: 1_650,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_9ec91f4a3be343408c02d168387022c1~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "ferrari-488-gtb",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/ferrari-488-gtb-2018"),
    year: 2018,
    make: "Ferrari",
    model: "488 GTB",
    category: "Exotic",
    dailyRate: 1_105,
    regularRate: 1_300,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "ferrari-488-spider",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/ferrari-488-spider"),
    make: "Ferrari",
    model: "488 Spider",
    category: "Convertible",
    dailyRate: 1_105,
    regularRate: 1_300,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "ferrari-roma",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/ferrari-roma"),
    make: "Ferrari",
    model: "Roma",
    category: "Exotic",
    dailyRate: 935,
    regularRate: 1_100,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/136995_cc23a704d52b404b9d13cd2ad76ab1b3~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "ferrari-california",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/ferrari-california"),
    make: "Ferrari",
    model: "California",
    category: "Convertible",
    dailyRate: 468,
    regularRate: 550,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_a07ceea21c7548a5be950502d86ae21e~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "chevrolet-corvette-z06",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/chevrolet-corvette-z06"),
    year: 2024,
    make: "Chevrolet",
    model: "Corvette Z06",
    category: "Exotic",
    dailyRate: 553,
    regularRate: 650,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_e74748efcd28469ebd4657366747b9f4~mv2.jpg",
    milesIncluded: "100 mi/day",
  },

  // ── Convertibles ────────────────────────────────────────────────────
  {
    slug: "rolls-royce-dawn",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/rolls-royce-dawn-1"),
    make: "Rolls-Royce",
    model: "Dawn",
    category: "Convertible",
    dailyRate: 1_148,
    regularRate: 1_350,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_26017a7cea854f73a339ea7bce9fd394~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "chevrolet-corvette-stingray",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/chevrolet-corvette-stingray-2024"),
    year: 2024,
    make: "Chevrolet",
    model: "Corvette Stingray",
    category: "Convertible",
    dailyRate: 340,
    regularRate: 400,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "jaguar-f-type",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/jaguar-f-type"),
    make: "Jaguar",
    model: "F-Type",
    category: "Convertible",
    dailyRate: 255,
    regularRate: 300,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/136995_13f6ccc0c8a448b481cb5eb959cffc8f~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "chevrolet-camaro-lt1",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/chevrolet-camaro-lt1-2024"),
    year: 2024,
    make: "Chevrolet",
    model: "Camaro LT1",
    category: "Convertible",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "bmw-z4",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/bmw-z4"),
    make: "BMW",
    model: "Z4",
    category: "Convertible",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "mercedes-c300-convertible",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/mercedes-c300-convertible"),
    make: "Mercedes-Benz",
    model: "C300 Convertible",
    category: "Convertible",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },

  // ── SUVs ────────────────────────────────────────────────────────────
  {
    slug: "rolls-royce-cullinan",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/rolls-royce-cullinan"),
    make: "Rolls-Royce",
    model: "Cullinan",
    category: "SUV",
    dailyRate: 1_190,
    regularRate: 1_400,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_d8926810904c47be8b9b4b8670ab7649~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "lamborghini-urus",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/lamborghini-urus-1"),
    make: "Lamborghini",
    model: "Urus",
    category: "SUV",
    dailyRate: 1_020,
    regularRate: 1_200,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_ff7a3905fa50407dba16b60f70fb79c7~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "mercedes-g550",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/mercedes-benz-g550"),
    make: "Mercedes-Benz",
    model: "G550",
    category: "SUV",
    dailyRate: 425,
    regularRate: 500,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/3e6987_467e4f29e5ed4112b7d5a7d049627d0e~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "ram-1500-trx",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/ram-1500-trx"),
    make: "Ram",
    model: "1500 TRX",
    category: "SUV",
    dailyRate: 298,
    regularRate: 350,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/136995_d8b1c959060447a5935d70f7d0ff5e75~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "cadillac-escalade",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/cadillac-escalade-2021-black"),
    year: 2021,
    make: "Cadillac",
    model: "Escalade",
    category: "SUV",
    dailyRate: 340,
    regularRate: 400,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "cadillac-escalade-esv",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/cadillac-escalade-esv"),
    make: "Cadillac",
    model: "Escalade ESV",
    category: "SUV",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    hero: "https://static.wixstatic.com/media/136995_2b82e101fcc94463b8fbb8de6510a132~mv2.jpg",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "chevrolet-tahoe-lt",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/chevrolet-tahoe-lt"),
    make: "Chevrolet",
    model: "Tahoe LT",
    category: "SUV",
    dailyRate: 213,
    regularRate: 250,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "land-rover-range-rover",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/land-rover-range-rover"),
    make: "Land Rover",
    model: "Range Rover",
    category: "SUV",
    dailyRate: 340,
    regularRate: 400,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "land-rover-range-rover-velar",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/range-rover-velar"),
    make: "Land Rover",
    model: "Range Rover Velar",
    category: "SUV",
    dailyRate: 255,
    regularRate: 300,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "porsche-cayenne-hybrid",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/porsche-cayenne-2020"),
    year: 2020,
    make: "Porsche",
    model: "Cayenne Hybrid",
    category: "SUV",
    dailyRate: 340,
    regularRate: 400,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "mercedes-gle",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/mercedes-benz-gle-class-2021"),
    year: 2021,
    make: "Mercedes-Benz",
    model: "GLE",
    category: "SUV",
    dailyRate: 255,
    regularRate: 300,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "mercedes-glc63s",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/mercedes-benz-glc-class-2019"),
    year: 2019,
    make: "Mercedes-Benz",
    model: "GLC63s",
    category: "SUV",
    dailyRate: 255,
    regularRate: 300,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "porsche-macan-gts",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/porsche-macan-gts-2017"),
    year: 2017,
    make: "Porsche",
    model: "Macan GTS",
    category: "SUV",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "porsche-macan",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/porsche-macan"),
    make: "Porsche",
    model: "Macan",
    category: "SUV",
    dailyRate: 106,
    regularRate: 125,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "infiniti-qx80",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/infiniti-qx80-2024"),
    year: 2024,
    make: "Infiniti",
    model: "QX80",
    category: "SUV",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "volkswagen-atlas-cross-sport",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/volkswagen-atlas-cross-sport-2021-black"),
    year: 2021,
    make: "Volkswagen",
    model: "Atlas Cross Sport",
    category: "SUV",
    dailyRate: 106,
    regularRate: 125,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },

  // ── Sedans ──────────────────────────────────────────────────────────
  {
    slug: "bentley-continental-gt",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/bentley-continental-gtc"),
    make: "Bentley",
    model: "Continental GT",
    category: "Sedan",
    dailyRate: 298,
    regularRate: 350,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "mercedes-c63s",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/mercedes-benz-c-class-2020"),
    year: 2020,
    make: "Mercedes-Benz",
    model: "C63s",
    category: "Sedan",
    dailyRate: 255,
    regularRate: 300,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "mercedes-c300",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/mercedes-benz-c300-1"),
    make: "Mercedes-Benz",
    model: "C300",
    category: "Sedan",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "porsche-panamera",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/porsche-panamera-2020"),
    year: 2020,
    make: "Porsche",
    model: "Panamera",
    category: "Sedan",
    dailyRate: 170,
    regularRate: 200,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
  {
    slug: "audi-a5",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/audi-a5-2018"),
    year: 2018,
    make: "Audi",
    model: "A5",
    category: "Sedan",
    dailyRate: 106,
    regularRate: 125,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },

  // ── 7-Seaters ───────────────────────────────────────────────────────
  {
    slug: "toyota-sienna",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/toyota-sienna-2021"),
    year: 2021,
    make: "Toyota",
    model: "Sienna",
    category: "7-Seater",
    dailyRate: 85,
    regularRate: 100,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },

  // ── EV ──────────────────────────────────────────────────────────────
  {
    slug: "tesla-model-y",
    partner: "GM LUXE",
    partnerUrl: gm("/product-page/tesla-model-y"),
    make: "Tesla",
    model: "Model Y",
    category: "EV",
    dailyRate: 85,
    regularRate: 100,
    market: "Miami",
    milesIncluded: "100 mi/day",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

export function getPartnerVehicleBySlug(slug: string) {
  return PARTNER_VEHICLES.find((v) => v.slug === slug);
}

/** Hex tint per make for the placeholder gradient when hero image is absent. */
export function brandTint(make: string): string {
  const m = make.toLowerCase();
  if (m.includes("ferrari")) return "#7a1212";
  if (m.includes("lamborghini")) return "#3a2400";
  if (m.includes("rolls")) return "#1a1d24";
  if (m.includes("bentley")) return "#1f2b1a";
  if (m.includes("mercedes")) return "#22272d";
  if (m.includes("porsche")) return "#2b2620";
  if (m.includes("bmw")) return "#1a2840";
  if (m.includes("audi")) return "#2a2a2a";
  if (m.includes("jaguar")) return "#1a3a1a";
  if (m.includes("land rover")) return "#28332a";
  if (m.includes("cadillac")) return "#1d1d1d";
  if (m.includes("chevrolet")) return "#3a0d0d";
  if (m.includes("ram")) return "#2a1a14";
  if (m.includes("infiniti")) return "#1f2733";
  if (m.includes("tesla")) return "#1a1a1a";
  if (m.includes("toyota")) return "#2a1f1f";
  if (m.includes("volkswagen")) return "#1a2840";
  return "#262626";
}
