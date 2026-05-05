// /api/admin/vin-decode — POST { vin } → vPIC decode + recall count.
//
// Free, no key needed. Used by the admin "Add new vehicle" flow
// to auto-populate spec fields from a VIN. Also surfaces open
// recall count as a trust signal.
//
// CarsXE specs are NOT pulled here — they're paid and gated. If
// the operator wants the richer CarsXE spec sheet, they hit
// /api/admin/vin-decode?source=carsxe explicitly.

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  decodeVin,
  getCarsXEMode,
  getRecallsForVin,
  getSpecsByVin,
} from "@/lib/vehicle-enrichment";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { vin?: string; includeCarsXE?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vin = body.vin?.trim().toUpperCase();
  if (!vin) {
    return NextResponse.json({ error: "vin is required" }, { status: 400 });
  }

  // vPIC decode (free, always runs)
  let decoded;
  try {
    decoded = await decodeVin(vin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "vPIC decode failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Recall lookup (free, runs in parallel with optional CarsXE)
  const recallsPromise = getRecallsForVin(vin, decoded);

  // Optional CarsXE spec sheet (paid; mock if no key configured).
  // Only runs if the caller asks for it AND mode is live, otherwise
  // the mock returns a stub.
  const carsxePromise =
    body.includeCarsXE !== false
      ? getSpecsByVin(vin).catch((err) => {
          console.warn("[vin-decode] CarsXE failed:", err);
          return null;
        })
      : Promise.resolve(null);

  const [recalls, carsxe] = await Promise.all([recallsPromise, carsxePromise]);

  return NextResponse.json({
    decoded,
    recallCount: recalls.length,
    recalls: recalls.slice(0, 5),  // cap response size
    carsxe,
    carsxeMode: getCarsXEMode(),
  });
}
