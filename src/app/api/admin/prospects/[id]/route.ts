// PATCH  /api/admin/prospects/[id]  — update a prospect (stage, notes,
//                                     next-action, owner, archive)
// DELETE /api/admin/prospects/[id]  — soft-delete (sets archived_at);
//                                     hard delete is intentionally
//                                     not exposed because we want
//                                     the historical record for
//                                     cohort-2 conversion analysis.
//
// Update payloads are partial — only fields the caller sends get
// changed. Logging a call appends to notes (not overwrites) and
// updates last_touch_at automatically. Stage transitions are NOT
// constrained server-side (e.g., you can move from "wired" back
// to "interested" if you mis-clicked) because the cohort-1
// workflow is small enough that human judgment beats validation
// rigidity.

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isStage(v: unknown): v is Stage {
  return isString(v) && (STAGES as readonly string[]).includes(v);
}

export async function PATCH(
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

  // Validate every field that's present. "absent" (key not in body)
  // means "don't touch that column"; "present + null" means "clear it".
  const errors: string[] = [];
  if ("full_name" in body) {
    if (!isString(body.full_name) || body.full_name.trim().length === 0 || body.full_name.length > 200) {
      errors.push("full_name: must be 1-200 chars");
    }
  }
  if ("email" in body && body.email !== null) {
    if (!isString(body.email) || !EMAIL_RE.test(body.email) || body.email.length > 200) {
      errors.push("email: must be a valid email under 200 chars or null");
    }
  }
  if ("phone" in body && body.phone !== null) {
    if (!isString(body.phone) || body.phone.length > 60) {
      errors.push("phone: must be a string up to 60 chars or null");
    }
  }
  if ("source" in body) {
    if (!isString(body.source) || body.source.trim().length === 0 || body.source.length > 500) {
      errors.push("source: must be 1-500 chars");
    }
  }
  if ("stage" in body && !isStage(body.stage)) {
    errors.push(`stage: must be one of ${STAGES.join(", ")}`);
  }
  if ("car_of_interest" in body && body.car_of_interest !== null) {
    if (!isString(body.car_of_interest) || body.car_of_interest.length > 200) {
      errors.push("car_of_interest: must be a string up to 200 chars or null");
    }
  }
  if ("shares_of_interest" in body && body.shares_of_interest !== null) {
    if (!isNumber(body.shares_of_interest) || !Number.isInteger(body.shares_of_interest) || body.shares_of_interest <= 0) {
      errors.push("shares_of_interest: must be a positive integer or null");
    }
  }
  if ("owner_user_id" in body && body.owner_user_id !== null) {
    if (!isString(body.owner_user_id) || !UUID_RE.test(body.owner_user_id)) {
      errors.push("owner_user_id: must be a uuid or null");
    }
  }
  if ("next_action_at" in body && body.next_action_at !== null) {
    if (!isString(body.next_action_at) || !ISO_DT_RE.test(body.next_action_at)) {
      errors.push("next_action_at: must be ISO datetime or null");
    }
  }
  if ("next_action_note" in body && body.next_action_note !== null) {
    if (!isString(body.next_action_note) || body.next_action_note.length > 2000) {
      errors.push("next_action_note: must be a string up to 2000 chars or null");
    }
  }
  if ("notes" in body && body.notes !== null) {
    if (!isString(body.notes) || body.notes.length > 10_000) {
      errors.push("notes: must be a string up to 10000 chars or null");
    }
  }
  if ("estimated_check_cents" in body && body.estimated_check_cents !== null) {
    if (!isNumber(body.estimated_check_cents) || !Number.isInteger(body.estimated_check_cents) || body.estimated_check_cents < 0) {
      errors.push("estimated_check_cents: must be a non-negative integer or null");
    }
  }
  if ("archived" in body && typeof body.archived !== "boolean") {
    errors.push("archived: must be a boolean");
  }

  // log_call has its own shape — note + optional transition.
  let logCallNote: string | null = null;
  let logCallTransition: Stage | null = null;
  if ("log_call" in body && body.log_call != null) {
    const lc = body.log_call as Record<string, unknown>;
    if (!isString(lc.note) || lc.note.trim().length === 0 || lc.note.length > 2000) {
      errors.push("log_call.note: required, 1-2000 chars");
    } else {
      logCallNote = lc.note;
    }
    if ("transition_to" in lc && lc.transition_to != null) {
      if (!isStage(lc.transition_to)) {
        errors.push(`log_call.transition_to: must be one of ${STAGES.join(", ")}`);
      } else {
        logCallTransition = lc.transition_to;
      }
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

  const update: Record<string, unknown> = {};
  for (const key of [
    "full_name",
    "email",
    "phone",
    "source",
    "stage",
    "car_of_interest",
    "shares_of_interest",
    "owner_user_id",
    "next_action_at",
    "next_action_note",
    "notes",
    "estimated_check_cents",
  ] as const) {
    if (key in body) {
      update[key] = body[key];
    }
  }
  if ("archived" in body) {
    update.archived_at = body.archived ? new Date().toISOString() : null;
  }

  if (logCallNote) {
    const { data: current, error: fetchErr } = await db
      .from("prospects")
      .select("notes")
      .eq("id", id)
      .single();
    if (fetchErr) {
      return NextResponse.json(
        { error: `Prospect not found: ${fetchErr.message}` },
        { status: 404 },
      );
    }
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const ownerHint = admin.email ? ` — ${admin.email}` : "";
    const newLine = `\n[${stamp}${ownerHint}] ${logCallNote}`;
    update.notes = ((current?.notes as string | null) ?? "") + newLine;
    update.last_touch_at = new Date().toISOString();
    update.last_touch_note = logCallNote.slice(0, 280);
    if (logCallTransition) {
      update.stage = logCallTransition;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("prospects")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Update failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ prospect: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Soft-delete: the prospect stays in the database but disappears
  // from the default list view. Hard-delete is not exposed because
  // a declined-this-round prospect may convert in cohort 2; we want
  // the prior-conversation history to be preserved.

  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
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

  const { error } = await db
    .from("prospects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `Archive failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
