// GET /api/cron/reconcile-pending-purchases
//
// CODEX-CHALLENGE NEW CRITICAL: no scheduled poll exists for stuck
// `pending` share_purchases. Stripe abandons webhook retries after
// ~3 days; if a webhook is dropped (network outage, 500 in handler,
// Vercel cold-start race during a deploy), the row sits in `pending`
// indefinitely and the member sees "Awaiting payment" forever on the
// /share-purchase/[id] tracker.
//
// This cron runs hourly (vercel.json) and:
//   1. Finds share_purchases with status='pending' AND created_at older
//      than RECONCILE_AFTER_HOURS (default 1h — gives the webhook
//      enough time to land normally before we look at the row).
//   2. For rows with `stripe_session_id`, asks Stripe what the session
//      actually did:
//        - paid + complete → notify-team for manual webhook replay
//          (we don't auto-fulfill here because fulfillment includes
//          PDF + email side-effects that the webhook handler owns).
//        - expired / canceled / open-but-stale → flip status to
//          'canceled' so the tracker UI updates.
//        - still 'open' AND age > 24h → flip to 'canceled' (Stripe
//          sessions auto-expire at 24h anyway).
//   3. For rows with NO `stripe_session_id` (non-Stripe funding paths
//      via /api/share-purchase/intent — wire/crypto/liquidity/finance):
//      auto-cancel only if older than STALE_NON_STRIPE_HOURS (default
//      168h = 7 days). Ops handles the wire-confirmation handoff and
//      will mark-paid manually before then.
//
// Auth: bearer-token compare against CRON_SECRET (constant-time, same
// pattern as expire-transfers).

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireStripe } from "@/lib/stripe";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";

export const runtime = "nodejs";

const RECONCILE_AFTER_HOURS = 1;
const STALE_STRIPE_HOURS = 24; // Stripe sessions auto-expire at 24h
const STALE_NON_STRIPE_HOURS = 168; // 7 days for wire/crypto/etc.
const PAGE_SIZE = 50; // cap per-run to avoid timeouts under bursts
// Re-notify ops about a stuck-paid row at most this often. Codex
// final-review NEW_REGRESSION fix: without this, the cron pings
// ops every hour for the same row until manual webhook replay
// completes — alert fatigue that masks fresh stuck rows.
const RENOTIFY_AFTER_HOURS = 24;

