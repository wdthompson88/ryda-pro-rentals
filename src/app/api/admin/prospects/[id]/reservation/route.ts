// POST /api/admin/prospects/[id]/reservation
//
// Creates a reservation_agreements row for the given prospect and
// returns the row + a download path for the generated PDF. The PDF
// itself is NOT stored on the row — it's regenerated on demand by
// GET /api/admin/reservations/[id]/pdf so any data changes flow
// through automatically without needing to invalidate a stored URL.
// (We still record `signed_pdf_url` later when the admin uploads
// the SIGNED scan; that's a different artifact.)
//
// Body shape (all required unless noted):
//   {
//     vehicle_symbol?: string,   // exactly one of vehicle_symbol /
//     boat_slug?: string,        //   boat_slug per the table CHECK
//     shares_reserved: number,   // 1+
//     deposit_amount_cents?: number, // default $5000 = 500_000
//     expires_at?: string (ISO),     // default +60d per template
//     prospective_llc_name?: string, // default RYDA <SYMBOL> LLC
//     notes?: string,
//   }

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { getVehicleBySymbol } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// GET /api/admin/prospects/[id]/reservation
// Returns this prospect's reservation rows, newest first. Used by
// the admin UI to hydrate the ReservationPanel on row expand.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: prospectId } = await params;
  if (!UUID_RE.test(prospectId)) {
    return NextResponse.json(
      { error: "Invalid prospect id." },
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

  const { data, error } = await db
    .from("reservation_agreements")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ reservations: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: prospectId } = await params;
  if (!UUID_RE.test(prospectId)) {
    return NextResponse.json(
      { error: "Invalid prospect id." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Validate. Mirrors the hand-rolled style used in the prospects
  // routes (no zod for one-route validation per project convention).
  const errors: string[] = [];

  const vehicleSymbol =
    isString(body.vehicle_symbol) && body.vehicle_symbol.trim().length > 0
      ? body.vehicle_symbol.trim()
      : null;
  const boatSlug =
    isString(body.boat_slug) && body.boat_slug.trim().length > 0
      ? body.boat_slug.trim()
      : null;
  if ((vehicleSymbol && boatSlug) || (!vehicleSymbol && !boatSlug)) {
    errors.push(
      "Exactly one of vehicle_symbol or boat_slug must be provided.",
    );
  }

  // Resolve the asset to its display label so the PDF can use it
  // and so we fail-fast on a typo before writing the row.
  let assetLabel: string | null = null;
  let suggestedLlcName: string | null = null;
  if (vehicleSymbol) {
    const v = getVehicleBySymbol(vehicleSymbol);
    if (!v) {
      errors.push(`vehicle_symbol "${vehicleSymbol}" not found.`);
    } else {
      assetLabel = `${v.year} ${v.name}`;
      suggestedLlcName = `RYDA ${v.symbol.toUpperCase()} LLC`;
    }
  } else if (boatSlug) {
    const b = BOATS.find((x) => x.slug === boatSlug);
    if (!b) {
      errors.push(`boat_slug "${boatSlug}" not found.`);
    } else {
      assetLabel = `${b.year} ${b.name}`;
      suggestedLlcName = `RYDA ${b.slug.toUpperCase().replace(/-/g, "")} LLC`;
    }
  }

  if (
    !isNumber(body.shares_reserved) ||
    !Number.isInteger(body.shares_reserved) ||
    body.shares_reserved <= 0
  ) {
    errors.push("shares_reserved: must be a positive integer");
  }

  let depositCents = 500_000; // $5,000 default
  if (body.deposit_amount_cents != null) {
    if (
      !isNumber(body.deposit_amount_cents) ||
      !Number.isInteger(body.deposit_amount_cents) ||
      body.deposit_amount_cents <= 0
    ) {
      errors.push("deposit_amount_cents: must be a positive integer");
    } else {
      depositCents = body.deposit_amount_cents;
    }
  }

  let expiresAt: string;
  if (body.expires_at != null) {
    if (!isString(body.expires_at)) {
      errors.push("expires_at: must be ISO datetime");
      expiresAt = "";
    } else {
      const d = new Date(body.expires_at);
      if (Number.isNaN(d.getTime())) {
        errors.push("expires_at: invalid date");
        expiresAt = "";
      } else {
        expiresAt = d.toISOString();
      }
    }
  } else {
    // 60-day default per template + Miami-dealer ROFR norms.
    expiresAt = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  let llcName = suggestedLlcName ?? "RYDA LLC (pending)";
  if (body.prospective_llc_name != null) {
    if (
      !isString(body.prospective_llc_name) ||
      body.prospective_llc_name.length > 200
    ) {
      errors.push("prospective_llc_name: max 200 chars");
    } else if (body.prospective_llc_name.trim().length > 0) {
      llcName = body.prospective_llc_name.trim();
    }
  }

  let notes: string | null = null;
  if (body.notes != null) {
    if (!isString(body.notes) || body.notes.length > 2000) {
      errors.push("notes: max 2000 chars");
    } else {
      notes = body.notes;
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
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

  // Confirm the prospect exists (informational; the FK will reject
  // anyway, but a 404 here is much clearer than a 500 from a
  // constraint violation).
  const { data: prospect, error: prospectErr } = await db
    .from("prospects")
    .select("id, full_name, email")
    .eq("id", prospectId)
    .single();
  if (prospectErr || !prospect) {
    return NextResponse.json(
      { error: `Prospect not found.` },
      { status: 404 },
    );
  }
  if (!prospect.email) {
    return NextResponse.json(
      {
        error:
          "Prospect has no email on file — can't generate a reservation agreement without a member email. Add the email first.",
      },
      { status: 400 },
    );
  }

  const { data: row, error: insertErr } = await db
    .from("reservation_agreements")
    .insert({
      prospect_id: prospectId,
      vehicle_symbol: vehicleSymbol,
      boat_slug: boatSlug,
      shares_reserved: body.shares_reserved as number,
      deposit_amount_cents: depositCents,
      expires_at: expiresAt,
      notes,
      // status defaults to 'draft' per the table schema
    })
    .select("*")
    .single();

  if (insertErr || !row) {
    return NextResponse.json(
      { error: `Insert failed: ${insertErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  // We don't store the LLC name on the row (it's just a display
  // detail used during PDF rendering) — it's recomputed in the GET
  // /pdf route by the same getVehicleBySymbol path. Keeping the
  // column count tight matches the project's lean-table convention.

  return NextResponse.json(
    {
      reservation: row,
      pdf_url: `/api/admin/reservations/${row.id}/pdf`,
      asset_label: assetLabel,
      prospective_llc_name: llcName,
    },
    { status: 201 },
  );
}
