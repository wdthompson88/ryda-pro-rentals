// /api/admin/comparables/[id] — PATCH + DELETE for a single
// comparable. Admin-gated.

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ComparableInput } from "@/lib/vehicle-enrichment";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { id } = await ctx.params;
  let body: Partial<ComparableInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const upd: Record<string, unknown> = {};
  if (body.vehicleSymbol !== undefined) upd.vehicle_symbol = body.vehicleSymbol;
  if (body.saleDate !== undefined) upd.sale_date = body.saleDate;
  if (body.yearMakeModel !== undefined)
    upd.year_make_model = body.yearMakeModel;
  if (body.trimNotes !== undefined) upd.trim_notes = body.trimNotes;
  if (body.salePriceCents !== undefined)
    upd.sale_price_cents = body.salePriceCents;
  if (body.sourceName !== undefined) upd.source_name = body.sourceName;
  if (body.sourceUrl !== undefined) upd.source_url = body.sourceUrl;
  if (body.lotNumber !== undefined) upd.lot_number = body.lotNumber;
  if (body.notes !== undefined) upd.notes = body.notes;

  if (Object.keys(upd).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("vehicle_comparables")
    .update(upd)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  if (!db)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { id } = await ctx.params;
  const { error } = await db
    .from("vehicle_comparables")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
