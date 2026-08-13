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
//
// MARKETS (plus MarketKey and MarketStatus) has gone the same way. It
// described three cities — Miami live, Los Angeles and New York
// "planned" with no date — and its only consumer was the /locations
// index, deleted along with both empty city pages. Nothing else ever
// imported it. Every car in partner-fleet.ts is a Miami car and
// PartnerVehicle.market is the literal type "Miami", so a multi-market
// table is a claim the inventory cannot currently make; leaving the
// blurbs here as dead exports only invites some future page to render
// them again. When a second city has operators, the fact that says so
// is a listing in the fleet, not a row in this file.
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
