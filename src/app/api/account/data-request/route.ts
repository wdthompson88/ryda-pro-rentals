// POST /api/account/data-request
// Body: { kind: 'export' | 'delete' }
//
// Privacy actions a member can request: data export (GDPR/CCPA bundle)
// or account deletion (irreversible after a 24h cooling-off, requires
// LLC-share buyback coordination by legal). Both fire a notification
// email to the team — the actual fulfillment is manual today, but the
// member's UI shows a real "request received" instead of a fake
// setTimeout.

import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/api-auth";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { isAllowed, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  if (!isAllowed(`account-dr:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
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
      ? "<p>Coordinate share-buyback with legal, then schedule deletion after the 24h cooling-off window.</p>"
      : "<p>Bundle this user's profile + holdings + bookings + payments + agreements + KYC summary; email a 7-day download link.</p>";

  await notifyTeam({
    subject,
    html: emailLayout(
      heading,
      `
        <p>Member: <strong>${escapeHtml(user.email ?? "(no email)")}</strong></p>
        <p>User ID: <code>${escapeHtml(user.id)}</code></p>
        <p>Submitted: ${new Date().toISOString()}</p>
        ${cta}
      `,
    ),
  });

  return NextResponse.json({ ok: true });
}
