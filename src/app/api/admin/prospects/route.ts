// GET  /api/admin/prospects        — list prospects with optional filters
// POST /api/admin/prospects        — create a prospect
//
// Admin-only via requireAdmin (app_metadata.role === 'admin').
// Uses the service-role client to bypass RLS — the table has no
// SELECT policies because there's no legitimate non-admin read
// pattern for outbound sales-motion data.
//
// Filter params accepted on GET:
//   ?stage=cold|contacted|call_booked|call_done|interested|deposit_held|wired|joined_llc|declined
//   ?owner=<auth.users.id>     — "my prospects"
//   ?source=<text>             — substring match
//   ?archived=true             — include archived (default: hide)
//   ?due=true                  — only those with next_action_at <= now()
//
// Validation is hand-rolled (matches the convention in this project's
// other admin API routes, see src/app/api/admin/llc/route.ts) instead
// of pulling in zod / a schema lib for one route's worth of checks.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

const STAGES = [
  "cold",
  "contacted",
  "call_booked",
  "call_done",
  "interested",
  "deposit_held",
  "wired",
  "joined_llc",
  "declined",
] as const;
type Stage = (typeof STAGES)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Loose email check — server-side validation rejects only the
// obviously-wrong ones; the deliverability check happens at first
// outbound contact, not at row insert.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const url = new URL(req.url);
  const stageFilter = url.searchParams.get("stage");
  const ownerFilter = url.searchParams.get("owner");
  const sourceFilter = url.searchParams.get("source");
  const includeArchived = url.searchParams.get("archived") === "true";
  const onlyDue = url.searchParams.get("due") === "true";

  let q = db
    .from("prospects")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (!includeArchived) {
    q = q.is("archived_at", null);
  }
  if (stageFilter && (STAGES as readonly string[]).includes(stageFilter)) {
    q = q.eq("stage", stageFilter);
  }
  if (ownerFilter && UUID_RE.test(ownerFilter)) {
    q = q.eq("owner_user_id", ownerFilter);
  }
  if (sourceFilter) {
    // Strip wildcard chars so the caller can't break out of the LIKE
    // pattern; ILIKE %x% is the intent.
    const safe = sourceFilter.replace(/[\\%_]/g, "");
    if (safe) q = q.ilike("source", `%${safe}%`);
  }
  if (onlyDue) {
    q = q.lte("next_action_at", new Date().toISOString());
  }

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    prospects: data ?? [],
    total: count ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Validate. Errors are collected so the caller fixes everything in
  // one round-trip rather than whack-a-mole.
  const errors: string[] = [];
  if (!isString(body.full_name) || body.full_name.trim().length === 0) {
    errors.push("full_name: required, non-empty string");
  } else if (body.full_name.length > 200) {
    errors.push("full_name: max 200 chars");
  }
  if (!isString(body.source) || body.source.trim().length === 0) {
    errors.push("source: required, non-empty string");
  } else if (body.source.length > 500) {
    errors.push("source: max 500 chars");
  }
  if (body.email != null) {
    if (!isString(body.email) || !EMAIL_RE.test(body.email)) {
      errors.push("email: must be a valid email or omitted");
    } else if (body.email.length > 200) {
      errors.push("email: max 200 chars");
    }
  }
  if (body.phone != null && (!isString(body.phone) || body.phone.length > 60)) {
    errors.push("phone: must be a string up to 60 chars or omitted");
  }
  let stage: Stage = "cold";
  if (body.stage != null) {
    if (!isString(body.stage) || !(STAGES as readonly string[]).includes(body.stage)) {
      errors.push(`stage: must be one of ${STAGES.join(", ")}`);
    } else {
      stage = body.stage as Stage;
    }
  }
  if (
    body.car_of_interest != null &&
    (!isString(body.car_of_interest) || body.car_of_interest.length > 200)
  ) {
    errors.push("car_of_interest: must be a string up to 200 chars or omitted");
  }
  if (
    body.shares_of_interest != null &&
    (!isNumber(body.shares_of_interest) ||
      !Number.isInteger(body.shares_of_interest) ||
      body.shares_of_interest <= 0)
  ) {
    errors.push("shares_of_interest: must be a positive integer or omitted");
  }
  if (body.owner_user_id != null && (!isString(body.owner_user_id) || !UUID_RE.test(body.owner_user_id))) {
    errors.push("owner_user_id: must be a uuid or omitted");
  }
  if (
    body.next_action_at != null &&
    (!isString(body.next_action_at) || !ISO_DT_RE.test(body.next_action_at))
  ) {
    errors.push("next_action_at: must be ISO datetime or omitted");
  }
  if (
    body.next_action_note != null &&
    (!isString(body.next_action_note) || body.next_action_note.length > 2000)
  ) {
    errors.push("next_action_note: must be a string up to 2000 chars or omitted");
  }
  if (
    body.notes != null &&
    (!isString(body.notes) || body.notes.length > 10_000)
  ) {
    errors.push("notes: must be a string up to 10000 chars or omitted");
  }
  if (
    body.estimated_check_cents != null &&
    (!isNumber(body.estimated_check_cents) ||
      !Number.isInteger(body.estimated_check_cents) ||
      body.estimated_check_cents < 0)
  ) {
    errors.push("estimated_check_cents: must be a non-negative integer or omitted");
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

  const { data, error } = await db
    .from("prospects")
    .insert({
      full_name: (body.full_name as string).trim(),
      email: body.email == null ? null : body.email,
      phone: body.phone == null ? null : body.phone,
      source: (body.source as string).trim(),
      stage,
      car_of_interest: body.car_of_interest == null ? null : body.car_of_interest,
      shares_of_interest: body.shares_of_interest == null ? null : body.shares_of_interest,
      owner_user_id: body.owner_user_id == null ? null : body.owner_user_id,
      next_action_at: body.next_action_at == null ? null : body.next_action_at,
      next_action_note: body.next_action_note == null ? null : body.next_action_note,
      notes: body.notes == null ? null : body.notes,
      estimated_check_cents:
        body.estimated_check_cents == null ? null : body.estimated_check_cents,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Insert failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ prospect: data }, { status: 201 });
}
