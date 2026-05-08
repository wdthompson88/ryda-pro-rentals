// GET /api/cron/template-hash-check
//
// Daily cron that fetches every Dropbox Sign template referenced in
// TEMPLATES (lib/dropbox-sign.ts), computes the canonical structural
// hash, and compares against template-hashes.json at the repo root.
// Mismatch fires notifyTeam so ops can investigate before more
// members sign a tampered template.
//
// Auth: bearer-token compare against CRON_SECRET (timing-safe).
// Skips with 200 if Dropbox Sign is unconfigured (pre-launch state).
// Skips per-template with logged warning if the manifest has no
// entry for that template — pre-launch the manifest is empty.

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  isDropboxSignConfigured,
  templateApi,
  TEMPLATES,
} from "@/lib/dropbox-sign";
import {
  loadManifest,
  verifyAgainstManifest,
  type VerificationResult,
} from "@/lib/template-hashes";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";

export const runtime = "nodejs";

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

  if (!isDropboxSignConfigured()) {
    // Pre-launch / dev: no API key, nothing to check.
    return NextResponse.json({
      ok: true,
      skipped: "dropbox_sign_not_configured",
    });
  }

  const manifest = loadManifest();
  if (!manifest) {
    return NextResponse.json({
      ok: true,
      skipped: "manifest_missing",
    });
  }
  if (Object.keys(manifest.templates).length === 0) {
    return NextResponse.json({ ok: true, skipped: "manifest_empty" });
  }

  // Each TEMPLATES entry that has a non-empty value is a candidate.
  const candidateIds = Object.values(TEMPLATES).filter((id) => id.length > 0);
  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no_template_ids" });
  }

  const results: VerificationResult[] = [];
  const api = templateApi();

  for (const templateId of candidateIds) {
    const manifestEntry = manifest.templates[templateId];
    if (!manifestEntry) {
      // Configured template that's not in the manifest yet — log,
      // don't alert. Operator runs the sync script after adding a
      // new template.
      console.warn(
        "[template-hash-check] template configured but not pinned",
        templateId,
      );
      continue;
    }
    try {
      const resp = await api.templateGet(templateId);
      const template = (resp.body?.template ?? {}) as Record<string, unknown>;
      results.push(verifyAgainstManifest(manifestEntry, templateId, template));
    } catch (err) {
      results.push({
        kind: "fetch_error",
        templateId,
        label: manifestEntry.label,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const mismatches = results.filter((r) => r.kind === "mismatch");
  const fetchErrors = results.filter((r) => r.kind === "fetch_error");
  const matches = results.filter((r) => r.kind === "match");

  // Notify on any anomaly. Mismatch is the security-critical one;
  // fetch_error means we couldn't verify (could be Dropbox Sign
  // outage OR an attacker rotated/deleted the template) so it
  // also pages.
  if (mismatches.length > 0 || fetchErrors.length > 0) {
    try {
      await notifyTeam({
        subject: `Dropbox Sign template ${
          mismatches.length > 0 ? "TAMPER ALERT" : "fetch error"
        } (${mismatches.length} mismatch / ${fetchErrors.length} error)`,
        html: emailLayout(
          "Template hash check anomaly",
          `<p>The daily template-hash-check cron found discrepancies between
          the on-vendor template state and the pinned hashes in
          <code>template-hashes.json</code>.</p>
          ${
            mismatches.length > 0
              ? `<h3>Mismatches (POSSIBLE TAMPERING — investigate immediately)</h3>
                 <ul>${mismatches
                   .map(
                     (m) =>
                       m.kind === "mismatch"
                         ? `<li><strong>${escapeHtml(m.label)}</strong>
                            (id <code>${escapeHtml(m.templateId)}</code>):
                            expected <code>${escapeHtml(m.expected.slice(0, 16))}…</code>,
                            actual <code>${escapeHtml(m.actual.slice(0, 16))}…</code></li>`
                         : "",
                   )
                   .join("")}</ul>`
              : ""
          }
          ${
            fetchErrors.length > 0
              ? `<h3>Fetch errors (vendor outage OR template deleted/rotated)</h3>
                 <ul>${fetchErrors
                   .map(
                     (f) =>
                       f.kind === "fetch_error"
                         ? `<li><strong>${escapeHtml(f.label)}</strong>
                            (id <code>${escapeHtml(f.templateId)}</code>):
                            ${escapeHtml(f.error)}</li>`
                         : "",
                   )
                   .join("")}</ul>`
              : ""
          }`,
        ),
      });
    } catch (err) {
      console.error("[template-hash-check] notify failed", err);
    }
  }

  return NextResponse.json({
    ok: mismatches.length === 0 && fetchErrors.length === 0,
    matched: matches.length,
    mismatched: mismatches.length,
    fetch_errors: fetchErrors.length,
    summary: results.map((r) => ({
      template_id: r.templateId,
      label: r.label,
      result: r.kind,
    })),
  });
}
