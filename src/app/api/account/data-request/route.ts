// POST /api/account/data-request
// Body: { kind: 'export' | 'delete' }
//
// Privacy actions an account holder can request: a copy of their data,
// or deletion of their account. Neither is performed by code — this
// route records the request and notifies the team, and a person does
// the rest. The ops copy below is an instruction to that person, so it
// has to describe work that exists: it used to say "coordinate
// share-buyback with legal", and RYDA sells no shares.
//
// Reliability:
//   1. Persist a contact_messages row FIRST. That's the durable
//      audit trail — if the email pipe fails, ops still has a queue
//      they can scan. (We don't tell the member "request received"
//      until at least the row write succeeds.)
//   2. Then fire notifyTeam. If that fails the row exists so the
//      request isn't lost; we log + return 200 so the user UX
//      doesn't show a misleading error after the durable write.
//   3. Rate limit by IP + user_id so users on shared NAT don't
//      lock each other out.

import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { isAllowed, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Rate-limit key includes user_id so shared-NAT (corporate, dorm)
  // doesn't have one user lock another out at 3/min.
  if (!(await isAllowed(`account-dr:${user.id}:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "delete" ? "delete" : body.kind === "export" ? "export" : null;
  if (!kind) {
    return NextResponse.json(
      { error: "kind must be 'export' or 'delete'." },
      { status: 400 },
    );
  }

  const subject =
    kind === "delete"
      ? `Account deletion request · ${user.email ?? user.id}`
      : `Data export request · ${user.email ?? user.id}`;

  const heading = kind === "delete" ? "Account deletion request" : "Data export request";
  const cta =
    kind === "delete"
      ? "<p>Delete this user's RYDA account and the personal data attached to it: auth user, rental_profiles, rental_inquiries, rental_bookings, kyc_verifications. Reply to them at the address above when it is done. Rentals already arranged with an operator are not ours to cancel — say so if they ask.</p>"
      : "<p>Assemble what we hold on this user — auth profile, rental_profiles, rental_inquiries, rental_bookings, kyc_verifications status — and email it to the address above.</p>";

  // Persist to contact_messages first (existing table, has the
  // 'context' column for surfacing the request type to ops).
  const admin = supabaseAdmin();
  if (admin) {
    const persist = await admin.from("contact_messages").insert({
      name: user.email ?? "(no name)",
      email: user.email ?? "",
      phone: null,
      inquiry_type: "Other",
      market: "Not sure",
      message:
        kind === "delete"
          ? `Account deletion request from ${user.email ?? user.id}. User initiated from /account/privacy. Delete the auth user plus rental_profiles, rental_inquiries, rental_bookings and kyc_verifications rows, then reply to them. Rentals already arranged with an operator are between the user and that operator.`
          : `Data request from ${user.email ?? user.id}. Assemble auth profile + rental_profiles + rental_inquiries + rental_bookings + kyc_verifications status and email it to them.`,
      context: kind === "delete" ? "Account deletion" : "Data export",
    });
    if (persist.error) {
      console.error("[account-dr · persist]", persist.error);
      return NextResponse.json(
        { error: "Could not record request." },
        { status: 500 },
      );
    }
  } else {
    // No backend wired (preview deploy). Tell the member politely
    // rather than fake-success.
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please email us directly." },
      { status: 503 },
    );
  }

  // Best-effort email notification. Don't fail the request if the
  // email send fails — the row above is the durable record ops
  // works from.
  try {
    await notifyTeam({
      subject,
      html: emailLayout(
        heading,
        `
          <p>Account: <strong>${escapeHtml(user.email ?? "(no email)")}</strong></p>
          <p>User ID: <code>${escapeHtml(user.id)}</code></p>
          <p>Submitted: ${new Date().toISOString()}</p>
          ${cta}
        `,
      ),
    });
  } catch (err) {
    console.error("[account-dr · notify]", err);
  }

  return NextResponse.json({ ok: true });
}
