// scripts/check-dropbox-sign.ts — verify Dropbox Sign production setup.
//
// Reads .env.local (or set ENV_FILE=… to point at a different file
// like .env.production.local pulled via `vercel env pull`) and runs
// through the configuration checklist that docs/DROPBOX_SIGN_SETUP.md
// lays out:
//
//   1. All required env vars present (SUBSCRIPTION template optional)?
//   2. API key authenticates against accountGet (proves the key is
//      live; does NOT prove the Client ID is embedded-enabled or has
//      the right domain whitelist — those only surface at iframe-mount
//      time, see runbook §3 for the manual smoke-test).
//   3. Each configured template ID exists in the account?
//   4. Each template has a signer role named "Member"?
//   5. Each template has all six required merge fields by exact name
//      (checked across template.documents[].customFields — the v1.10.0
//      top-level customFields is deprecated).
//
// Prints PASS/FAIL per check + an overall exit code (0 if all pass,
// 1 if any fail). Safe to run as a CI smoke check post-deploy.
//
// Usage:
//   bun run scripts/check-dropbox-sign.ts
//   tsx scripts/check-dropbox-sign.ts
//
// Reads from .env.local in repo root by default. To verify production
// env vars from your laptop:
//   vercel env pull .env.production.local
//   ENV_FILE=.env.production.local tsx scripts/check-dropbox-sign.ts

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as DropboxSign from "@dropbox/sign";

