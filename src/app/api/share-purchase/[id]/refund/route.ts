// POST /api/share-purchase/[id]/refund
//
// Member-initiated OR admin-initiated refund + cancellation request
// for a share purchase. Owner self-serves; admins (app_metadata.role
// === 'admin') can refund any purchase, audit-logged via
// recordAdminAction. The /admin Refund button hits this route, so
// without the admin path it would 404 for any purchase the admin
// doesn't personally own. Codex round-3 catch.
//
// Per the Operating Agreement (and the cancellation copy in the
// buy flow), three eligibility windows:
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
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
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

  // Auth split: admin can refund ANY purchase; owner can refund
  // their own. Non-owners get 404 to avoid leaking purchase ids.
  const adminUser = await requireAdmin(req);
  const isAdminCaller = !!adminUser;

  let lookup = admin
    .from("share_purchases")
    .select(
      "id, user_id, status, shares, vehicle_symbol, boat_slug, name, email, total_cents, stripe_payment_intent_id, fulfilled_at, paid_at, updated_at",
    )
    .eq("id", purchaseId);
  if (!isAdminCaller) {
    lookup = lookup.eq("user_id", user.id);
  }
  const { data: purchase, error: purchaseErr } = await lookup.maybeSingle();
  if (purchaseErr || !purchase) {
    return NextResponse.json(
      { error: "Purchase not found." },
      { status: 404 },
    );
  }

  // Branch 1: pending / failed. Mark canceled and file a ticket
  // so ops has visibility (member may want to talk through what
  // happened, or there could be a partial-state issue we should
  // investigate). Already-canceled rows return idempotent ok.
  if (purchase.status === "canceled") {
    return NextResponse.json({
      ok: true,
      action: "already_canceled",
      message: "This purchase is already canceled.",
    });
  }
  if (purchase.status === "pending" || purchase.status === "failed") {
    await admin
      .from("share_purchases")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", purchase.id)
      .neq("status", "canceled");
    const ticket = await fileTicket(
      admin,
      purchase,
      user,
      reason,
      `cancel_${purchase.status}`,
    );
    if (!ticket.ok) {
      return NextResponse.json(
        { error: "Could not record cancellation. Try again or contact support." },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      action: "marked_canceled",
      message:
        purchase.status === "pending"
          ? "Marked canceled — the purchase never charged."
          : "Marked canceled — the original payment had already failed.",
    });
  }

  // Branch 2: paid but unfulfilled. Don't auto-refund; ops needs to
  // sort out why fulfillment failed AND whether to reverse anything
  // that did partially land.
  if (purchase.status === "paid" && !purchase.fulfilled_at) {
    const ticket = await fileTicket(
      admin,
      purchase,
      user,
      reason,
      "paid_unfulfilled",
    );
    if (!ticket.ok) {
      return NextResponse.json(
        { error: "Could not record request. Try again or contact support." },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      action: "ticket_filed",
      message:
        "Your purchase paid but never fully completed. Ops will refund + clean up within one business day.",
    });
  }

  // Branch 3 / 4: paid + fulfilled. Window check anchored on
  // paid_at — that column is stamped EXACTLY ONCE by the webhook
  // on the pending→paid transition, so it's a stable refund-
  // eligibility anchor. Falling back to updated_at would let an
  // admin row touch shift the window in either direction.
  const paidAtIso = (purchase as { paid_at?: string | null }).paid_at
    ?? purchase.updated_at;
  const paidAt = paidAtIso ? new Date(paidAtIso).getTime() : null;
  const ageDays = paidAt
    ? (Date.now() - paidAt) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (!isAdminCaller && ageDays > SELF_SERVE_REFUND_WINDOW_DAYS) {
    // Past the self-serve window for member callers. File a ticket;
    // legal will handle. Admin callers bypass this gate — by the
    // time an admin clicks Refund on /admin, ops/legal have already
    // decided the refund is appropriate, so we route them straight
    // to the Stripe call below + an audit log row. Codex round-4
    // catch.
    const ticket = await fileTicket(
      admin,
      purchase,
      user,
      reason,
      "out_of_window",
    );
    if (!ticket.ok) {
      return NextResponse.json(
        { error: "Could not record request. Try again or contact support." },
        { status: 500 },
      );
    }
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
    const ticket = await fileTicket(
      admin,
      purchase,
      user,
      reason,
      "paid_no_intent",
    );
    if (!ticket.ok) {
      return NextResponse.json(
        { error: "Could not record request. Try again or contact support." },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      action: "ticket_filed",
      message:
        "Your refund needs a manual touch — ops will get to it within one business day.",
    });
  }

  // Compare-and-set FIRST. Two concurrent POSTs both pass the
  // eligibility checks above, but only one wins this update — the
  // other hits status='canceled' and gets a clean idempotent
  // "nothing to refund" branch on retry. We do this BEFORE the
  // Stripe call so we don't double-fire refunds; if Stripe then
  // fails, we restore status='paid' below.
  const claim = await admin
    .from("share_purchases")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchase.id)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();
  if (!claim.data) {
    // Lost the race. Treat as already-handled.
    return NextResponse.json({
      ok: true,
      action: "already_canceled",
      message: "This purchase is already canceled.",
    });
  }

  try {
    await stripe.refunds.create(
      {
        payment_intent: purchase.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          purchaseId: purchase.id,
          userId: user.id,
          memberReason: reason || "(none)",
        },
      },
      {
        // Idempotency key tied to the purchase id so a network-
        // hiccup retry doesn't issue a second refund. Stripe holds
        // idempotency keys for 24 hours, plenty for our case.
        idempotencyKey: `refund:${purchase.id}`,
      },
    );
  } catch (err) {
    // Stripe errors fall in two camps:
    //
    //   - Definite-failure: validation errors, idempotency
    //     conflicts, etc. — Stripe definitely didn't process the
    //     refund. Safe to restore status='paid' so the member can
    //     retry. type === 'StripeInvalidRequestError' is the
    //     reliable signal.
    //
    //   - Indeterminate: network timeout, 502 from Stripe gateway,
    //     etc. — the refund may have actually succeeded server-
    //     side; restoring status='paid' could let the member fire
    //     a SECOND refund. We use the SAME idempotency key on
    //     retry, but the key only holds for 24 hours, so a slow
    //     retry past that window could double-refund.
    //
    // Conservative path: only restore on definite-failure errors;
    // for indeterminate errors, leave status='canceled' and route
    // a ticket so ops can verify in Stripe + reconcile manually.
    const stripeErrType = (err as { type?: string } | null)?.type;
    const isDefiniteFailure =
      stripeErrType === "StripeInvalidRequestError" ||
      stripeErrType === "StripeIdempotencyError";

    console.error("[refund · stripe]", { type: stripeErrType, err });

    if (isDefiniteFailure) {
      await admin
        .from("share_purchases")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.id)
        .eq("status", "canceled");
      return NextResponse.json(
        {
          error:
            "Stripe refund failed. Try again or contact support if it persists.",
        },
        { status: 502 },
      );
    }

    // Indeterminate — leave status='canceled', file a ticket, tell
    // the member ops will verify. If the ticket persistence fails
    // here we still return ok (the row IS canceled and the Stripe
    // state is what ops will verify against; member shouldn't
    // retry). Surface a softer warning in the message instead.
    const ticket = await fileTicket(
      admin,
      purchase,
      user,
      reason,
      "stripe_indeterminate_error",
    );
    return NextResponse.json(
      {
        ok: true,
        action: "ticket_filed",
        message: ticket.ok
          ? "Stripe didn't confirm the refund cleanly. Ops will verify in Stripe and reach out within one business day."
          : "Stripe didn't confirm cleanly and we couldn't file a ticket automatically. Email support@ryda.com with this purchase id.",
      },
      { status: 202 },
    );
  }

  // Tear down derived state. We set BOTH transferred_at (so
  // existing "is this share still held" filters across the codebase
  // keep working with a single column check) AND refunded_at (so a
  // future transfer-history UI can distinguish "refunded" from
  // "transferred to another member"). transferred_to_user_id stays
  // null since no one received the share.
  //
  // CRITICAL post-Stripe-success step: if this DB update fails OR
  // updates fewer rows than expected, the member is refunded but
  // some/all of their share_holdings still show as active (a free
  // share). Verify by row-count match against purchase.shares.
  // Codex round-3 + round-4 catch.
  const nowIso = new Date().toISOString();
  const deactivate = await admin
    .from("share_holdings")
    .update({
      transferred_at: nowIso,
      transferred_to_user_id: null,
      refunded_at: nowIso,
    })
    .eq("purchase_id", purchase.id)
    .is("transferred_at", null)
    .select("id");

  const deactivatedCount = deactivate.data?.length ?? 0;
  // Note: shares might be > deactivatedCount if some rows were
  // already transferred away (transferred_at not null) — those
  // shares are no longer the buyer's to refund-deactivate, but
  // ops should still know about it. We expect exactly
  // purchase.shares rows; mismatch → critical ticket.
  if (deactivate.error || deactivatedCount !== purchase.shares) {
    console.error(
      "[refund · CRITICAL holdings deactivation incomplete AFTER successful Stripe refund]",
      {
        purchaseId: purchase.id,
        userId: user.id,
        expected: purchase.shares,
        actual: deactivatedCount,
        error: deactivate.error,
      },
    );
    // Force a critical ticket. If this also fails we've still
    // successfully refunded; ops will notice via the Stripe
    // dashboard reconciliation, but log loudly so monitoring catches it.
    await fileTicket(
      admin,
      purchase,
      user,
      `${reason}\n\nDeactivation mismatch: expected ${purchase.shares}, got ${deactivatedCount}`,
      "refund_holdings_deactivation_incomplete",
    );
  }

  // The amendment + signature rows stay for audit (we generated +
  // emailed them). A future "rescinded" doc_type could supersede
  // them; for now we just leave them as historical.

  // File a ticket regardless so ops sees the cancellation. The
  // refund already succeeded; if this ticket-persistence fails the
  // member's money IS coming back but ops loses the audit trail.
  // Don't fail the response on a ticket error — log loudly so we
  // notice it in monitoring instead.
  const ticket = await fileTicket(
    admin,
    purchase,
    user,
    reason,
    isAdminCaller ? "admin_refund" : "self_serve_refund",
  );
  if (!ticket.ok) {
    console.error(
      "[refund · ticket failed AFTER successful Stripe refund]",
      { purchaseId: purchase.id, userId: user.id },
    );
  }

  // Audit-log admin-initiated refunds. Owner self-serve refunds
  // don't need audit (the Stripe refund + canceled state IS the
  // record).
  if (isAdminCaller && adminUser) {
    await recordAdminAction(admin, {
      adminUserId: adminUser.id,
      action: "refund_issued",
      targetType: "share_purchase",
      targetId: purchase.id,
      details: {
        owner_user_id: purchase.user_id,
        shares: purchase.shares,
        total_cents: purchase.total_cents,
        member_reason: reason || null,
      },
    });
  }

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
): Promise<{ ok: boolean }> {
  const asset =
    purchase.vehicle_symbol ?? purchase.boat_slug ?? "asset";
  const subject = `Refund/cancel · ${branch} · ${user.email ?? user.id}`;

  // Persist to contact_messages first (durable). Email the team
  // best-effort after. Returns ok:false to the caller if the
  // contact_messages insert fails — the caller should NOT tell the
  // member "ticket filed" without a durable record.
  const persist = await admin.from("contact_messages").insert({
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
  if (persist.error) {
    console.error("[refund · ticket persist]", persist.error);
    return { ok: false };
  }

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
    // Email failure is non-fatal — the durable row is the contract.
    console.error("[refund · notify]", err);
  }
  return { ok: true };
}
