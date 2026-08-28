// Real rental terms scraped from each vehicle's gmluxe.net product page
// (Aug 2026) — the operator's own published deposit, minimum age,
// insurance options and multi-day discount pricing. Same pattern as
// partner-photos.ts: a Record keyed by slug, auto-populated from the
// source pages, merged onto PartnerVehicle via a helper below.
//
// NOT every listing has an entry. Nine of the 37 slugs in
// partner-fleet.ts point at gmluxe.net product pages that returned 404
// at scrape time (see the flagged list in this revamp's summary to
// Dave) — those cars may no longer be in the operator's live inventory.
// This file deliberately has no entry for them rather than a guessed
// one. A handful of vehicles that DID resolve are also missing one
// field each because the operator's own page left it blank (e.g. the
// base Huracán's deposit FAQ answer renders empty) — those fields are
// omitted here too, not defaulted. Nothing in this file is invented;
// every value traces to text literally printed on the operator's page.

export type RentalTerms = {
  minAgeYears?: number;
  securityDepositUsd?: number;
  insuranceOptionsText?: string;
  pricingTiers?: { minDays: number; ratePerDay: number }[];
  notes?: string;
};

export const PARTNER_RENTAL_TERMS: Record<string, RentalTerms> = {
  "lamborghini-huracan-evo": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1250 },
      { minDays: 3, ratePerDay: 1063 },
      { minDays: 7, ratePerDay: 938 },
      { minDays: 30, ratePerDay: 625 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "lamborghini-huracan": {
    minAgeYears: 21,
    // No deposit figure: the page's "Is there a security deposit?" FAQ
    // answer renders empty, and no multi-day tiers are printed (the
    // description field is blank for this listing) — both omitted
    // rather than copied from a different Huracán trim.
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
  },
  "lamborghini-huracan-sto": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1650 },
      { minDays: 3, ratePerDay: 1403 },
      { minDays: 7, ratePerDay: 1238 },
      { minDays: 30, ratePerDay: 825 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "ferrari-488-gtb": {
    minAgeYears: 21,
    securityDepositUsd: 2000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1300 },
      { minDays: 3, ratePerDay: 1105 },
      { minDays: 7, ratePerDay: 975 },
      { minDays: 30, ratePerDay: 650 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "ferrari-488-spider": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1300 },
      { minDays: 3, ratePerDay: 1105 },
      { minDays: 7, ratePerDay: 975 },
      { minDays: 30, ratePerDay: 650 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "ferrari-roma": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1100 },
      { minDays: 3, ratePerDay: 935 },
      { minDays: 7, ratePerDay: 825 },
      { minDays: 30, ratePerDay: 550 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "ferrari-california": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 550 },
      { minDays: 3, ratePerDay: 468 },
      { minDays: 7, ratePerDay: 413 },
      { minDays: 30, ratePerDay: 275 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "rolls-royce-dawn": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1350 },
      { minDays: 3, ratePerDay: 1148 },
      { minDays: 7, ratePerDay: 1013 },
      { minDays: 30, ratePerDay: 675 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "chevrolet-corvette-stingray": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 400 },
      { minDays: 3, ratePerDay: 340 },
      { minDays: 7, ratePerDay: 300 },
      { minDays: 30, ratePerDay: 200 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "chevrolet-camaro-lt1": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 100 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "bmw-z4": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 120 },
    ],
    notes: "100 mi/day included, unlimited mileage available as an option. Car seats available on request.",
  },
  "mercedes-c300-convertible": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 100 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "rolls-royce-cullinan": {
    minAgeYears: 21,
    securityDepositUsd: 2000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1400 },
      { minDays: 3, ratePerDay: 1190 },
      { minDays: 7, ratePerDay: 1050 },
      { minDays: 30, ratePerDay: 700 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "lamborghini-urus": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may use their own auto insurance, or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE",
    pricingTiers: [
      { minDays: 1, ratePerDay: 1200 },
      { minDays: 3, ratePerDay: 1020 },
      { minDays: 7, ratePerDay: 900 },
      { minDays: 30, ratePerDay: 600 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request. Delivery available across Miami-Dade & Broward.",
  },
  "mercedes-g550": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE (drivers must also have a safe driving record).",
    pricingTiers: [
      { minDays: 1, ratePerDay: 500 },
      { minDays: 3, ratePerDay: 425 },
      { minDays: 7, ratePerDay: 375 },
      { minDays: 30, ratePerDay: 250 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request. Delivery available across Miami-Dade & Broward.",
  },
  "land-rover-range-rover": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 400 },
      { minDays: 3, ratePerDay: 340 },
      { minDays: 7, ratePerDay: 300 },
      { minDays: 30, ratePerDay: 200 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "land-rover-range-rover-velar": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 100 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "porsche-cayenne-hybrid": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 100 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "mercedes-glc63s": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 300 },
      { minDays: 3, ratePerDay: 255 },
      { minDays: 7, ratePerDay: 225 },
      { minDays: 30, ratePerDay: 150 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "porsche-macan-gts": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 100 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "porsche-macan": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 125 },
      { minDays: 3, ratePerDay: 106 },
      { minDays: 7, ratePerDay: 94 },
      { minDays: 30, ratePerDay: 63 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "infiniti-qx80": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 73 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "bentley-continental-gt": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 350 },
      { minDays: 3, ratePerDay: 298 },
      { minDays: 7, ratePerDay: 263 },
      { minDays: 30, ratePerDay: 175 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request. Delivery available across Miami-Dade & Broward.",
  },
  "mercedes-c63s": {
    minAgeYears: 21,
    securityDepositUsd: 1000,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 300 },
      { minDays: 3, ratePerDay: 255 },
      { minDays: 7, ratePerDay: 225 },
      { minDays: 30, ratePerDay: 150 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "porsche-panamera": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 200 },
      { minDays: 3, ratePerDay: 170 },
      { minDays: 7, ratePerDay: 150 },
      { minDays: 30, ratePerDay: 100 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "audi-a5": {
    minAgeYears: 21,
    securityDepositUsd: 250,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 125 },
      { minDays: 3, ratePerDay: 106 },
      { minDays: 7, ratePerDay: 94 },
      { minDays: 30, ratePerDay: 63 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "toyota-sienna": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 100 },
      { minDays: 3, ratePerDay: 85 },
      { minDays: 7, ratePerDay: 75 },
      { minDays: 30, ratePerDay: 50 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },
  "tesla-model-y": {
    minAgeYears: 21,
    securityDepositUsd: 500,
    insuranceOptionsText:
      "Renters may have their own auto insurance or choose to rent without insurance, in which case insurance coverage must be purchased from GMLUXE.",
    pricingTiers: [
      { minDays: 1, ratePerDay: 100 },
      { minDays: 3, ratePerDay: 85 },
      { minDays: 7, ratePerDay: 75 },
      { minDays: 30, ratePerDay: 50 },
    ],
    notes: "100 mi/day included, unlimited mileage package available at checkout. Car seats available on request.",
  },

  // The following 9 slugs' gmluxe.net product pages returned 404 at
  // scrape time and are deliberately absent from this file:
  // chevrolet-corvette-z06, jaguar-f-type, ram-1500-trx,
  // cadillac-escalade, cadillac-escalade-esv, chevrolet-tahoe-lt,
  // mercedes-gle, volkswagen-atlas-cross-sport, mercedes-c300.
  // See the flagged note in this revamp's write-up — these may no
  // longer be in the operator's live inventory.
};

export function getRentalTerms(slug: string): RentalTerms | undefined {
  return PARTNER_RENTAL_TERMS[slug];
}
