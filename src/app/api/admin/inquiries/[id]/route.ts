// PATCH /api/admin/inquiries/[id] — move a rental inquiry through the
// lead pipeline.
//
// Transition graph:
//
//   new ──→ sent ──→ booked   (terminal)
//    │        │
//    └──→ lost ←──┘           (terminal)
//
// i.e. new → sent | lost, sent → booked | lost. Nothing leaves
// booked or lost. Unlike /api/admin/prospects (where free-form stage
// moves are allowed because human judgment beats rigidity at
// cohort-1 volume), transitions here ARE constrained server-side:
// `booked` is the referral-commission event, and a mis-click that
// un-books a lead would silently drop revenue attribution. If a row
// genuinely needs rewinding, that's a deliberate SQL-editor moment,
// not a button.
//
// No DELETE — lost inquiries are the conversion-rate denominator and
// the re-marketing list (where marketing_opt_in allows), so rows are
// never removed from the pipeline.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

const STATUSES = ["new", "sent", "booked", "lost"] as const;
type Status = (typeof STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<Status, readonly Status[]> = {
  new: ["sent", "lost"],
  sent: ["booked", "lost"],
  booked: [], // terminal — commission event
  lost: [], // terminal
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
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
    return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isStatus(body.status)) {
    return NextResponse.json(
      { error: `status: must be one of ${STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  const nextStatus = body.status;

  let db;
  try {
    db = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  // Read the current status first so we can validate the transition
  // against the graph rather than blind-writing. The update below is a
  // compare-and-swap on that observed status, so two admins racing on
  // the same row can't interleave read→write into a forbidden path
  // (e.g. booked → lost erasing the commission event): the second
  // write matches zero rows and 409s instead of landing.
  const { data: current, error: fetchErr } = await db
    .from("rental_inquiries")
    .select("id, status")
    .eq("id", id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  const from = current.status as Status;
  if (!ALLOWED_TRANSITIONS[from]?.includes(nextStatus)) {
    return NextResponse.json(
      {
        error: `Invalid transition: ${from} → ${nextStatus}. Allowed from ${from}: ${
          ALLOWED_TRANSITIONS[from]?.length
            ? ALLOWED_TRANSITIONS[from].join(", ")
            : "none (terminal)"
        }.`,
      },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("rental_inquiries")
    .update({ status: nextStatus })
    .eq("id", id)
    // CAS guard: only move the row if it is still in the status the
    // transition was validated against.
    .eq("status", from)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `Update failed: ${error.message}` },
      { status: 500 },
    );
  }
  if (!data) {
    // Zero rows matched → someone else moved the row between our read
    // and our write. Nothing was changed; ask the admin to re-look.
    return NextResponse.json(
      {
        error: `Inquiry changed while you were looking (no longer ${from}). Reload and retry.`,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ inquiry: data });
}
