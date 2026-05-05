// /api/admin/llc — admin-only LLC formation orchestration.
//
//   GET   list LLC entities (with optional filter by status)
//   POST  create a new LLC formation: validates input, persists a
//         draft row, calls the formation adapter, updates the row
//         with the provider id, returns the row.
//
// Admin-gated. The formation API call is the side-effect that
// either creates a real Firstbase LLC ($399 + state fee) OR returns
// a mock if FIRSTBASE_API_KEY isn't configured. The /admin/llc/new
// UI shows the adapter mode banner so operators know which they're
// triggering.

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveAdapter, type CreateFormationInput } from "@/lib/llc-formation";

// Audit happens via the llc_entities + llc_formation_events tables
// themselves (created_by, status transitions, event-id-keyed audit).
// The shared admin_audit_log enum doesn't yet include LLC actions —
// we don't log into it to avoid a parallel-truth problem.

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  const status = new URL(req.url).searchParams.get("status");
  let q = db
    .from("llc_entities")
    .select(
      "id, vehicle_symbol, boat_slug, llc_name, state_of_formation, formation_provider, provider_id, formation_status, ein, formation_date, formation_completed_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("formation_status", status);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adapter = resolveAdapter();
  return NextResponse.json({
    rows: data ?? [],
    adapter: { provider: adapter.provider, mode: adapter.mode },
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  let body: Partial<CreateFormationInput> & {
    boatSlug?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate. Field-by-field so the error tells the operator what
  // to fix instead of a generic 400.
  const errors: string[] = [];
  if (!body.vehicleSymbol && !body.boatSlug) {
    errors.push("vehicleSymbol or boatSlug is required");
  }
  if (body.vehicleSymbol && body.boatSlug) {
    errors.push("provide vehicleSymbol XOR boatSlug, not both");
  }
  if (!body.llcName || body.llcName.length < 4) {
    errors.push("llcName is required (min 4 chars)");
  }
  if (!body.state || !["FL", "DE", "WY", "CA", "NY"].includes(body.state)) {
    errors.push("state must be one of FL, DE, WY, CA, NY");
  }
  if (!body.principalAddress?.line1) {
    errors.push("principalAddress.line1 is required");
  }
  if (!body.manager?.fullName) {
    errors.push("manager.fullName is required");
  }
  if (!body.manager?.email) {
    errors.push("manager.email is required");
  }
  if (!body.idempotencyKey) {
    errors.push("idempotencyKey is required");
  }
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 },
    );
  }

  const adapter = resolveAdapter();

  // Idempotency: if the key has been used, return the existing row
  // instead of submitting a second formation. Vendor adapters may
  // also enforce this server-side, but our row-level check is more
  // reliable across mock/live mode swaps.
  const existing = await db
    .from("llc_entities")
    .select("id, provider_id, formation_status")
    .eq("idempotency_key", body.idempotencyKey)
    .maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }
  if (existing.data) {
    return NextResponse.json({
      reused: true,
      llc_entity_id: existing.data.id,
      provider_id: existing.data.provider_id,
      status: existing.data.formation_status,
      adapter: { provider: adapter.provider, mode: adapter.mode },
    });
  }

  // Insert draft row first so the audit trail captures the attempt
  // even if the vendor call fails.
  const insert = await db
    .from("llc_entities")
    .insert({
      vehicle_symbol: body.vehicleSymbol ?? null,
      boat_slug: body.boatSlug ?? null,
      llc_name: body.llcName!,
      state_of_formation: body.state!,
      formation_provider: adapter.provider,
      formation_status: "draft",
      idempotency_key: body.idempotencyKey!,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (insert.error || !insert.data) {
    return NextResponse.json(
      { error: insert.error?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  // Submit to the provider. If this throws, we leave the draft row
  // in place so the operator can retry without losing the input.
  let providerResp;
  try {
    providerResp = await adapter.createFormation(body as CreateFormationInput);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Formation failed";
    console.error("[admin/llc] adapter.createFormation failed:", err);
    await db
      .from("llc_entities")
      .update({ formation_status: "failed" })
      .eq("id", insert.data.id);
    return NextResponse.json(
      {
        error: "Provider failure",
        details: message,
        llc_entity_id: insert.data.id,
      },
      { status: 502 },
    );
  }

  // Provider accepted — record provider ids on the row and bump
  // status to "submitted". Subsequent webhook events will move it
  // through filed → completed.
  await db
    .from("llc_entities")
    .update({
      provider_id: providerResp.providerId,
      provider_application_id: providerResp.providerApplicationId ?? null,
      formation_status: providerResp.status,
    })
    .eq("id", insert.data.id);

  return NextResponse.json({
    llc_entity_id: insert.data.id,
    provider_id: providerResp.providerId,
    provider_application_id: providerResp.providerApplicationId,
    status: providerResp.status,
    adapter: { provider: adapter.provider, mode: adapter.mode },
  });
}
