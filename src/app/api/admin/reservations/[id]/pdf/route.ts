// GET /api/admin/reservations/[id]/pdf
//
// Renders the reservation agreement to a PDF on demand and streams
// it back as application/pdf for download. Regenerated each call so
// any changes to the prospect's name/email or the row's vehicle/
// shares/deposit/expiration flow into the document automatically —
// no stale-URL invalidation needed.
//
// The SIGNED scan, when uploaded by the admin, is stored on the
// row's signed_pdf_url field separately. That's a different artifact
// from the GENERATED template this route returns.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { renderReservationAgreement } from "@/lib/reservation-agreement-pdf";
import { getVehicleBySymbol } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Invalid reservation id." },
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

  // Pull the reservation row + the joined prospect (for name + email).
  const { data: row, error } = await db
    .from("reservation_agreements")
    .select(
      `id, vehicle_symbol, boat_slug, shares_reserved, deposit_amount_cents,
       expires_at, created_at,
       prospect:prospects(full_name, email)`,
    )
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Reservation not found." },
      { status: 404 },
    );
  }

  // Prospect comes back as either a single object (1:1) or array
  // depending on Supabase's join inference; handle both.
  const prospect = Array.isArray(row.prospect)
    ? row.prospect[0]
    : row.prospect;
  if (!prospect?.email) {
    return NextResponse.json(
      { error: "Prospect has no email on file." },
      { status: 400 },
    );
  }

  // Resolve the asset display label + suggested LLC name. Same
  // mapping the create endpoint uses; if either ever diverges we
  // refactor into src/lib/assets.ts.
  let assetLabel = "Vehicle pending";
  let llcName = "RYDA LLC (pending)";
  if (row.vehicle_symbol) {
    const v = getVehicleBySymbol(row.vehicle_symbol);
    if (v) {
      assetLabel = `${v.year} ${v.name}`;
      llcName = `RYDA ${v.symbol.toUpperCase()} LLC`;
    }
  } else if (row.boat_slug) {
    const b = BOATS.find((x) => x.slug === row.boat_slug);
    if (b) {
      assetLabel = `${b.year} ${b.name}`;
      llcName = `RYDA ${b.slug.toUpperCase().replace(/-/g, "")} LLC`;
    }
  }

  const pdf = await renderReservationAgreement({
    reservationId: row.id,
    memberName: prospect.full_name,
    memberEmail: prospect.email,
    assetLabel,
    prospectiveLlcName: llcName,
    sharesReserved: row.shares_reserved,
    depositDollars: Math.round((row.deposit_amount_cents ?? 0) / 100),
    effectiveDate: new Date(row.created_at).toISOString().slice(0, 10),
    expirationDate: new Date(row.expires_at).toISOString().slice(0, 10),
  });

  // Filename: prospect-name__YYYY-MM-DD.pdf, slugified.
  const slug = prospect.full_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const filename = `ryda-reservation__${slug}__${new Date(row.created_at)
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
