// GET /api/account/llc/[id]/insurance-certificate
//
// Member-facing — generates a Certificate of Insurance PDF for the
// authenticated member, listing them as named insured under the
// requested LLC's policy. Streamed back as application/pdf.
//
// AUTH MODEL
// Caller must:
//   1. Be authenticated (Supabase session)
//   2. Have an active share_holdings row on the LLC's underlying
//      asset (vehicle_symbol or boat_slug, since llc_entities ↔
//      assets is 1:1 via the same string keys)
// Otherwise 403. We don't leak whether the LLC exists for callers
// who aren't members (404 + 403 collapse to the same response).
//
// PRE-BINDING POSTURE
// llc_entities.insurance_carrier may be NULL until the LLC's
// policy binding completes. The PDF generator handles that gracefully
// by rendering a "Binding pending" banner — no fake data, no 500.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { renderInsuranceCertificate } from "@/lib/insurance-certificate-pdf";
import { getVehicleBySymbol } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: llcId } = await params;
  if (!UUID_RE.test(llcId)) {
    return NextResponse.json({ error: "Invalid LLC id." }, { status: 400 });
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

  // Pull the LLC. Service role to bypass RLS — we authenticate via
  // share_holdings membership in the next step.
  const { data: llc, error: llcErr } = await db
    .from("llc_entities")
    .select(
      `id, llc_name, vehicle_symbol, boat_slug,
       insurance_carrier, insurance_policy_number,
       insurance_agreed_value_cents, insurance_deductible_cents,
       insurance_effective_date, insurance_expiration_date,
       insurance_broker`,
    )
    .eq("id", llcId)
    .single();

  if (llcErr || !llc) {
    // Collapse 404 + 403 to one response so non-members can't probe
    // for LLC existence.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Membership check: caller must hold shares on the LLC's asset
  // (vehicle_symbol or boat_slug), with transferred_at IS NULL
  // (active holding only).
  const holdingQuery = db
    .from("share_holdings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("transferred_at", null);
  if (llc.vehicle_symbol) {
    holdingQuery.eq("vehicle_symbol", llc.vehicle_symbol);
  } else if (llc.boat_slug) {
    holdingQuery.eq("boat_slug", llc.boat_slug);
  }
  const { count: holdingCount } = await holdingQuery;
  if (!holdingCount || holdingCount < 1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Pull the member's display name from user_profiles, fall back to
  // the auth.users email-as-name pattern. The certificate would
  // rather have a real name; if profile is missing we surface what
  // we have rather than render "Member" generically.
  const { data: profile } = await db
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();
  const memberName = profile?.full_name?.trim() || user.email || "RYDA Member";

  // Resolve the asset display label.
  let assetLabel = "RYDA-operated vehicle";
  if (llc.vehicle_symbol) {
    const v = getVehicleBySymbol(llc.vehicle_symbol);
    if (v) assetLabel = `${v.year} ${v.name}`;
  } else if (llc.boat_slug) {
    const b = BOATS.find((x) => x.slug === llc.boat_slug);
    if (b) assetLabel = `${b.year} ${b.name}`;
  }

  const pdf = await renderInsuranceCertificate({
    certificateId: llc.id,
    memberName,
    memberEmail: user.email ?? "",
    llcName: llc.llc_name,
    assetLabel,
    carrier: llc.insurance_carrier,
    policyNumber: llc.insurance_policy_number,
    agreedValueCents: llc.insurance_agreed_value_cents,
    deductibleCents: llc.insurance_deductible_cents,
    effectiveDate: llc.insurance_effective_date,
    expirationDate: llc.insurance_expiration_date,
    broker: llc.insurance_broker,
    issuedOn: new Date().toISOString().slice(0, 10),
  });

  // Friendly download filename.
  const slug = llc.llc_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const memberSlug = memberName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ryda-insurance-cert__${slug}__${memberSlug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