function bearerMatches(got: string, expected: string): boolean {
  const prefix = "Bearer ";
  if (!got.startsWith(prefix)) return false;
  const gotToken = got.slice(prefix.length);
  if (gotToken.length !== expected.length) return false;
  return timingSafeEqual(
    Buffer.from(gotToken, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

type StuckPurchase = {
  id: string;
  user_id: string;
  email: string | null;
  shares: number;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  total_cents: number | null;
  funding_method: string | null;
  ops_notified_at: string | null;
  stripe_session_id: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
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
  let stripe;
  try {
    admin = requireSupabaseAdmin();
    stripe = requireStripe();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  const reconcileBefore = new Date(
    Date.now() - RECONCILE_AFTER_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const stuckRes = await admin
    .from("share_purchases")
    .select(
      "id, user_id, email, shares, vehicle_symbol, boat_slug, total_cents, funding_method, stripe_session_id, created_at, ops_notified_at",
    )
    .eq("status", "pending")
    .lt("created_at", reconcileBefore)
    .order("created_at", { ascending: true })
    .limit(PAGE_SIZE);

  if (stuckRes.error) {
    console.error("[cron · reconcile-pending · query]", stuckRes.error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }
  const stuck: StuckPurchase[] = stuckRes.data ?? [];

  const summary = {
    scanned: stuck.length,
    stripe_paid_needs_manual_replay: 0,
    canceled_stripe_stale: 0,
    canceled_non_stripe_stale: 0,
    still_open: 0,
    errors: 0,
  };
  const needsManualReplay: StuckPurchase[] = [];

  const now = Date.now();
  for (const p of stuck) {
    const ageHours = (now - new Date(p.created_at).getTime()) / (60 * 60 * 1000);
    try {
      if (p.stripe_session_id) {
        const session = await stripe.checkout.sessions.retrieve(
          p.stripe_session_id,
        );
        if (session.payment_status === "paid" && session.status === "complete") {
          // Stripe says paid but our DB still shows pending — webhook
          // dropped on the floor. Don't auto-fulfill (would duplicate
          // the webhook's side-effects out-of-band); notify ops to
          // resend the event from Stripe dashboard.
          summary.stripe_paid_needs_manual_replay += 1;
          needsManualReplay.push(p);
        } else if (
          session.status === "expired" ||
          (session.status === "open" && ageHours > STALE_STRIPE_HOURS)
        ) {
          // Codex review caught: must check update.error or summary
          // lies (claims canceled when Supabase rejected the write).
          const upd = await admin
            .from("share_purchases")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("id", p.id)
            .eq("status", "pending");
          if (upd.error) {
            console.error("[cron · reconcile · cancel-stripe-stale]", p.id, upd.error);
            summary.errors += 1;
          } else {
            summary.canceled_stripe_stale += 1;
          }
        } else {
          summary.still_open += 1;
        }
      } else {
        // Non-Stripe funding: ops typically marks paid within a week.
        // Past 7 days with no movement, the row is dead.
        if (ageHours > STALE_NON_STRIPE_HOURS) {
          const upd = await admin
            .from("share_purchases")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("id", p.id)
            .eq("status", "pending");
          if (upd.error) {
            console.error("[cron · reconcile · cancel-non-stripe-stale]", p.id, upd.error);
            summary.errors += 1;
          } else {
            summary.canceled_non_stripe_stale += 1;
          }
        } else {
          summary.still_open += 1;
        }
      }
    } catch (err) {
      console.error("[cron · reconcile-pending · row]", p.id, err);
      summary.errors += 1;
    }
  }

  // Notify-team only when we have action items. Quiet successful runs.
  // Skip rows we've already notified about within the last
  // RENOTIFY_AFTER_HOURS window so the same stuck row doesn't ping
  // ops every hour. Codex final-review NEW_REGRESSION fix.
  const notifyCutoff = now - RENOTIFY_AFTER_HOURS * 60 * 60 * 1000;
  const toNotify = needsManualReplay.filter(
    (p) =>
      !p.ops_notified_at ||
      new Date(p.ops_notified_at).getTime() < notifyCutoff,
  );
  const suppressedDup = needsManualReplay.length - toNotify.length;
  // Surface dedup count in the summary so a low alert volume
  // doesn't hide that the underlying problem is still present.
  (summary as Record<string, number>).suppressed_already_notified =
    suppressedDup;

  if (toNotify.length > 0) {
    try {
      await notifyTeam({
        subject: `Stuck-paid alert: ${toNotify.length} purchase(s) need webhook replay`,
        html: emailLayout(
          "Stripe shows paid but our DB still says pending",
          `<p>The hourly reconciliation cron found purchases where
          Stripe confirmed payment but our share-purchase webhook
          never landed. Re-send the
          <code>checkout.session.completed</code> event from the
          Stripe dashboard for each row — the webhook handler is
          idempotent and will mint holdings + send the amendment.</p>
          ${
            suppressedDup > 0
              ? `<p style="color:#666;font-size:13px;">
                  (${suppressedDup} additional row${
                    suppressedDup === 1 ? "" : "s"
                  } suppressed: already notified within
                  ${RENOTIFY_AFTER_HOURS}h.)
                </p>`
              : ""
          }
          <ul>${toNotify
            .map(
              (p) =>
                `<li><code>${escapeHtml(p.id)}</code> — session
                <code>${escapeHtml(String(p.stripe_session_id))}</code> —
                ${p.shares} share(s) of
                <strong>${escapeHtml(
                  String(p.vehicle_symbol ?? p.boat_slug ?? "asset"),
                )}</strong> for
                ${escapeHtml(p.email ?? "(no email)")}</li>`,
            )
            .join("")}</ul>`,
        ),
      });

      // Stamp ops_notified_at so the next cron run skips these
      // unless they're still stuck after RENOTIFY_AFTER_HOURS.
      // Best-effort: a stamping failure means we may re-notify
      // next hour, which is the previous (noisy) behavior — log
      // but don't 503.
      const stampErr = await admin
        .from("share_purchases")
        .update({ ops_notified_at: new Date().toISOString() })
        .in(
          "id",
          toNotify.map((p) => p.id),
        );
      if (stampErr.error) {
        console.error(
          "[cron · reconcile-pending · stamp ops_notified_at]",
          stampErr.error,
        );
        summary.errors += 1;
      }
    } catch (err) {
      console.error("[cron · reconcile-pending · notify]", err);
      summary.errors += 1;
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
