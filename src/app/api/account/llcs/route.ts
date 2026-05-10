// GET /api/account/llcs
//
// Member-scoped LLC list. Returns the LLCs whose underlying asset
// (vehicle_symbol or boat_slug) matches an active share_holdings
// row owned by the caller.
//
// EXISTS BECAUSE
// llc_entities's RLS policy is admin-only (migration 0022) — a
// browser supabase-js query against the table from a member context
// returns 0 rows. The /account/documents page used to query it
// directly, which silently broke the insurance-certificates list.
// This endpoint runs the join under the service-role client (RLS
// bypass) after a session-scoped membership check, returning only
// the columns the docs page needs.
//
// Auth: any signed-in user; the response only includes LLCs the
// caller has shares in. No filter param needed.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let db;
  try {
    db = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  // Step 1: figure out which assets the caller actively holds.
  const { data: holdings, error: holdErr } = await db
    .from("share_holdings")
    .select("vehicle_symbol, boat_slug")
    .eq("user_id", user.id)
    .is("transferred_at", null);

  if (holdErr) {
    return NextResponse.json(
      { error: `Holdings query failed: ${holdErr.message}` },
      { status: 500 },
    );
  }

  const heldVehicles = Array.from(
    new Set(
      (holdings ?? [])
        .map((h) => h.vehicle_symbol)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const heldBoats = Array.from(
    new Set(
      (holdings ?? [])
        .map((h) => h.boat_slug)
        .filter((v): v is string => Boolean(v)),
    ),
  );

  if (heldVehicles.length === 0 && heldBoats.length === 0) {
    return NextResponse.json({ llcs: [] });
  }

  // Step 2: pull the LLCs that match those assets. Two queries
  // because Supabase's PostgREST OR-with-empty-array returns 0 rows
  // (we'd have to omit the OR entirely if either side is empty —
  // splitting + concatenating is cleaner).
  type LlcRow = {
    id: string;
    llc_name: string;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    insurance_carrier: string | null;
  };

  const allLlcs: LlcRow[] = [];

  if (heldVehicles.length > 0) {
    const r = await db
      .from("llc_entities")
      .select("id, llc_name, vehicle_symbol, boat_slug, insurance_carrier")
      .in("vehicle_symbol", heldVehicles);
    if (r.error) {
      return NextResponse.json(
        { error: `LLC vehicle query failed: ${r.error.message}` },
        { status: 500 },
      );
    }
    allLlcs.push(...((r.data ?? []) as LlcRow[]));
  }

  if (heldBoats.length > 0) {
    const r = await db
      .from("llc_entities")
      .select("id, llc_name, vehicle_symbol, boat_slug, insurance_carrier")
      .in("boat_slug", heldBoats);
    if (r.error) {
      return NextResponse.json(
        { error: `LLC boat query failed: ${r.error.message}` },
        { status: 500 },
      );
    }
    allLlcs.push(...((r.data ?? []) as LlcRow[]));
  }

  // Dedup by id in case a member somehow shows up under both keys
  // for the same LLC (defensive — current schema's xor constraint
  // prevents this, but the dedup is cheap insurance).
  const dedup = Array.from(new Map(allLlcs.map((l) => [l.id, l])).values());

  return NextResponse.json({ llcs: dedup });
}
