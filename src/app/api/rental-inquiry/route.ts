// POST /api/rental-inquiry — capture a rental lead (rentals-first funnel).
// GET  /api/rental-inquiry — the signed-in caller's own inquiries, newest first.
//
// Lead-gen model: RYDA routes the inquiry to the vehicle's operator, the
// operator closes the rental on their own contract and insurance, and RYDA
// earns a referral commission. Nothing here takes payment.
//
// Account-first but never lose a lead: signup uses email confirmation (no
// immediate session), so the anonymous insert is the NORMAL path (0039 RLS
// allows it). A valid session upgrades the row with user_id and maintains a
// rental_profiles row for autofill (0040) — it never gates the insert.

import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { emailLayout, escapeHtml } from "@/lib/notify";
import { partnerInquiryEmail } from "@/lib/partner-contacts";
import { validateRentalInquiry, type RentalInquiry } from "@/lib/rental-inquiry";
import {
  partnerFetchers,
  planOperatorLookup,
  isColumnMissing,
  droppableOptionalColumn,
} from "@/lib/partner-resolution";
import type { SupabaseClient } from "@supabase/supabase-js";

const RATE_LIMIT = 5;            // 5 submissions per minute, contact-style
const RATE_WINDOW_MS = 60_000;

// Local best-effort sender. notifyTeam (src/lib/notify.ts) pins the
// recipient to the team inbox; inquiry routing needs a caller-chosen `to`
// (partner inbox with team fallback) plus a separate customer confirmation.
// Same semantics as notifyTeam: never throws — email is a side effect of
// the DB write, not a failure mode.
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
    console.log("[rental-inquiry · email skipped, missing config]", { subject: args.subject });
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
      console.error("[rental-inquiry · resend]", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[rental-inquiry · email throw]", e);
    return false;
  }
}

// Internal routing email. partner_name is ops attribution and IS allowed
// here (this never reaches a customer) — the customer-facing counterpart
// below must never mention it.
function partnerEmailHtml(inquiry: RentalInquiry, linked: boolean): string {
  return emailLayout(`New rental inquiry: ${escapeHtml(inquiry.vehicleLabel)}`, `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">From</div>
    <div style="font-size:16px;font-weight:500;margin-top:2px;">${escapeHtml(inquiry.name)}</div>
    <div style="margin-top:2px;"><a href="mailto:${escapeHtml(inquiry.email)}" style="color:#DC4747;text-decoration:none;">${escapeHtml(inquiry.email)}</a></div>
    ${inquiry.phone ? `<div style="margin-top:2px;color:#3c3c3c;">${escapeHtml(inquiry.phone)}</div>` : ""}
    <div style="margin-top:2px;font-size:12px;color:#9A9590;">${linked ? "Linked RYDA account" : "No session — account may be pending email confirmation"}</div>
    <div style="margin-top:14px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">Vehicle</div>
      <div style="margin-top:2px;font-weight:500;">${escapeHtml(inquiry.vehicleLabel)}</div>
      <div style="margin-top:2px;font-size:12px;color:#3c3c3c;">Operator: ${escapeHtml(inquiry.partnerName)} · ${escapeHtml(inquiry.vehicleSlug)}</div>
    </div>
    <div style="margin-top:14px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">Dates</div>
      <div style="margin-top:2px;font-weight:500;">${escapeHtml(inquiry.startDate)} → ${escapeHtml(inquiry.endDate)}</div>
    </div>
    ${inquiry.message ? `
      <div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;margin-bottom:6px;">Message</div>
      <div style="white-space:pre-wrap;color:#1c1c1c;">${escapeHtml(inquiry.message)}</div>
    ` : ""}
    <div style="margin-top:14px;font-size:12px;color:#9A9590;">Marketing opt-in: ${inquiry.marketingOptIn ? "yes" : "no"}</div>
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e1d8;font-size:13px;color:#3c3c3c;">
      <strong>Hit reply</strong> to respond, this email's reply-to is set to ${escapeHtml(inquiry.email)}.
    </div>
  `);
}

// Customer confirmation. NEVER name the operator here — the commission
// model is stated plainly.
//
// The closing line said "No card, no payment" until the truth pass. RYDA
// does email a Stripe Checkout link once the operator confirms, so a
// blanket "no payment" is a promise the next email breaks — which is
// exactly what makes a genuine pay link look like phishing. The honest
// version is "no card at request", followed by the mechanism.
function customerEmailHtml(inquiry: RentalInquiry): string {
  return emailLayout("Your request is in", `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(inquiry.name)},</p>
    <p style="margin:0 0 12px;">
      We've received your request for the <strong>${escapeHtml(inquiry.vehicleLabel)}</strong>,
      ${escapeHtml(inquiry.startDate)} to ${escapeHtml(inquiry.endDate)}.
    </p>
    <p style="margin:0 0 12px;">
      Your price is the operator's price — inquiring through RYDA never costs you
      more than going direct. Operators pay RYDA a referral commission on bookings
      we send them; that's the whole model.
    </p>
    <p style="margin:0;">
      No card at request. Once you and the operator have agreed the dates, we'll
      send you a secure Stripe link — that charge settles on the operator's own
      Stripe account, and RYDA's commission is collected as a platform fee on it.
    </p>
  `);
}

