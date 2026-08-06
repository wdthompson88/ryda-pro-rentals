// POST /api/admin/inquiries/[id]/payment-link — create + email a
// Stripe Checkout link for an operator-confirmed rental price.
//
// FOUNDER DECISION (payments are fee-only): the Checkout Session is
// created ON the operator's Express connected account — a DIRECT
// charge, via the `stripeAccount` request option. The rental price
// settles straight to the operator and never enters RYDA's balance;
// RYDA's commission rides along as
// payment_intent_data.application_fee_amount (partner.commission_rate,
// default 15% — computeRentalFee in src/lib/fees.ts is the ONLY place
// that math lives). Chargebacks and refunds are the operator's. Never
// rework this into destination charges or transfers through the
// platform balance.
//
// Pipeline position: the inquiry must be 'sent' — the operator has
// confirmed availability + price off-platform, and the admin types
// that price here. /api/stripe/connect-webhook flips the
// rental_payments row to 'paid' and the inquiry to 'booked' when the
// customer pays.
//
// Body: { amount_cents: number, note?: string } (integer cents — the
// admin UI's dollars × 100; `amountUsd` in dollars also accepted for
// API-first callers). `note` shows on the Checkout line item.
// Response: { ok, url }.
//
// Idempotent: a still-live pending link for this inquiry at the SAME
// amount is returned as-is (deduped: true) instead of minting a
// duplicate session (sessions expire 24h after creation, so "live" =
// status pending + younger than 24h). A live link at a DIFFERENT
// amount is a 409 — re-quoting requires the old session to be expired
// first, never a silent reuse of the outdated price.

import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeRentalFee } from "@/lib/fees";
import { emailLayout, escapeHtml } from "@/lib/notify";
import { partnerInquiryEmail } from "@/lib/partner-contacts";
import { SITE_URL } from "@/lib/site-url";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sanity rails on the operator-confirmed price. A $30 "rental" or a
// $250,000 fat-finger both stop here, before a live Stripe charge.
const MIN_AMOUNT_CENTS = 50 * 100;
const MAX_AMOUNT_CENTS = 100_000 * 100;

// Checkout's maximum lifetime; also the window the idempotency check
// treats a pending link as still live.
const SESSION_TTL_S = 24 * 60 * 60;

// Local best-effort sender, same pattern as /api/rental-inquiry:
// notifyTeam pins the recipient to the team inbox, but the pay link
// goes to the customer. Never throws — email is a side effect of the
// payment row, not a failure mode.
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM = process.env.RYDA_NOTIFY_FROM ?? "";

async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!resend || !FROM || !args.to) {
    console.log("[payment-link · email skipped, missing config]", {
      subject: args.subject,
    });
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo || undefined,
    });
    if (error) {
      console.error("[payment-link · resend]", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[payment-link · email throw]", e);
    return false;
  }
}

// "No such table" detection — partners/rental_payments arrive with
// migration 0041 (operator-approved). Until it's applied, queries
// error and must degrade to a clear response, not a crash — mirrors
// /api/rental-inquiry's schema-cache fallback.
function isTableMissing(
  error: { message?: string } | null,
  table: string,
): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes(table) &&
    (msg.includes("schema cache") || msg.includes("does not exist"))
  );
}

function fmtUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// Customer-facing pay-link email. NEVER name the operator here — the
// public promise is "a vetted Miami operator" (see rental-inquiry
// route). The Stripe-hosted Checkout page shows the operator's own
// business name, which is theirs to show; our copy stays neutral.
function payLinkEmailHtml(args: {
  name: string;
  vehicleLabel: string;
  startDate: string;
  endDate: string;
  amountCents: number;
  payUrl: string;
}): string {
  const amount = escapeHtml(fmtUsd(args.amountCents));
  return emailLayout("Complete your booking", `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(args.name)},</p>
    <p style="margin:0 0 12px;">
      Good news — your dates are confirmed. The
      <strong>${escapeHtml(args.vehicleLabel)}</strong> is reserved for
      ${escapeHtml(args.startDate)} to ${escapeHtml(args.endDate)},
      pending payment.
    </p>
    <p style="margin:0 0 16px;">Total: <strong>${amount}</strong></p>
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(args.payUrl)}"
         style="display:inline-block;background:#DC4747;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 28px;border-radius:999px;">
        Pay ${amount} securely
      </a>
    </p>
    <p style="margin:0 0 12px;">
      This link expires in 24 hours. Payment is processed by Stripe and
      goes directly to your operator — RYDA never holds your money.
    </p>
    <p style="margin:0;">
      If the link expires or anything looks off, just reply to this
      email and we'll sort it out.
    </p>
  `, "Sent by RYDA. Reply to this email to reach the RYDA team.");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 });
  }

  // Degrade cleanly without env (dev preview): clear 503s, no crash.
  // Captured as a const so the narrowing survives into the
  // recordFailure closure below.
  const stripeClient = stripe;
  if (!stripeClient) {
    return NextResponse.json(
      { error: "Stripe not configured. Set STRIPE_SECRET_KEY to send payment links." },
      { status: 503 },
    );
  }
  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Integer cents on the wire (admin UI); dollars via amountUsd for
  // API-first callers. Both funnel through the same rails.
  const rawCents =
    body.amount_cents !== undefined
      ? Number(body.amount_cents)
      : body.amountUsd !== undefined
        ? Number(body.amountUsd) * 100
        : NaN;
  const amountCents = Math.round(rawCents);
  if (
    !Number.isFinite(amountCents) ||
    amountCents < MIN_AMOUNT_CENTS ||
    amountCents > MAX_AMOUNT_CENTS
  ) {
    return NextResponse.json(
      {
        error: `amount: confirmed rental price must be between ${fmtUsd(
          MIN_AMOUNT_CENTS,
        )} and ${fmtUsd(MAX_AMOUNT_CENTS)}.`,
      },
      { status: 400 },
    );
  }
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

  const inquiryRes = await db
    .from("rental_inquiries")
    .select(
      "id, status, name, email, vehicle_label, start_date, end_date, fleet, partner_name",
    )
    .eq("id", id)
    .maybeSingle();
  if (inquiryRes.error) {
    return NextResponse.json(
      { error: `Database error: ${inquiryRes.error.message}` },
      { status: 500 },
    );
  }
  const inquiry = inquiryRes.data;
  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  // Payment links only make sense mid-pipeline: the operator confirms
  // price on a 'sent' lead; 'new' hasn't been forwarded, and
  // booked/lost are terminal (see /api/admin/inquiries/[id]).
  if (inquiry.status !== "sent") {
    const why =
      inquiry.status === "new"
        ? "Forward it to the operator first (mark it sent) — the operator confirms availability and price before any payment link goes out."
        : inquiry.status === "booked"
          ? "It is already booked — the payment went through."
          : "It is marked lost. Rewinding a terminal state is a deliberate SQL-editor moment, not a button.";
    return NextResponse.json(
      { error: `Inquiry is '${inquiry.status}', not 'sent'. ${why}` },
      { status: 409 },
    );
  }

  // Direct charges need an operator account to land on. RYDA-fleet
  // inquiries carry no partner attribution by design.
  if (!inquiry.partner_name) {
    return NextResponse.json(
      {
        error:
          "This inquiry has no operator attribution (RYDA fleet) — the direct-charge payment rail applies to partner vehicles only.",
      },
      { status: 409 },
    );
  }

  const partnerRes = await db
    .from("partners")
    .select(
      "id, name, status, contact_email, commission_rate, stripe_account_id, stripe_onboarded_at",
    )
    .eq("name", inquiry.partner_name)
    .maybeSingle();
  if (partnerRes.error) {
    if (isTableMissing(partnerRes.error, "partners")) {
      return NextResponse.json(
        {
          error:
            "Partner payments schema not ready — apply migration 0041 (operator approval required) before sending payment links.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `Database error: ${partnerRes.error.message}` },
      { status: 500 },
    );
  }
  const partner = partnerRes.data;
  if (!partner) {
    return NextResponse.json(
      {
        error: `Partner "${inquiry.partner_name}" is not onboarded yet — add them in Admin → Partners and complete Stripe onboarding first.`,
      },
      { status: 404 },
    );
  }
  if (partner.status === "paused") {
    return NextResponse.json(
      { error: `Partner "${partner.name}" is paused — no new bookings until they're resumed.` },
      { status: 409 },
    );
  }
  if (!partner.stripe_account_id || !partner.stripe_onboarded_at) {
    return NextResponse.json(
      {
        error: `Operator "${partner.name}" has not completed Stripe onboarding — send the onboarding link from Admin → Partners, then retry.`,
      },
      { status: 409 },
    );
  }

  // The ONLY fee math. Throws if a partners row was edited out-of-band
  // to a rate outside the [0, 0.5] contract — better a loud 500 than a
  // silently wrong application fee on a live charge.
  let fee: ReturnType<typeof computeRentalFee>;
  try {
    fee = computeRentalFee(amountCents, Number(partner.commission_rate));
  } catch (err) {
    console.error("[payment-link · fee]", err);
    return NextResponse.json(
      { error: "Fee computation failed — check the partner's commission rate." },
      { status: 500 },
    );
  }

  // Idempotency: a double-click (or a second admin) reuses the live
  // pending link instead of minting a duplicate session the webhook
  // would then race on. A live link at a DIFFERENT amount is NOT
  // reusable — silently returning the old link would let an admin
  // believe a re-quote went out while the customer pays the outdated
  // price — so that case is a hard 409 instead.
  const liveCutoff = new Date(Date.now() - SESSION_TTL_S * 1000).toISOString();
  const existing = await db
    .from("rental_payments")
    .select("id, pay_link_url, amount_cents")
    .eq("inquiry_id", inquiry.id)
    .eq("status", "pending")
    .gte("created_at", liveCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) {
    if (isTableMissing(existing.error, "rental_payments")) {
      return NextResponse.json(
        {
          error:
            "Rental payments schema not ready — apply migration 0041 (operator approval required) before sending payment links.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `Database error: ${existing.error.message}` },
      { status: 500 },
    );
  }
  if (existing.data?.pay_link_url) {
    if (existing.data.amount_cents !== fee.amountCents) {
      return NextResponse.json(
        {
          error: `A live payment link for ${fmtUsd(
            existing.data.amount_cents,
          )} already exists for this inquiry — the ${fmtUsd(
            fee.amountCents,
          )} link was NOT created. To re-quote, expire the old Checkout session from the operator's Stripe dashboard (or let it lapse — links live 24h), then create the new link.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      url: existing.data.pay_link_url,
      payLinkUrl: existing.data.pay_link_url,
      deduped: true,
      emailed: false,
    });
  }

  // Repair sweep: a pending row older than the 24h session lifetime is
  // a dead link whose checkout.session.expired event never landed
  // (webhook outage, missed delivery). Flip it to expired here so it
  // can't shadow the new link — and so the one-pending-per-inquiry
  // uniqueness backstop, once migration-applied, can't wedge new links
  // behind a corpse. Best-effort: a failure surfaces on the insert.
  const sweep = await db
    .from("rental_payments")
    .update({ status: "expired" })
    .eq("inquiry_id", inquiry.id)
    .eq("status", "pending")
    .lt("created_at", liveCutoff);
  if (sweep.error && !isTableMissing(sweep.error, "rental_payments")) {
    console.warn("[payment-link · stale sweep]", sweep.error);
  }

  const expiresAtUnix = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripeClient.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: fee.amountCents,
              product_data: {
                name: `${inquiry.vehicle_label} — ${inquiry.start_date} to ${inquiry.end_date}`,
                description: note ?? undefined,
              },
            },
          },
        ],
        customer_email: inquiry.email,
        // The fee-only mechanism: on a direct charge,
        // application_fee_amount is the slice that moves to the
        // platform; everything else settles to the operator.
        payment_intent_data: {
          application_fee_amount: fee.applicationFeeCents,
        },
        metadata: { inquiry_id: inquiry.id, lead: inquiry.id },
        // PUBLIC landing pages: rental inquiries are submitted
        // anonymously as the normal path, so the payer usually has no
        // session — an auth-gated success URL would greet a four-figure
        // payment with a login wall. /rent/booking-confirmed reads the
        // session_id param as a support reference.
        success_url: `${SITE_URL}/rent/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/rent`,
        expires_at: expiresAtUnix,
      },
      // DIRECT charge: the session — and the money — lives on the
      // operator's connected account. This request option is what
      // routes it; remove it and the charge silently lands on the
      // platform balance, which the founder decision forbids.
      { stripeAccount: partner.stripe_account_id },
    );
  } catch (err) {
    console.error("[payment-link · session create]", err);
    return NextResponse.json(
      {
        error:
          "Stripe could not create the payment link. Check the operator's account status and retry.",
      },
      { status: 500 },
    );
  }

  const recordFailure = async () => {
    // The session is live but untracked — the webhook would find no
    // row to flip when the customer pays. Kill it best-effort so an
    // untrackable link can't be paid, then surface the failure.
    try {
      await stripeClient.checkout.sessions.expire(session.id, {}, {
        stripeAccount: partner.stripe_account_id,
      });
    } catch (expireErr) {
      console.error("[payment-link · session expire]", expireErr);
    }
    return NextResponse.json(
      { error: "Could not record the payment link. Nothing was sent — retry." },
      { status: 500 },
    );
  };

  if (!session.url) {
    console.error("[payment-link · session missing url]", session.id);
    return recordFailure();
  }

  const insert = await db
    .from("rental_payments")
    .insert({
      inquiry_id: inquiry.id,
      partner_id: partner.id,
      amount_cents: fee.amountCents,
      currency: "usd",
      application_fee_cents: fee.applicationFeeCents,
      stripe_checkout_session_id: session.id,
      status: "pending",
      pay_link_url: session.url,
    })
    .select("id")
    .single();
  if (insert.error || !insert.data) {
    // 23505 → another admin minted a link between our idempotency
    // check and this insert (the one-pending-per-inquiry unique index
    // is the DB backstop for that race). Our just-created session
    // will never be tracked — kill it, then hand back the winner's
    // link (or a 409 if the winner froze a different amount).
    const code = (insert.error as { code?: string } | null)?.code;
    if (code === "23505") {
      try {
        await stripeClient.checkout.sessions.expire(session.id, {}, {
          stripeAccount: partner.stripe_account_id,
        });
      } catch (expireErr) {
        console.error("[payment-link · duplicate session expire]", expireErr);
      }
      const winner = await db
        .from("rental_payments")
        .select("id, pay_link_url, amount_cents")
        .eq("inquiry_id", inquiry.id)
        .eq("status", "pending")
        .gte("created_at", liveCutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (winner.data?.pay_link_url) {
        if (winner.data.amount_cents !== fee.amountCents) {
          return NextResponse.json(
            {
              error: `Another admin just created a payment link for ${fmtUsd(
                winner.data.amount_cents,
              )} on this inquiry — your ${fmtUsd(
                fee.amountCents,
              )} link was NOT created. Coordinate on the right price before re-quoting.`,
            },
            { status: 409 },
          );
        }
        return NextResponse.json({
          ok: true,
          url: winner.data.pay_link_url,
          payLinkUrl: winner.data.pay_link_url,
          deduped: true,
          emailed: false,
        });
      }
      // Conflict but no visible live winner — surface as a failure;
      // our session is already expired above.
      console.error("[payment-link · 23505 without live winner]", insert.error);
      return NextResponse.json(
        { error: "Could not record the payment link. Nothing was sent — retry." },
        { status: 500 },
      );
    }
    console.error("[payment-link · insert]", insert.error);
    return recordFailure();
  }

  // Email the customer the link. Best-effort: a Resend hiccup must not
  // fail the request — the admin UI shows the link for manual
  // follow-up, and pay_link_sent_at staying null records the miss.
  const emailed = await sendEmail({
    to: inquiry.email,
    subject: `${inquiry.vehicle_label} — complete your booking`,
    // Customer replies go to the team inbox, never the operator.
    replyTo: partnerInquiryEmail(null) || undefined,
    html: payLinkEmailHtml({
      name: inquiry.name,
      vehicleLabel: inquiry.vehicle_label,
      startDate: inquiry.start_date,
      endDate: inquiry.end_date,
      amountCents: fee.amountCents,
      payUrl: session.url,
    }),
  });
  if (emailed) {
    const stamp = await db
      .from("rental_payments")
      .update({ pay_link_sent_at: new Date().toISOString() })
      .eq("id", insert.data.id);
    if (stamp.error) {
      console.warn("[payment-link · sent_at stamp]", stamp.error);
    }
  }

  return NextResponse.json({
    ok: true,
    url: session.url,
    payLinkUrl: session.url,
    emailed,
  });
}
