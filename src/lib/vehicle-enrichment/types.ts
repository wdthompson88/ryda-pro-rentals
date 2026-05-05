// Shared types for the vehicle enrichment module.
//
// Three distinct data flows:
//   1. VIN decode (vPIC) — free, no key, canonical specs from a VIN
//   2. Spec/image lookup (CarsXE) — paid, gated, optional enrichment
//   3. Comparable sales (manual curation) — what classic.com / BaT
//      / RM Sotheby's data actually looks like, hand-curated by the
//      team and persisted in our DB
//
// Each flow has its own type-set; the index module re-exports the
// public ones.

// ---- VIN decode (vPIC) -------------------------------------------

export type VinDecodeResult = {
  vin: string;
  // Year/make/model — populated when vPIC has the data; null when not.
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  // Engine
  engineCylinders: number | null;
  engineDisplacementL: number | null;
  fuelType: string | null;
  // Drivetrain
  driveType: string | null;        // "FWD" | "AWD" | "RWD" | "4WD"
  transmission: string | null;
  // Manufacturing
  manufacturer: string | null;
  plantCity: string | null;
  plantCountry: string | null;
  // The full vPIC response, in case the caller needs more fields.
  raw: Record<string, unknown>;
};

export type VehicleRecall = {
  campaignNumber: string;
  reportDate: string;       // ISO
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
};

// ---- Comparable sales (manual curation) --------------------------

// One historical sale of a comparable vehicle. Manually curated from
// classic.com, BaT, RM Sotheby's, etc. Linked to a RYDA vehicle by
// symbol so the listing page can show "what similar cars sold for."
export type VehicleComparable = {
  id: string;
  vehicleSymbol: string;          // FK to VEHICLES[].symbol
  // The actual comp
  saleDate: string;               // ISO date (YYYY-MM-DD)
  yearMakeModel: string;          // "2024 Ferrari 296 GTB"
  trimNotes: string | null;       // "Assetto Fiorano, 9,200 mi"
  salePriceCents: number;         // store as cents to avoid float math
  // Provenance
  sourceName: string;             // "RM Sotheby's", "Bring a Trailer"
  sourceUrl: string;              // direct link to the auction listing
  lotNumber: string | null;       // "Lot 174" or "BaT #128456"
  // Editorial
  notes: string | null;           // optional curator commentary
  // Audit
  curatedBy: string | null;       // auth.users.id of the admin who added
  createdAt: string;              // ISO
  updatedAt: string;              // ISO
};

// What the API hands to the admin form on POST/PATCH. Server fills
// in id/createdAt/updatedAt/curatedBy.
export type ComparableInput = Omit<
  VehicleComparable,
  "id" | "createdAt" | "updatedAt" | "curatedBy"
>;

// ---- CarsXE (placeholder, mock-by-default) -----------------------

export type CarsXESpecs = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  // CarsXE returns a richer spec sheet than vPIC — included if you
  // pay for the $15/mo Grow plan. Mock-mode returns a minimal stub.
  hpHorsepower: number | null;
  torqueFtLbs: number | null;
  zeroToSixtyMph: number | null;
  topSpeedMph: number | null;
  curbWeightLbs: number | null;
  engineDescription: string | null;
  msrpUsd: number | null;
  // The vendor's full payload, in case the caller needs more.
  raw: Record<string, unknown>;
};

export type CarsXEImage = {
  url: string;
  width: number | null;
  height: number | null;
  source: string | null;          // attribution
};