// Columns the lead can land WITHOUT, in strip order. Each arrives with a
// migration the operator has to approve (user_id with 0040, partner_id
// with 0045), and partner_id additionally carries a foreign key that can
// stop resolving between the lookup and the insert. The retry below drops
// whichever one the insert blames.
const OPTIONAL_INSERT_COLUMNS = ["partner_id", "user_id"] as const;

// Resolve the operator row for a lead at CAPTURE time so the row carries
// a stable id, not just the name partner-fleet.ts happened to stamp on
// the vehicle. Best-effort by design: an unknown operator, a missing
// partners table (pre-0041) or a DB blip must cost the lead its FK, never
// the lead itself — partner_name still lands and the pay-link resolver
// falls back to it.
//
// The name goes through planOperatorLookup rather than straight into the
// fetcher so capture time and pay-link time normalize it identically. A
// name that only differs by surrounding whitespace would otherwise
// resolve at pay-link time (trimmed) but be invisible to both the 0045
// backfill and the rename guard, which match exactly.
async function resolvePartnerId(
  db: SupabaseClient,
  partnerName: string | null,
): Promise<string | null> {
  const key = planOperatorLookup({ partner_name: partnerName });
  if (!key) return null;
  const res = await partnerFetchers<{ id: string }>(db, "id").byName(key.value);
  if (!res.ok) {
    console.warn("[rental-inquiry · partner lookup]", res.error?.message);
    return null;
  }
  if (!res.partner) {
    // The operator is on the code-level fleet but not on the roster.
    // Worth a line: it is also why their pay link would 404.
    console.warn("[rental-inquiry · unknown operator]", key.value);
    return null;
  }
  return res.partner.id;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAllowed(`rental-inquiry:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS))) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const result = validateRentalInquiry(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const inquiry = result.value;

    const admin = supabaseAdmin();
    if (!admin) {
      // Fail closed in production, never tell the user "we got it" if we
      // didn't actually persist. Dev mode logs metadata only (no PII).
      if (process.env.NODE_ENV === "production") {
        console.error("[rental-inquiry · misconfigured]");
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please email us directly." },
          { status: 503 },
        );
      }
      console.log("[rental-inquiry · dev no-db]", {
        vehicle: inquiry.vehicleSlug,
        ts: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, persisted: false });
    }

    // Session is optional by design: signup uses email confirmation so most
    // first-time submitters have no session yet. Present → link the lead.
    const user = await getUserFromRequest(req);

    // Attribution is written twice on purpose (0045): partner_id is the
    // identity everything joins on, partner_name is the historical label —
    // what this operator was called when the lead came in. Renaming the
    // operator changes the former's target, never the latter.
    const partnerId = await resolvePartnerId(admin, inquiry.partnerName);

    const row: Record<string, unknown> = {
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      vehicle_slug: inquiry.vehicleSlug,
      vehicle_label: inquiry.vehicleLabel,
      // Every lead is an operator's — the RYDA-owned rail is gone. The
      // column itself survives because 0039 declares it
      // `not null check (fleet in ('ryda','partner'))` and migrations
      // are not rewritten in place; historical rows keep whatever they
      // were captured as.
      fleet: "partner",
      partner_name: inquiry.partnerName,
      market: "Miami",
      start_date: inquiry.startDate,
      end_date: inquiry.endDate,
      message: inquiry.message,
      marketing_opt_in: inquiry.marketingOptIn,
      client_token: inquiry.clientToken,
    };
    if (user) row.user_id = user.id;
    if (partnerId) row.partner_id = partnerId;

    let { data: inserted, error: insertError } = await admin
      .from("rental_inquiries")
      .insert(row)
      .select("id")
      .single();

    // Optional-column fallback, two failure modes, one response: strip
    // that key and retry, so the LEAD still lands.
    //
    //  · "no such column" — user_id arrives with migration 0040 and
    //    partner_id with 0045, both operator-approved, so both have a
    //    pre-migration window (mirrors the contact route's `context`
    //    fallback).
    //  · foreign key violation (23503) — partner_id resolved a moment
    //    ago and the partners row went away before the insert (ops
    //    merging duplicates, or the approval bridge rolling back a row
    //    it had just created). The FK is attribution; losing it costs
    //    the lead its id, and that is the trade this route promises.
    //
    // Bounded by the number of optional columns: each pass removes
    // exactly one, so it cannot spin.
    for (let attempt = 0; attempt < OPTIONAL_INSERT_COLUMNS.length; attempt++) {
      if (!insertError) break;
      const missing = droppableOptionalColumn(
        insertError,
        row,
        OPTIONAL_INSERT_COLUMNS,
      );
      if (!missing) break;
      console.warn("[rental-inquiry · dropping column]", missing, insertError.message);
      delete row[missing];
      ({ data: inserted, error: insertError } = await admin
        .from("rental_inquiries")
        .insert(row)
        .select("id")
        .single());
    }

    if (insertError || !inserted) {
      // Idempotency: 23505 on the partial unique client_token index means
      // this exact form mount already submitted (double tap / retry). The
      // lead exists — that's a success, not an error. Return the existing
      // row's id so the client behaves identically on both paths.
      const code = (insertError as { code?: string } | null)?.code;
      const msg = (insertError?.message ?? "").toLowerCase();
      if (code === "23505" && msg.includes("client_token") && inquiry.clientToken) {
        const existing = await admin
          .from("rental_inquiries")
          .select("id")
          .eq("client_token", inquiry.clientToken)
          .maybeSingle();
        return NextResponse.json({ ok: true, id: existing.data?.id ?? null });
      }
      console.error("[rental-inquiry · insert]", insertError);
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    // Autofill store for repeat renters (0040). Best-effort: a profile
    // write failing (e.g. migration not applied yet) must not lose the
    // lead that already landed above.
    if (user) {
      const profile = await admin.from("rental_profiles").upsert(
        {
          user_id: user.id,
          full_name: inquiry.name,
          phone: inquiry.phone,
          marketing_opt_in: inquiry.marketingOptIn,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (profile.error) {
        console.error("[rental-inquiry · profile upsert]", profile.error);
      }
    }

    // Notifications, both best-effort. Partner routing falls back to the
    // team inbox until referral agreements confirm a real partner address
    // (see partner-contacts.ts).
    await sendEmail({
      to: partnerInquiryEmail(inquiry.partnerName),
      subject: `Rental inquiry · ${inquiry.vehicleLabel} · ${inquiry.startDate} → ${inquiry.endDate}`,
      replyTo: inquiry.email,
      html: partnerEmailHtml(inquiry, !!user),
    });
    await sendEmail({
      to: inquiry.email,
      subject: `Request received — ${inquiry.vehicleLabel}`,
      // Customer replies go to the team inbox, not the partner.
      replyTo: partnerInquiryEmail(null) || undefined,
      html: customerEmailHtml(inquiry),
    });

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}

// "No such column" detection for the GET path. user_id arrives with
// migration 0040 (operator-approved); until it's applied, queries
// touching the column error and must degrade, not 500 the dashboard.
// The predicate itself now lives in partner-resolution.ts so the
// partner_id (0045) degradation uses the same one.
function isUserIdColumnMissing(error: { message?: string } | null): boolean {
  return isColumnMissing(error, "user_id");
}

export async function GET(req: NextRequest) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Claim anon-path leads. The normal funnel submits the inquiry with
  // NO session (signup is email-confirmation), so the row lands with
  // user_id NULL — and the success UI promises "confirm the email and
  // your requests will be waiting in your dashboard". Make that true:
  // a session only exists after the email is confirmed, so the session
  // email is verified and it's safe to link every unclaimed row that
  // was submitted under it. Best-effort — a failure (e.g. 0040 not
  // applied yet) never blocks the read below.
  if (user.email) {
    const { error: claimError } = await admin
      .from("rental_inquiries")
      .update({ user_id: user.id })
      .is("user_id", null)
      // validateRentalInquiry lowercases before insert; mirror it.
      .eq("email", user.email.toLowerCase());
    if (claimError && !isUserIdColumnMissing(claimError)) {
      console.error("[rental-inquiry · claim]", claimError);
    }
  }

  // Service-role client bypasses RLS, so the user_id filter here IS the
  // authorization boundary — mirror bookings GET. partner_name is
  // deliberately excluded from the select: operators are never named
  // publicly, the UI says "a vetted Miami operator". `fleet` is excluded
  // too — there is only one rail now, so it tells a member nothing.
  const { data, error } = await admin
    .from("rental_inquiries")
    .select(
      "id, vehicle_slug, vehicle_label, market, start_date, end_date, message, marketing_opt_in, status, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Pre-0040 window: the user_id column doesn't exist yet, so no row
    // can be linked to this member. An empty history is the truthful
    // degraded state — mirrors the POST handler's schema-cache
    // fallback rather than 500ing every /account/requests visit.
    if (isUserIdColumnMissing(error)) {
      return NextResponse.json({ inquiries: [] });
    }
    console.error("[rental-inquiry · list]", error);
    return NextResponse.json({ error: "Could not fetch inquiries." }, { status: 500 });
  }
  return NextResponse.json({ inquiries: data ?? [] });
}
