// GET /api/cron/social-publisher
//
// Vercel cron that drains the content_queue table.
//
// Workflow:
//   1. CRON_SECRET-gated bearer compare (mirrors other cron routes)
//   2. Find rows where status='scheduled' AND scheduled_at <= now()
//   3. Atomically claim each row by flipping status → 'processing'
//      (CAS on the previous status so two cron instances can't
//      double-publish)
//   4. Dispatch to lib/social.publishRow → connector → API call
//   5. On success: status='published', published_at + published_url
//   6. On transient error: increment retry_count, set last_error,
//      revert status to 'scheduled' with backed-off scheduled_at
//      (15min → 1hr → 6hr); after 3 retries flip to 'failed' +
//      notify ops
//   7. On permanent error: status='failed' immediately + notify ops
//   8. On not_configured: log warning, leave status='scheduled' so a
//      future credential drop unblocks naturally
//
// Cap: process at most 50 rows per run to avoid Vercel function
// timeout. Cron runs every 15 minutes.

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { publishRow } from "@/lib/social";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import type { ContentQueueRow } from "@/lib/social";

export const runtime = "nodejs";

const PAGE_SIZE = 50;
const RETRY_BACKOFFS_MS = [15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
const MAX_RETRIES = RETRY_BACKOFFS_MS.length;

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
  try {
    admin = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();

  // Find scheduled rows whose time has come.
  const dueQuery = await admin
    .from("content_queue")
    .select(
      "id, channel, title, body, image_path, hashtags, metadata, status, scheduled_at, published_at, published_url, retry_count, last_error, source_file",
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (dueQuery.error) {
    console.error("[social-publisher] query failed", dueQuery.error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  const summary = {
    scanned: dueQuery.data?.length ?? 0,
    published: 0,
    transient_errors: 0,
    permanent_errors: 0,
    not_configured: 0,
    claim_lost: 0,
  };
  const failures: { row: ContentQueueRow; error: string }[] = [];

  for (const raw of (dueQuery.data ?? []) as ContentQueueRow[]) {
    // Atomic claim: flip status scheduled → processing only if it's
    // still scheduled. Lost-the-race rows skip silently.
    const claim = await admin
      .from("content_queue")
      .update({
        status: "processing",
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", raw.id)
      .eq("status", "scheduled")
      .select("id");
    if (claim.error || !claim.data?.length) {
      summary.claim_lost += 1;
      continue;
    }

    let result;
    try {
      result = await publishRow(raw);
    } catch (err) {
      result = {
        kind: "transient_error" as const,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (result.kind === "published") {
      await admin
        .from("content_queue")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          published_url: result.url,
          last_error: null,
        })
        .eq("id", raw.id);
      summary.published += 1;
    } else if (result.kind === "not_configured") {
      // Don't burn retries — credentials might be wired later.
      // Leave status='scheduled' but stamp last_error so admin
      // queue shows what's blocking.
      await admin
        .from("content_queue")
        .update({
          status: "scheduled",
          last_error: `not configured: missing env ${result.missingEnv.join(", ")}`,
        })
        .eq("id", raw.id);
      summary.not_configured += 1;
    } else if (result.kind === "transient_error") {
      const nextRetry = raw.retry_count + 1;
      if (nextRetry > MAX_RETRIES) {
        await admin
          .from("content_queue")
          .update({
            status: "failed",
            retry_count: nextRetry,
            last_error: result.error,
          })
          .eq("id", raw.id);
        summary.permanent_errors += 1;
        failures.push({ row: raw, error: result.error });
      } else {
        const backoff = RETRY_BACKOFFS_MS[nextRetry - 1];
        const nextScheduled = new Date(Date.now() + backoff).toISOString();
        await admin
          .from("content_queue")
          .update({
            status: "scheduled",
            scheduled_at: nextScheduled,
            retry_count: nextRetry,
            last_error: result.error,
          })
          .eq("id", raw.id);
        summary.transient_errors += 1;
      }
    } else {
      // permanent_error → no retries
      await admin
        .from("content_queue")
        .update({
          status: "failed",
          retry_count: raw.retry_count + 1,
          last_error: result.error,
        })
        .eq("id", raw.id);
      summary.permanent_errors += 1;
      failures.push({ row: raw, error: result.error });
    }
  }

  if (failures.length > 0) {
    try {
      await notifyTeam({
        subject: `Social publisher: ${failures.length} failure${failures.length === 1 ? "" : "s"}`,
        html: emailLayout(
          "Content publish failures",
          `<p>${failures.length} content row(s) failed to publish via the autonomous social publisher.
          Check <code>/admin/content-queue?status=failed</code> for details.</p>
          <ul>${failures
            .map(
              (f) =>
                `<li><strong>${escapeHtml(f.row.channel)}</strong> · ${escapeHtml(
                  f.row.title ?? f.row.body.slice(0, 60),
                )} · <code>${escapeHtml(f.error.slice(0, 200))}</code></li>`,
            )
            .join("")}</ul>`,
        ),
      });
    } catch (err) {
      console.error("[social-publisher] notify failed", err);
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
