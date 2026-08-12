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
//   · MARKETS    — the three cities /locations covers: Miami, which has
//                  operator inventory today, plus two with none yet
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
// Rendered by /locations (the market cards) and read for headline copy by
// the per-market pages under /locations/*.
//
// `status` is not a marketing label. It records one fact: whether there
// is operator inventory to browse in that city today. "live" is only
// true while partner-fleet.ts (later rental_listings, migration 0044)
// actually has cars in that market; everything else is "planned", with
// no date. The launch quarters that used to live here ("Q2 2027",
// "Q4 2027") had no referent anywhere in the codebase and contradicted
// the quarters the per-market pages printed, so they are gone rather
// than reconciled.
//
// The blurbs describe operator-supplied inventory only. RYDA has no
// fleet, no facility and no storage partner in any market — /about,
// /faq, /trust-and-safety, Terms §2 and the Platform Disclaimer §2 all
// state that in writing, and these three strings render on a public
// page, so they are part of whether that statement is true. The
// previous copy ("our Miami flagship fleet", "a climate-controlled
// Wynwood facility", "our Pasadena storage partner") made it false. Do
// not reintroduce a RYDA garage, hub, fleet or launch date here.

export type MarketKey = "Miami" | "Los Angeles" | "New York";
export type MarketStatus = "live" | "planned";

export const MARKETS: Record<
  MarketKey,
  {
    label: string;
    status: MarketStatus;
    blurb: string;
    hero: string; // image URL for the market header
  }
> = {
  Miami: {
    label: "Miami",
    status: "live",
    blurb:
      "Miami is not short of exotic cars for rent — it is short of one place to see them. Every Miami listing belongs to an independent local operator who owns the car, insures it, and hands over the keys.",
    hero: "/posters/cars-ferrari.jpg",
  },
  "Los Angeles": {
    label: "Los Angeles",
    status: "planned",
    blurb:
      "Canyon roads, the PCH, and a large independent rental scene of its own. No Los Angeles operators are listed on RYDA yet.",
    hero: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=2000&q=80",
  },
  "New York": {
    label: "New York",
    status: "planned",
    blurb:
      "Weekend-and-summer driving, from Manhattan out to the East End. No New York operators are listed on RYDA yet.",
    hero: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=2000&q=80",
  },
};
