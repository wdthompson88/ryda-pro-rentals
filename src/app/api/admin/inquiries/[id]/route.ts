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
// booked or lost. Transitions here ARE constrained server-side:
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
import { stripe } from "@/lib/stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// Marking a lead lost must also kill any live payment link — a
// pending Checkout session would otherwise stay payable for up to
// 24h, letting a customer pay for a car nobody intends to hand over.
// Best-effort: the Stripe session is expired FIRST, and the row only
// flips pending→canceled after the expire succeeds — if the expire
// fails the row stays pending so the Connect webhook can still
// process a payment correctly (it alerts the team when money lands
// on a lost lead).
async function voidLivePaymentLinks(db: SupabaseClient, inquiryId: string) {
  try {
    const pend = await db
      .from("rental_payments")
      .select("id, stripe_checkout_session_id, partner_id")
      .eq("inquiry_id", inquiryId)
      .eq("status", "pending");
    if (pend.error) {
      // Pre-0041 window (table missing) is expected; anything else is
      // worth a log line, but never fails the transition.
      const msg = pend.error.message.toLowerCase();
      const tableMissing =
        msg.includes("rental_payments") &&
        (msg.includes("schema cache") || msg.includes("does not exist"));
      if (!tableMissing) {
        console.warn("[inquiry transition · payment lookup]", pend.error);
      }
      return;
    }
    for (const row of pend.data ?? []) {
      if (!stripe || !row.stripe_checkout_session_id) continue;
      const partner = await db
        .from("partners")
        .select("stripe_account_id")
        .eq("id", row.partner_id)
        .maybeSingle();
      const acct = partner.data?.stripe_account_id as string | null;
      if (!acct) continue;
      try {
        await stripe.checkout.sessions.expire(
          row.stripe_checkout_session_id,
          {},
          { stripeAccount: acct },
        );
      } catch (err) {
        console.warn("[inquiry transition · session expire]", row.id, err);
        continue; // leave the row pending — see note above
      }
      const cancel = await db
        .from("rental_payments")
        .update({ status: "canceled" })
        .eq("id", row.id)
        .eq("status", "pending");
      if (cancel.error) {
        console.warn("[inquiry transition · payment cancel]", cancel.error);
      }
    }
  } catch (err) {
    console.warn("[inquiry transition · void links]", err);
  }
}

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

  // A lead that just went lost must not leave a payable link behind.
  if (nextStatus === "lost") {
    await voidLivePaymentLinks(db, id);
  }

  return NextResponse.json({ inquiry: data });
}
