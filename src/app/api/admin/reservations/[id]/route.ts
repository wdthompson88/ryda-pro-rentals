// PATCH /api/admin/reservations/[id]
//
// Update reservation status + capture milestone timestamps + (when
// the status transitions to a stage that maps to a prospect-funnel
// move) auto-advance the linked prospect's stage.
//
// Status transitions:
//   draft           → sent              — admin emailed the PDF to prospect
//                                         (sent_at = now)
//   sent            → signed            — prospect returned signed scan
//                                         (signed_at = now,
//                                          signed_pdf_url = body.signed_pdf_url)
//   signed          → deposit_received  — wire arrived in escrow
//                                         (deposit_received_at = now,
//                                          ALSO advances the prospect to
//                                          stage='deposit_held')
//   deposit_received → converted        — LLC formed, deposit applied to
//                                         share buy-in
//                                         (converted_at = now, ALSO
//                                          advances prospect to stage='wired'
//                                          or 'joined_llc')
//   any non-terminal → cancelled        — admin cancelled
//   any non-terminal → refunded         — deposit returned
//                                         (refunded_at = now, ALSO
//                                          advances prospect to stage='declined')
//
// Body is partial; only changed fields update.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES = [
  "draft",
  "sent",
  "signed",
  "deposit_received",
  "converted",
  "cancelled",
  "refunded",
] as const;
type Status = (typeof STATUSES)[number];

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isStatus(v: unknown): v is Status {
  return isString(v) && (STATUSES as readonly string[]).includes(v);
}

// Map a reservation-status transition to a prospect-stage update,
// if any. Falsy return means "don't touch the prospect's stage".
function mapToProspectStage(s: Status): string | null {
  switch (s) {
    case "deposit_received":
      return "deposit_held";
    case "converted":
      return "joined_llc";
    case "refunded":
    case "cancelled":
      return "declined";
    default:
      return null;
  }
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
      { error: "Invalid reservation id." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const errors: string[] = [];
  let nextStatus: Status | null = null;
  if ("status" in body) {
    if (!isStatus(body.status)) {
      errors.push(`status: must be one of ${STATUSES.join(", ")}`);
    } else {
      nextStatus = body.status;
    }
  }

  if (
    "signed_pdf_url" in body &&
    body.signed_pdf_url != null &&
    (!isString(body.signed_pdf_url) || body.signed_pdf_url.length > 2000)
  ) {
    errors.push("signed_pdf_url: must be a URL string up to 2000 chars");
  }
  if (
    "notes" in body &&
    body.notes != null &&
    (!isString(body.notes) || body.notes.length > 2000)
  ) {
    errors.push("notes: max 2000 chars");
  }
  if ("expires_at" in body && body.expires_at != null) {
    if (!isString(body.expires_at)) {
      errors.push("expires_at: must be ISO datetime");
    } else if (Number.isNaN(new Date(body.expires_at).getTime())) {
      errors.push("expires_at: invalid date");
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

  // Build the column update from the patch body. Each status
  // transition stamps its corresponding timestamp atomically with
  // the status change.
  const update: Record<string, unknown> = {};
  if (nextStatus) {
    update.status = nextStatus;
    const now = new Date().toISOString();
    if (nextStatus === "sent") update.sent_at = now;
    else if (nextStatus === "signed") update.signed_at = now;
    else if (nextStatus === "deposit_received")
      update.deposit_received_at = now;
    else if (nextStatus === "converted") update.converted_at = now;
    else if (nextStatus === "cancelled") update.cancelled_at = now;
    else if (nextStatus === "refunded") update.refunded_at = now;
  }
  if ("signed_pdf_url" in body) update.signed_pdf_url = body.signed_pdf_url;
  if ("notes" in body) update.notes = body.notes;
  if ("expires_at" in body) update.expires_at = body.expires_at;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

  const { data: row, error } = await db
    .from("reservation_agreements")
    .update(update)
    .eq("id", id)
    .select("id, prospect_id, status")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: `Update failed: ${error?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  // If the new status maps to a prospect-stage move, do it. We don't
  // gate this on "the prospect's current stage being earlier than
  // the target" — admin judgment beats validation rigidity per the
  // prospects route's same convention.
  if (nextStatus) {
    const mappedStage = mapToProspectStage(nextStatus);
    if (mappedStage) {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const ownerHint = admin.email ? ` — ${admin.email}` : "";
      const auditNote = `\n[${stamp}${ownerHint}] auto: reservation ${row.id.slice(0, 8)} → ${nextStatus} (advanced stage to ${mappedStage})`;

      // Read existing notes so we append rather than overwrite.
      const { data: prospectRow } = await db
        .from("prospects")
        .select("notes")
        .eq("id", row.prospect_id)
        .single();
      const newNotes = (prospectRow?.notes ?? "") + auditNote;

      await db
        .from("prospects")
        .update({
          stage: mappedStage,
          notes: newNotes,
          last_touch_at: new Date().toISOString(),
          last_touch_note: `Reservation ${nextStatus}`,
        })
        .eq("id", row.prospect_id);
    }
  }

  return NextResponse.json({ reservation: row });
}
