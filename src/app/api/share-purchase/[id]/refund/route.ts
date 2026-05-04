// POST /api/share-purchase/[id]/refund
//
// Member-initiated refund + cancellation request for a share
// purchase. Per the Operating Agreement (and the cancellation copy
// in the buy flow), three eligibility windows:
//
//   - 'pending' / 'failed' / 'canceled': nothing to refund. Just
//     mark canceled and return.
//   - 'paid' but 'fulfilled_at' is null: ops review needed (the
//     payment cleared but holdings/amendment never landed). Don't
//     auto-refund — file a contact_messages row for legal/ops.
//   - 'paid' and within 7 days: full refund via Stripe. Mark the
//     row 'canceled', best-effort delete the holdings + amendment
//     rows so the member doesn't see a "current asset" for one
//     they no longer own.
//   - 'paid' and beyond 7 days: not eligible for self-serve. File
//     a ticket via contact_messages. Counsel-coordinated buyback
//     per the OA.
//
// All three "ticket" branches feed contact_messages so ops has a
// queue. A separate route (admin-only, ships later) actually issues
// the refund + reconciles inventory in the post-7-day case.

import { NextResponse, type NextRequest } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";

export const runtime = "nodejs";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

// Self-serve refund window. Past this, the request becomes a
// ticket because it intersects with LLC-share buyback (legal).
const SELF_SERVE_REFUND_WINDOW_DAYS = 7;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (
    !isAllowed(
      `refund:${user.id}:${clientIp(req)}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let admin;
  let stripe;
  try {
    admin = requireSupabaseAdmin();
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const { id: purchaseId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "";

  // Owner-only. Non-owners get 404 to avoid leaking purchase ids.
  const { data: purchase, error: purchaseErr } = await admin
    .from("share_purchases")
    .select(
      "id, user_id, status, shares, vehicle_symbol, boat_slug, name, email, total_cents, stripe_payment_intent_id, fulfilled_at, updated_at",
    )
    .eq("id", purchaseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (purchaseErr || !purchase) {
    return NextResponse.json(
      { error: "Purchase not found." },
      { status: 404 },
    );
  }

  // Branch 1: pending / failed / canceled. Just mark canceled if not
  // already; nothing to refund.
  if (
    purchase.status === "pending" ||
    purchase.status === "failed" ||
    purchase.status === "canceled"
  ) {
    await admin
      .from("share_purchases")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", purchase.id)
      .neq("status", "canceled"); // don't bump updated_at for already-canceled rows
    return NextResponse.json({
      ok: true,
      action: "marked_canceled",
      message: "Nothing to refund — the purchase never charged.",
    });
  }

  // Branch 2: paid but unfulfilled. Don't auto-refund; ops needs to
  // sort out why fulfillment failed AND whether to reverse anything
  // that did partially land.
  if (purchase.status === "paid" && !purchase.fulfilled_at) {
    await fileTicket(admin, purchase, user, reason, "paid_unfulfilled");
    return NextResponse.json({
      ok: true,
      action: "ticket_filed",
      message:
        "Your purchase paid but never fully completed. Ops will refund + clean up within one business day.",
    });
  }

  // Branch 3 / 4: paid + fulfilled. Window check.
  const paidAt = purchase.updated_at
    ? new Date(purchase.updated_at).getTime()
    : null;
  const ageDays = paidAt
    ? (Date.now() - paidAt) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (ageDays > SELF_SERVE_REFUND_WINDOW_DAYS) {
    // Past the self-serve window. File a ticket; legal will handle.
    await fileTicket(admin, purchase, user, reason, "out_of_window");
    return NextResponse.json({
      ok: true,
      action: "ticket_filed",
      message:
        "Past the 7-day self-serve window. Legal will reach out about LLC-share buyback within one business day.",
    });
  }

  // Branch 3: within window. Full refund via Stripe.
  if (!purchase.stripe_payment_intent_id) {
    // Edge case — paid status but no payment intent recorded.
    // Treat as ticket; ops will sort it out from the Stripe side.
    await fileTicket(admin, purchase, user, reason, "paid_no_intent");
    return NextResponse.json({
      ok: true,
      action: "ticket_filed",
      message:
        "Your refund needs a manual touch — ops will get to it within one business day.",
    });
  }

  try {
    await stripe.refunds.create({
      payment_intent: purchase.stripe_payment_intent_id,
      reason: "requested_by_customer",
      metadata: {
        purchaseId: purchase.id,
        userId: user.id,
        memberReason: reason || "(none)",
      },
    });
  } catch (err) {
    console.error("[refund · stripe]", err);
    return NextResponse.json(
      {
        error:
          "Stripe refund failed. Try again or contact support if it persists.",
      },
      { status: 502 },
    );
  }

  // Mark canceled and best-effort tear down derived state. The
  // delete-shares + delete-amendment branch is best-effort because
  // RLS won't reject service-role; if it fails, ops cleans up
  // manually from the ticket.
  await admin
    .from("share_purchases")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", purchase.id);

  await admin
    .from("share_holdings")
    .update({
      transferred_at: new Date().toISOString(),
      transferred_to_user_id: null,
    })
    .eq("purchase_id", purchase.id)
    .is("transferred_at", null);

  // The amendment + signature rows stay for audit (we generated +
  // emailed them). A future "rescinded" doc_type could supersede
  // them; for now we just leave them as historical.

  // File a ticket regardless so ops sees the cancellation.
  await fileTicket(admin, purchase, user, reason, "self_serve_refund");

  return NextResponse.json({
    ok: true,
    action: "refunded",
    message: "Refund issued. Funds typically settle in 5–10 business days.",
  });
}

// ── helper: file an ops ticket via contact_messages ────────────

async function fileTicket(
  admin: ReturnType<typeof requireSupabaseAdmin>,
  purchase: {
    id: string;
    shares: number;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    total_cents: number | null;
    name: string;
    email: string;
  },
  user: { id: string; email: string | null },
  memberReason: string,
  branch: string,
) {
  const asset =
    purchase.vehicle_symbol ?? purchase.boat_slug ?? "asset";
  const subject = `Refund/cancel · ${branch} · ${user.email ?? user.id}`;

  // Persist to contact_messages first (durable). Email the team
  // best-effort after.
  await admin.from("contact_messages").insert({
    name: purchase.name || user.email || "(no name)",
    email: user.email ?? purchase.email ?? "",
    phone: null,
    inquiry_type: "Other",
    market: "Not sure",
    message:
      `Refund/cancel request from ${user.email ?? user.id}.\n` +
      `Purchase: ${purchase.id}\n` +
      `Asset: ${asset}\n` +
      `Shares: ${purchase.shares}\n` +
      `Total cents: ${purchase.total_cents ?? "?"}\n` +
      `Branch: ${branch}\n` +
      `Member reason: ${memberReason || "(none)"}\n`,
    context: `Refund · ${branch}`,
  });

  try {
    await notifyTeam({
      subject,
      html: emailLayout(
        "Refund/cancel request",
        `
          <p>Member: <strong>${escapeHtml(user.email ?? "(no email)")}</strong></p>
          <p>Purchase: <code>${escapeHtml(purchase.id)}</code></p>
          <p>Asset: ${escapeHtml(String(asset))} · ${purchase.shares} share${purchase.shares > 1 ? "s" : ""}</p>
          <p>Branch: <strong>${escapeHtml(branch)}</strong></p>
          ${memberReason ? `<p>Member reason: ${escapeHtml(memberReason)}</p>` : ""}
        `,
      ),
    });
  } catch (err) {
    console.error("[refund · notify]", err);
  }
}
