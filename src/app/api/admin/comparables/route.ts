// /api/admin/comparables — list + create vehicle comparables.
//
// Admin-gated. Powers the curation UI at /admin/comparables.
// Listing pages read directly from supabase via server component
// (no API hop) since reads are public per the migration RLS.

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ComparableInput } from "@/lib/vehicle-enrichment";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const symbol = new URL(req.url).searchParams.get("vehicle_symbol");
  let q = db
    .from("vehicle_comparables")
    .select("*")
    .order("sale_date", { ascending: false })
    .limit(200);
  if (symbol) q = q.eq("vehicle_symbol", symbol);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  let body: Partial<ComparableInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Field-by-field validation so the operator gets actionable
  // error messages instead of a generic 400.
  const errors: string[] = [];
  if (!body.vehicleSymbol) errors.push("vehicleSymbol is required");
  if (!body.saleDate) errors.push("saleDate is required (YYYY-MM-DD)");
  if (!body.yearMakeModel || body.yearMakeModel.length < 4)
    errors.push("yearMakeModel is required (min 4 chars)");
  if (!body.salePriceCents || body.salePriceCents <= 0)
    errors.push("salePriceCents must be a positive integer (cents)");
  if (!body.sourceName) errors.push("sourceName is required");
  if (!body.sourceUrl || !/^https?:\/\//.test(body.sourceUrl))
    errors.push("sourceUrl must be a fully-qualified http(s) URL");
  if (errors.length) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 },
    );
  }

  const insert = await db
    .from("vehicle_comparables")
    .insert({
      vehicle_symbol: body.vehicleSymbol!,
      sale_date: body.saleDate!,
      year_make_model: body.yearMakeModel!,
      trim_notes: body.trimNotes ?? null,
      sale_price_cents: body.salePriceCents!,
      source_name: body.sourceName!,
      source_url: body.sourceUrl!,
      lot_number: body.lotNumber ?? null,
      notes: body.notes ?? null,
      curated_by: admin.id,
    })
    .select("*")
    .single();
  if (insert.error)
    return NextResponse.json({ error: insert.error.message }, { status: 500 });

  return NextResponse.json({ row: insert.data });
}