// ── Env loading (mirrors scripts/marketing/env-loader.ts) ──────────

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnv(): void {
  const envFile = process.env.ENV_FILE ?? ".env.local";
  const envPath = path.resolve(process.cwd(), envFile);
  if (!existsSync(envPath)) {
    console.warn(`⚠  ${envFile} not found; relying on shell env only.`);
    return;
  }
  const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

// ── Checks ─────────────────────────────────────────────────────────

const REQUIRED_MERGE_FIELDS = [
  "member_name",
  "member_email",
  "asset_label",
  "llc_name",
  "shares",
  "buy_in",
] as const;

type CheckResult = { name: string; pass: boolean; detail?: string };

async function checkEnvVars(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? "";
  const clientId = process.env.DROPBOX_SIGN_CLIENT_ID ?? "";
  results.push({
    name: "DROPBOX_SIGN_API_KEY set",
    pass: apiKey.length > 0 && apiKey !== "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    detail: apiKey ? `${apiKey.length} chars` : "missing or placeholder",
  });
  results.push({
    name: "DROPBOX_SIGN_CLIENT_ID set",
    pass: clientId.length > 0 && clientId !== "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    detail: clientId ? `${clientId.length} chars` : "missing or placeholder",
  });
  // OA + MSA are required. SUBSCRIPTION is optional per the runbook
  // (some accounts roll subscription terms into the OA). Mark its
  // absence as a pass with a clarifying detail rather than failing.
  for (const tpl of [
    "DROPBOX_SIGN_OA_TEMPLATE_ID",
    "DROPBOX_SIGN_MSA_TEMPLATE_ID",
  ] as const) {
    const v = process.env[tpl] ?? "";
    results.push({
      name: `${tpl} set`,
      pass: v.length > 0,
      detail: v ? `${v.length} chars` : "missing",
    });
  }
  const subVal = process.env.DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID ?? "";
  results.push({
    name: "DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID set (optional)",
    pass: true,
    detail: subVal ? `${subVal.length} chars` : "unset (will skip template check below)",
  });
  return results;
}

async function checkApiKey(): Promise<CheckResult> {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? "";
  if (!apiKey) {
    return { name: "API key authenticates", pass: false, detail: "skipped (no key)" };
  }
  try {
    const accountApi = new DropboxSign.AccountApi();
    accountApi.username = apiKey;
    const result = await accountApi.accountGet();
    const email = result.body.account?.emailAddress ?? "(unknown)";
    return {
      name: "API key authenticates",
      pass: true,
      detail: `account: ${email}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      name: "API key authenticates",
      pass: false,
      detail: msg,
    };
  }
}

async function checkTemplate(
  envVar: string,
  expectedRole: string,
  optional = false,
): Promise<CheckResult[]> {
  const templateId = process.env[envVar] ?? "";
  const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? "";
  if (!templateId) {
    // Optional templates that are unset count as a pass (the runbook
    // explicitly allows skipping the SUBSCRIPTION template).
    return [
      {
        name: `${envVar} → template exists`,
        pass: optional,
        detail: optional ? "skipped (optional, env var unset)" : "skipped (env var unset)",
      },
    ];
  }
  if (!apiKey) {
    return [
      { name: `${envVar} → template exists`, pass: false, detail: "skipped (no API key)" },
    ];
  }
  try {
    const tplApi = new DropboxSign.TemplateApi();
    tplApi.username = apiKey;
    const result = await tplApi.templateGet(templateId);
    const tpl = result.body.template;
    if (!tpl) {
      return [
        { name: `${envVar} → template exists`, pass: false, detail: "API returned empty body" },
      ];
    }

    const checks: CheckResult[] = [];
    checks.push({
      name: `${envVar} → template exists`,
      pass: true,
      detail: `title: ${tpl.title ?? "(no title)"}`,
    });

    // Signer role check.
    const signerRoles = (tpl.signerRoles ?? []).map((r) => r.name);
    checks.push({
      name: `${envVar} → has signer role "${expectedRole}"`,
      pass: signerRoles.includes(expectedRole),
      detail: `roles found: [${signerRoles.join(", ")}]`,
    });

    // Merge field check. In SDK v1.10.0 the per-document customFields
    // array (`tpl.documents[].customFields`) is the canonical location;
    // the top-level `tpl.customFields` is deprecated. Flatten across
    // all documents and fall back to the top-level array if the
    // documents array is empty (defensive — keeps behavior on older
    // template responses).
    const docsFields = (tpl.documents ?? []).flatMap(
      (d) => d.customFields ?? [],
    );
    type FieldNameLike = { name?: unknown };
    const fallbackFields = (tpl as { customFields?: FieldNameLike[] })
      .customFields;
    const fieldsForCheck = docsFields.length > 0 ? docsFields : fallbackFields ?? [];
    const customFieldNames = fieldsForCheck
      .map((f) => (f as FieldNameLike).name)
      .filter((n): n is string => typeof n === "string");
    const missing = REQUIRED_MERGE_FIELDS.filter(
      (f) => !customFieldNames.includes(f),
    );
    checks.push({
      name: `${envVar} → has all required merge fields`,
      pass: missing.length === 0,
      detail:
        missing.length === 0
          ? `all 6 present: [${customFieldNames.join(", ")}]`
          : `MISSING: [${missing.join(", ")}] (found: [${customFieldNames.join(", ")}])`,
    });

    return checks;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return [
      {
        name: `${envVar} → template exists`,
        pass: false,
        detail: msg,
      },
    ];
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();
  console.log("Dropbox Sign configuration check");
  console.log("─".repeat(60));

  const results: CheckResult[] = [];
  results.push(...(await checkEnvVars()));
  results.push(await checkApiKey());
  results.push(...(await checkTemplate("DROPBOX_SIGN_OA_TEMPLATE_ID", "Member")));
  results.push(...(await checkTemplate("DROPBOX_SIGN_MSA_TEMPLATE_ID", "Member")));
  results.push(
    ...(await checkTemplate(
      "DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID",
      "Member",
      true,
    )),
  );

  let failed = 0;
  for (const r of results) {
    const icon = r.pass ? "✓" : "✗";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`${icon} ${r.name}${detail}`);
    if (!r.pass) failed++;
  }

  console.log("─".repeat(60));
  if (failed === 0) {
    console.log("All checks passed. Dropbox Sign is production-ready.");
    process.exit(0);
  } else {
    console.log(`${failed} check(s) failed. See docs/DROPBOX_SIGN_SETUP.md.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(2);
});
