// NHTSA vPIC client — free, no auth, no rate-limit-key.
//
// vPIC is the federal government's official VIN decoder. It's stable
// (10+ years), exotic-aware (Ferrari/Lambo/McLaren all submit Part 565
// data so VINs decode), and free. We use it for two things:
//
//   1. Decode a VIN → auto-populate Vehicle spec fields when an admin
//      adds a new car (saves typing, reduces typos).
//   2. Fetch active recalls per VIN → display "Last recall check:
//      <date>, X open recalls" as a trust signal on listings.
//
// Endpoint reference:
//   https://vpic.nhtsa.dot.gov/api/
//
// Rate limit: undocumented but generous. Community reports suggest
// ~10-15 req/sec before throttling. We don't need anywhere close to
// that — admin-triggered only, ~1 call per new vehicle.
//
// No keys, no env vars, no scaffold gating. Just works.

import type { VehicleRecall, VinDecodeResult } from "./types";

const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

/**
 * Decode a VIN via vPIC's DecodeVinValuesExtended endpoint. Returns
 * a flat object — easier to consume than the default DecodeVin
 * which returns an array of {Variable, Value} pairs.
 *
 * vPIC returns "" or "Not Applicable" for missing fields; we
 * normalize those to null so consumers can use ?? for fallbacks.
 */
export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const cleanVin = vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
    throw new Error(
      "Invalid VIN format — must be 17 alphanumeric characters (no I, O, Q).",
    );
  }

  const url = `${VPIC_BASE}/DecodeVinValuesExtended/${encodeURIComponent(cleanVin)}?format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // vPIC data is reasonably stable per VIN. Cache aggressively
    // server-side so repeated lookups during admin form interaction
    // don't hammer the endpoint.
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(`vPIC decode failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { Results?: Array<Record<string, string>> };
  const r = json.Results?.[0] ?? {};

  return {
    vin: cleanVin,
    year: pickInt(r.ModelYear),
    make: pickStr(r.Make),
    model: pickStr(r.Model),
    trim: pickStr(r.Trim) ?? pickStr(r.Series),
    bodyClass: pickStr(r.BodyClass),
    engineCylinders: pickInt(r.EngineCylinders),
    engineDisplacementL: pickFloat(r.DisplacementL),
    fuelType: pickStr(r.FuelTypePrimary),
    driveType: pickStr(r.DriveType),
    transmission: pickStr(r.TransmissionStyle),
    manufacturer: pickStr(r.Manufacturer),
    plantCity: pickStr(r.PlantCity),
    plantCountry: pickStr(r.PlantCountry),
    raw: r,
  };
}

/**
 * Fetch active recalls for a VIN. Different endpoint than DecodeVin.
 * Returns an empty array if there are no open recalls.
 *
 * Note: vPIC's recall endpoint requires Make / Model / Year, not VIN
 * directly. We do the decode first and then look up recalls — the
 * caller can pass `decoded` if they already decoded, otherwise we
 * decode internally.
 */
export async function getRecallsForVin(
  vin: string,
  decoded?: VinDecodeResult,
): Promise<VehicleRecall[]> {
  const d = decoded ?? (await decodeVin(vin));
  if (!d.year || !d.make || !d.model) {
    // Can't query recalls without these three. Return empty rather
    // than throw — callers can interpret "no recalls returned" as
    // "no data available."
    return [];
  }

  // NHTSA's recall lookup is on a different host/base than vPIC.
  // Same federal data, separate endpoint.
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(d.make)}&model=${encodeURIComponent(d.model)}&modelYear=${d.year}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  });
  if (!res.ok) {
    // Don't fail the whole flow on a recalls API hiccup. Log and
    // return empty.
    console.warn(
      "[vpic] recalls fetch failed:",
      res.status,
      res.statusText,
    );
    return [];
  }
  const json = (await res.json()) as {
    results?: Array<{
      NHTSACampaignNumber?: string;
      ReportReceivedDate?: string;
      Component?: string;
      Summary?: string;
      Consequence?: string;
      Remedy?: string;
    }>;
  };
  return (json.results ?? []).map((r) => ({
    campaignNumber: r.NHTSACampaignNumber ?? "",
    reportDate: r.ReportReceivedDate ?? "",
    component: r.Component ?? "",
    summary: r.Summary ?? "",
    consequence: r.Consequence ?? "",
    remedy: r.Remedy ?? "",
  }));
}

// ---- helpers -----------------------------------------------------

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (
    !trimmed ||
    trimmed === "Not Applicable" ||
    trimmed === "Not Available"
  )
    return null;
  return trimmed;
}

function pickInt(v: unknown): number | null {
  const s = pickStr(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function pickFloat(v: unknown): number | null {
  const s = pickStr(v);
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
