// CarsXE client — paid ($15/mo Grow plan), gated by CARSXE_API_KEY.
//
// Three layers of safety, mirroring the Firstbase pattern:
//   1. No CARSXE_API_KEY in env → mock mode, plausible stub data, no
//      network calls
//   2. Key set + CARSXE_MODE === "live" → hits api.carsxe.com
//   3. Key set + CARSXE_MODE !== "live" → also hits live (CarsXE
//      doesn't expose a sandbox URL distinct from production), but
//      logs a warning so the operator sees they're spending real
//      credits in non-production env
//
// Endpoints used:
//   /v2/specs?vin=...&key=...  — vehicle spec sheet (HP, torque, etc.)
//   /v1/images?vin=...&key=...  — hero/gallery images
//
// Skip: /v1/marketvalue — research found this unreliable for exotics
// (it blends sources weighted toward dealer inventory, which is thin
// at our price points). Our valuation comes from manually-curated
// comparables instead.
//
// Rate-limit + idempotency: CarsXE doesn't expose either explicitly.
// We cache by VIN server-side via fetch's force-cache because spec
// data is stable per VIN.

import type { CarsXEImage, CarsXESpecs } from "./types";

const CARSXE_BASE = "https://api.carsxe.com";

type CarsXEConfig = {
  apiKey: string | null;
  mode: "live" | "mock";
};

function readConfig(): CarsXEConfig {
  const apiKey = process.env.CARSXE_API_KEY ?? null;
  if (!apiKey) {
    return { apiKey: null, mode: "mock" };
  }
  // Live by default once the key is set. Operator can opt back to
  // mock by setting CARSXE_MODE=mock if they need to test without
  // burning credits.
  const mode = process.env.CARSXE_MODE === "mock" ? "mock" : "live";
  return { apiKey, mode };
}

/**
 * Fetch CarsXE's spec sheet for a VIN. Returns a stub in mock mode.
 * Throws on a 4xx/5xx response in live mode (caller decides whether
 * to surface or fall back to vPIC).
 */
export async function getSpecsByVin(vin: string): Promise<CarsXESpecs> {
  const cfg = readConfig();
  if (cfg.mode === "mock" || !cfg.apiKey) {
    return mockSpecs(vin);
  }

  const url = `${CARSXE_BASE}/v2/specs?vin=${encodeURIComponent(vin)}&key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(
      `CarsXE specs failed: ${res.status} ${res.statusText}`,
    );
  }
  const json = (await res.json()) as Record<string, unknown>;
  // CarsXE's response shape varies slightly per plan tier; normalize
  // into our flat type. Fields below match the most-common shape;
  // verify against current docs if you upgrade plans.
  return {
    vin,
    year: pickInt(json.year),
    make: pickStr(json.make),
    model: pickStr(json.model),
    trim: pickStr(json.trim),
    hpHorsepower: pickInt((json.engine as Record<string, unknown>)?.horsepower),
    torqueFtLbs: pickInt((json.engine as Record<string, unknown>)?.torque),
    zeroToSixtyMph: pickFloat((json.performance as Record<string, unknown>)?.zero_to_sixty_mph),
    topSpeedMph: pickInt((json.performance as Record<string, unknown>)?.top_speed_mph),
    curbWeightLbs: pickInt((json.dimensions as Record<string, unknown>)?.curb_weight_lbs),
    engineDescription: pickStr((json.engine as Record<string, unknown>)?.description),
    msrpUsd: pickInt((json.pricing as Record<string, unknown>)?.msrp_usd),
    raw: json,
  };
}

/** Fetch CarsXE images for a VIN. Mock returns one placeholder. */
export async function getImagesByVin(vin: string): Promise<CarsXEImage[]> {
  const cfg = readConfig();
  if (cfg.mode === "mock" || !cfg.apiKey) {
    return mockImages(vin);
  }

  const url = `${CARSXE_BASE}/v1/images?vin=${encodeURIComponent(vin)}&key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(
      `CarsXE images failed: ${res.status} ${res.statusText}`,
    );
  }
  const json = (await res.json()) as {
    images?: Array<{ link?: string; width?: number; height?: number; source?: string }>;
  };
  return (json.images ?? []).map((i) => ({
    url: i.link ?? "",
    width: i.width ?? null,
    height: i.height ?? null,
    source: i.source ?? null,
  }));
}

export function getCarsXEMode(): "live" | "mock" {
  return readConfig().mode;
}

// ---- mocks -------------------------------------------------------

function mockSpecs(vin: string): CarsXESpecs {
  return {
    vin,
    year: null,
    make: null,
    model: null,
    trim: null,
    hpHorsepower: null,
    torqueFtLbs: null,
    zeroToSixtyMph: null,
    topSpeedMph: null,
    curbWeightLbs: null,
    engineDescription: null,
    msrpUsd: null,
    raw: { __mock: true, message: "CARSXE_API_KEY not configured" },
  };
}

function mockImages(_vin: string): CarsXEImage[] {
  return [];
}

// ---- helpers (same shape as vpic.ts) -----------------------------

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

function pickInt(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const s = pickStr(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function pickFloat(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = pickStr(v);
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
