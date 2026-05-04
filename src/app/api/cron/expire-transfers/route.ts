// GET /api/cron/expire-transfers
//
// Flips share_transfers rows from 'requested' to 'expired' when
// their expires_at has passed. The respond route also lazy-flips
// on read, but lazy-flip only fires when someone visits the
// recipient page; rows that nobody loads sit in 'requested'
// forever without this cron.
//
// Idempotent: runs the same UPDATE every time; rows already
// non-'requested' don't match the WHERE clause and are skipped.
//
// Auth: protected by CRON_SECRET (Vercel cron sets this header
// automatically when the route is wired in vercel.json). Manual
// invocation requires the same secret.
//
// Schedule: hourly is plenty (transfers expire after 14 days; an
// hour of latency between expiry and status flip is fine).

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Constant-time bearer-token compare. `===` on strings short-circuits
// on the first mismatched byte, leaking the secret length over enough
// requests; timingSafeEqual operates on equal-length buffers so the
// comparison time depends only on length, which we pre-check.
function bearerMatches(got: string, expected: string): boolean {
  const prefix = "Bearer ";
  if (!got.startsWith(prefix)) return false;
  const gotToken = got.slice(prefix.length);
  if (gotToken.length !== expected.length) return false;
  const a = Buffer.from(gotToken, "utf8");
  const b = Buffer.from(expected, "utf8");
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  // Auth — Vercel cron passes a Bearer token from CRON_SECRET.
  // For manual invocation, set the header by hand.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  const got = req.headers.get("authorization") ?? "";
  if (!bearerMatches(got, expected)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("share_transfers")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "requested")
    .lt("expires_at", nowIso)
    .select("id");
  if (error) {
    console.error("[cron · expire-transfers]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  const count = data?.length ?? 0;
  console.log(`[cron · expire-transfers] expired ${count} row(s)`);

  // Bundled drift-detection pass — Hobby tier limits us to 1
  // cron/day, so we piggy-back the "stuck-paid" check onto this
  // route. Surfaces share_purchases rows where status='paid' but
  // fulfilled_at IS NULL > 1 hour, which would indicate a webhook
  // partial-fulfillment that never repaired itself. Reported via
  // notifyTeam if any rows match. Required for the PDF Sentry alert
  // rule "stuck paid >1h needs ops attention."
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const drift = await admin
      .from("share_purchases")
      .select("id, user_id, vehicle_symbol, boat_slug, paid_at")
      .eq("status", "paid")
      .is("fulfilled_at", null)
      .lt("paid_at", oneHourAgo)
      .limit(20);
    if (drift.error) {
      console.error("[cron · drift-detect]", drift.error);
    } else if (drift.data && drift.data.length > 0) {
      console.warn(
        `[cron · drift-detect] ${drift.data.length} stuck paid >1h`,
        drift.data.map((r) => r.id),
      );
      // Best-effort notify — don't fail the cron if email's down.
      const { notifyTeam, emailLayout, escapeHtml } = await import("@/lib/notify");
      const ids = drift.data.map((r) => r.id);
      try {
        await notifyTeam({
          subject: `Drift alert: ${ids.length} stuck-paid purchase(s) >1h`,
          html: emailLayout(
            "Stuck paid + null fulfilled_at",
            `<p>Daily drift check found <strong>${ids.length}</strong>
            purchase(s) at status=paid with fulfilled_at IS NULL for
            longer than 1 hour. Re-run the manual fulfillment route
            (<code>POST /api/admin/purchase/&lt;id&gt;/mark-paid</code>)
            on each, or investigate via the audit log.</p>
            <ul>${ids.map((id) => `<li><code>${escapeHtml(id)}</code></li>`).join("")}</ul>`,
          ),
        });
      } catch (err) {
        console.error("[cron · drift-detect · notify]", err);
      }
    }
    return NextResponse.json({
      ok: true,
      expired: count,
      stuck_paid: drift.data?.length ?? 0,
    });
  } catch (err) {
    console.error("[cron · drift-detect · uncaught]", err);
    // Drift check failure shouldn't fail the whole cron.
    return NextResponse.json({ ok: true, expired: count });
  }
}
