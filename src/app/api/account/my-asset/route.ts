// GET /api/account/my-asset?asset=<car:SYMBOL | boat:SLUG>
//
// Member-scoped owner view of a single asset. Powers /my-cars/[symbol]
// and /my-boats/[slug] — the customer-facing dashboards that used to
// show hardcoded demo data.
//
// Returns:
//   - ownership: caller's active share count + acquisition date
//   - llc: the LLC entity if formed (name, state, status, EIN, date)
//   - copartners: anonymized co-owners on the same asset
//   - payments: caller's share_purchases for this asset
//   - bookings: caller's bookings on this asset
//
// Auth: signed-in user. Returns 404 if the caller has no active
// share_holdings for the asset, so the page doesn't leak data to
// random visitors who guess slugs.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";

type AssetRef = { type: "car" | "boat"; identifier: string };

function parseAsset(raw: string): AssetRef | null {
  if (raw.startsWith("car:")) {
    const id = raw.slice(4).trim();
    return id ? { type: "car", identifier: id } : null;
  }
  if (raw.startsWith("boat:")) {
    const id = raw.slice(5).trim();
    return id ? { type: "boat", identifier: id } : null;
  }
  return null;
}

function initialsFrom(profile: {
  preferred_name: string | null;
  full_name: string | null;
} | null, fallbackEmail: string | null): string {
  const name = profile?.preferred_name || profile?.full_name || "";
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const ini = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
    if (ini) return ini.slice(0, 3);
  }
  if (fallbackEmail) {
    // First letter of local-part + first letter of domain.
    const [local, domain] = fallbackEmail.split("@");
    return ((local?.[0] ?? "") + (domain?.[0] ?? "")).toUpperCase();
  }
  return "??";
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const raw = (new URL(req.url).searchParams.get("asset") ?? "").trim();
  const asset = parseAsset(raw);
  if (!asset) {
    return NextResponse.json(
      { error: "asset must be 'car:SYMBOL' or 'boat:SLUG'." },
      { status: 400 },
    );
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

  const assetCol = asset.type === "car" ? "vehicle_symbol" : "boat_slug";
  // Note: share_purchases stores vehicle_symbol as raw casing from the
  // catalog ("F458"), while market-data getVehicleBySymbol is
  // case-insensitive. Match both directions: use the raw identifier
  // for queries but compare case-insensitively where possible.
  const assetId = asset.identifier;

  // 1. Active holdings for the caller on this asset.
  const { data: holdings, error: holdErr } = await db
    .from("share_holdings")
    .select("id, shares, acquired_at, transferred_at")
    .eq("user_id", user.id)
    .eq(assetCol, assetId)
    .is("transferred_at", null);

  if (holdErr) {
    console.error("[my-asset · holdings]", holdErr);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  const callerShares = (holdings ?? []).reduce(
    (acc, h) => acc + (h.shares ?? 0),
    0,
  );
  if (callerShares === 0) {
    return NextResponse.json({ error: "Not an owner of this asset." }, {
      status: 404,
    });
  }
  const earliestAcq = (holdings ?? [])
    .map((h) => h.acquired_at)
    .filter((s): s is string => !!s)
    .sort()[0];

  // 2-6 in parallel.
  const [
    llcRes,
    coHoldingsRes,
    paymentsRes,
    bookingsRes,
    amendmentsRes,
  ] = await Promise.all([
    db
      .from("llc_entities")
      .select(
        "id, llc_name, state_of_formation, formation_status, ein, formation_date, formation_completed_at, registered_agent_name",
      )
      .eq(assetCol, assetId)
      .maybeSingle(),
    db
      .from("share_holdings")
      .select("user_id, shares")
      .eq(assetCol, assetId)
      .is("transferred_at", null),
    db
      .from("share_purchases")
      .select(
        "id, status, shares, total_cents, currency, funding_method, fulfilled_at, updated_at, created_at",
      )
      .eq("user_id", user.id)
      .eq(assetCol, assetId)
      .order("updated_at", { ascending: false })
      .limit(20),
    db
      .from("bookings")
      .select(
        "id, mode, start_date, end_date, status, created_at",
      )
      .eq("user_id", user.id)
      .eq(assetCol, assetId)
      .order("start_date", { ascending: false })
      .limit(20),
    // llc_amendments is keyed by share_purchase_id in the migration.
    // We surface them later if/when needed; placeholder for now.
    Promise.resolve({ data: [] as Array<unknown> }),
  ]);

  // Resolve co-owner display info. Group holdings by user, look up
  // their profiles + emails in batch. Caller is flagged with isYou.
  const ownerTotals = new Map<string, number>();
  for (const row of coHoldingsRes.data ?? []) {
    const uid = row.user_id as string;
    ownerTotals.set(uid, (ownerTotals.get(uid) ?? 0) + (row.shares ?? 0));
  }

  const ownerIds = Array.from(ownerTotals.keys());
  const profilesById = new Map<
    string,
    { preferred_name: string | null; full_name: string | null }
  >();
  if (ownerIds.length > 0) {
    const { data: profiles } = await db
      .from("user_profiles")
      .select("user_id, full_name, preferred_name")
      .in("user_id", ownerIds);
    for (const p of profiles ?? []) {
      profilesById.set(p.user_id, {
        preferred_name: p.preferred_name ?? null,
        full_name: p.full_name ?? null,
      });
    }
  }

  // Pull emails one-by-one — Supabase admin doesn't have a bulk
  // get-by-ids. Bounded by number of co-owners (<= 5), so fine.
  const emailById = new Map<string, string | null>();
  for (const uid of ownerIds) {
    if (uid === user.id) {
      emailById.set(uid, user.email);
      continue;
    }
    try {
      const { data } = await db.auth.admin.getUserById(uid);
      emailById.set(uid, data?.user?.email ?? null);
    } catch {
      emailById.set(uid, null);
    }
  }

  const copartners = ownerIds.map((uid) => ({
    user_id_short: uid.slice(0, 8),
    initials: initialsFrom(
      profilesById.get(uid) ?? null,
      emailById.get(uid) ?? null,
    ),
    shares: ownerTotals.get(uid) ?? 0,
    is_you: uid === user.id,
  }));

  return NextResponse.json({
    asset: { type: asset.type, identifier: assetId },
    ownership: {
      shares: callerShares,
      acquired_at: earliestAcq ?? null,
    },
    llc: llcRes.data
      ? {
          id: llcRes.data.id,
          name: llcRes.data.llc_name,
          state: llcRes.data.state_of_formation,
          status: llcRes.data.formation_status,
          ein: llcRes.data.ein,
          formation_date:
            llcRes.data.formation_completed_at ?? llcRes.data.formation_date,
          registered_agent_name: llcRes.data.registered_agent_name,
        }
      : null,
    copartners,
    payments: paymentsRes.data ?? [],
    bookings: bookingsRes.data ?? [],
  });
}
