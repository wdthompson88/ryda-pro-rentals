// Grant app_metadata.role='admin' to a Supabase user by email.
// Creates the user if they don't exist yet, and emits a one-time
// magic-link sign-in URL so the operator can land authenticated.
//
// Usage:
//   npx tsx scripts/grant-admin.ts <email> [redirect_url]
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the
// environment (auto-loaded from .env.local at project root).
//
// app_metadata is service-role-only writable — users cannot grant
// themselves admin via the browser-side supabase client. See
// src/lib/admin-auth.ts for the matching gate.

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

// Minimal dotenv-style loader so the script Just Works from project root.
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}

const email = process.argv[2];
const redirectTo = process.argv[3];
if (!email) {
  console.error("usage: tsx scripts/grant-admin.ts <email> [redirect_url]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
  );
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function findByEmail(needle: string) {
  // listUsers paginates; iterate until we find a match or run out.
  // For an early-stage project this is fine; if the user table grows
  // large, swap to a direct SQL query.
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === needle.toLowerCase(),
    );
    if (hit) return hit;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const existing = await findByEmail(email);
  if (existing) {
    const merged = { ...(existing.app_metadata ?? {}), role: "admin" };
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      app_metadata: merged,
    });
    if (error) throw error;
    console.log(`OK  Updated existing user ${existing.id}`);
    console.log(`    email: ${existing.email}`);
    console.log(`    app_metadata.role = "admin"`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (error) throw error;
  console.log(`OK  Created new user ${data.user?.id}`);
  console.log(`    email: ${email}`);
  console.log(`    app_metadata.role = "admin"`);

  const linkOpts: { type: "magiclink"; email: string; options?: { redirectTo: string } } = {
    type: "magiclink",
    email,
  };
  if (redirectTo) linkOpts.options = { redirectTo };
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink(
    linkOpts,
  );
  if (linkErr || !link) {
    console.warn(`(could not generate magic link: ${linkErr?.message ?? "unknown"})`);
    console.warn(
      `User can sign in at /signin with "Email me a sign-in link" instead.`,
    );
    return;
  }
  console.log("");
  console.log("Magic sign-in link (one-time, ~1hr expiry):");
  console.log(link.properties.action_link);
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("ERROR:", msg);
  process.exit(1);
});
