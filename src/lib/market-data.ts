// Market-level reference data + the shared currency formatter.
//
// This file used to carry VEHICLES: the six RYDA-OWNED cars, with their
// share counts, per-share buy-ins and share/rental economics. That fleet
// is gone (Aug 2026): RYDA is purely a referral marketplace and owns,
// stores, insures and operates no vehicle. Rental inventory now comes
// from partner operators only — src/lib/partner-fleet.ts today, the
// rental_listings table (migration 0044) once 2C wires the DB read path
// in src/lib/rental-listings-db.ts.
//
// What survives here is what still has real consumers:
//   · formatUSD  — the shared currency formatter (landing page, /rent,
//                  /rent/[slug])
//   · MARKETS    — the three RYDA markets, rendered by /locations
//
// Do not reintroduce a RYDA-owned vehicle list here. /about, /faq,
// /trust-and-safety and the legal pages all state that RYDA owns no
// vehicle, and that statement is only true because this array is gone.

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

export function formatUSD(n: number, opts: { decimals?: number } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────
// MARKETS, the cities RYDA lists operators in
// ─────────────────────────────────────────────────────────────────────────
// Used by /locations to lay out "Miami live" / "LA coming" / "NY coming"
// sections. `status` drives whether the section shows a launch tag.

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
    hero: "/posters/boats-marina.jpg",
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
