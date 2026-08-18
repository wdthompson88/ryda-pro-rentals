// Pure validation + vehicle resolution for the rental-inquiry API.
// Lives in lib (not the route file) so unit tests can pin the exact
// predicate the route uses without mocking Supabase or Resend — same
// pattern as content-length.ts + the csp-report route.
//
// No imports with side effects here: partner-fleet is a plain data
// module, so this file stays testable in plain node.

import { PARTNER_VEHICLES, type PartnerVehicle } from "./partner-fleet";
// MAX_INQUIRY_SPAN_NIGHTS only. The RYDA-owned fleet is gone, so
// market-data no longer exports VEHICLES, and RentalInquiryFleet
// ("ryda" | "partner") went with it — there is one rail now, and
// nothing outside this file ever imported the type.
import { MAX_INQUIRY_SPAN_NIGHTS } from "./rental-availability";

export type RentalInquiry = {
  name: string;
  email: string;
  phone: string | null;
  vehicleSlug: string;        // canonical id: the partner listing's slug
  vehicleLabel: string;       // display name for emails + admin triage
  // Ops attribution ONLY. Customers never see the operator's name —
  // listings and emails say "a Miami operator".
  partnerName: string;
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  message: string | null;
  marketingOptIn: boolean;
  clientToken: string | null; // idempotency token; null = fallback row
};

export type RentalInquiryResult =
  | { ok: true; value: RentalInquiry }
  | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

// Strict YYYY-MM-DD parse to UTC-midnight ms. new Date("2026-02-31")
// silently rolls over to March; round-tripping through toISOString
// catches that as well as non-ISO shapes ("8/1/2026", "2026-8-1").
function parseIsoDate(s: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== s) return null;
  return d.getTime();
}

/**
 * Resolve a vehicle reference to the partner listing it names, by slug
 * (partner-fleet.ts `.slug`). There is one rail: RYDA owns no vehicle,
 * so a lead that matches no operator listing is not a lead at all.
 *
 * Case-insensitive because the slug travels through URLs and client
 * state. The list is injectable for tests; production callers use the
 * default.
 */
export function resolveRentalVehicle(
  slug: string,
  partnerList: PartnerVehicle[] = PARTNER_VEHICLES,
): Pick<RentalInquiry, "vehicleSlug" | "vehicleLabel" | "partnerName"> | null {
  const needle = slug.trim().toLowerCase();
  if (!needle) return null;

  const partner = partnerList.find((v) => v.slug.toLowerCase() === needle);
  if (!partner) return null;

  return {
    vehicleSlug: partner.slug,
    vehicleLabel: `${partner.make} ${partner.model}`,
    partnerName: partner.partner,
  };
}

/**
 * Validate + normalize a rental-inquiry POST body. Returns either the
 * canonical row-ready value or a customer-facing error string (the
 * route maps every failure to a 400).
 *
 * `now` is injectable so date-boundary tests don't race the wall clock
 * (same reason rate-limit tests use fake timers).
 */
export function validateRentalInquiry(
  body: unknown,
  now: Date = new Date(),
): RentalInquiryResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Bad request." };
  }
  const b = body as Record<string, unknown>;

  const name = String(b.name || "").trim().slice(0, 200);
  const email = String(b.email || "").trim().toLowerCase().slice(0, 320);
  // Cap free-text fields like the contact route: bodyParser limits stop a
  // literal DoS, consistency keeps the schema and email templates sane.
  const phone = String(b.phone || "").trim().slice(0, 32);
  const message = String(b.message || "").trim().slice(0, 5000);
  const clientToken = String(b.clientToken || "").trim().slice(0, 128);
  // Strict boolean — an accidental "true" string or 1 is not consent.
  const marketingOptIn = b.marketingOptIn === true;

  if (!name) return { ok: false, error: "Name required." };
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email required." };
  }

  const startMs = parseIsoDate(String(b.startDate || ""));
  const endMs = parseIsoDate(String(b.endDate || ""));
  if (startMs === null || endMs === null) {
    return { ok: false, error: "Invalid dates. Use YYYY-MM-DD." };
  }
  // UTC-tolerant "today": the server's UTC date can be one day ahead of
  // the customer's local date (Miami evenings are already tomorrow in
  // UTC), so allow one day of slack rather than reject a legitimate
  // same-day request. A stale-by-one lead is still a lead.
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (startMs < todayUtcMs - DAY_MS) {
    return { ok: false, error: "Start date can't be in the past." };
  }
  if (endMs < startMs) {
    return { ok: false, error: "End date must be on or after the start date." };
  }
  if ((endMs - startMs) / DAY_MS > MAX_INQUIRY_SPAN_NIGHTS) {
    return {
      ok: false,
      error: `Rentals are capped at ${MAX_INQUIRY_SPAN_NIGHTS} days per request.`,
    };
  }

  const vehicle = resolveRentalVehicle(String(b.vehicleSlug || ""));
  if (!vehicle) {
    return { ok: false, error: "Vehicle not found." };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      phone: phone || null,
      ...vehicle,
      startDate: new Date(startMs).toISOString().slice(0, 10),
      endDate: new Date(endMs).toISOString().slice(0, 10),
      message: message || null,
      marketingOptIn,
      // Missing token = no dedupe, but the lead still lands (never lose
      // a lead beats strict idempotency for a lead-gen funnel).
      clientToken: clientToken || null,
    },
  };
}
