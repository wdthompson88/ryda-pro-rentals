// GET /api/health
//
// Returns "ok" + a quick connectivity check on the three external
// dependencies we need to operate: Supabase (Postgres + auth),
// Stripe (account ping), Resend (domain verification — checked
// only when env present; we don't actually send mail).
//
// Used by uptime monitors (Better Stack / Pingdom) to detect when
// any one of these starts failing before customer impact lands.
// Cheap (~3 outbound calls); rate-limit not applied — uptime
// pollers expect 1/min frequency.
//
// Responds with HTTP 200 and a JSON body that includes per-dep
// {ok, ms} so the dashboard can show which dependency is
// degraded. We never return >200 here even on partial degradation
// because the SITE itself is up; degraded deps are signaled
// inside the JSON.

import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Probe = { ok: boolean; ms: number; detail?: string };

async function probe(name: string, fn: () => Promise<unknown>): Promise<Probe> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    const detail =
      err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100);
    return { ok: false, ms: Date.now() - start, detail };
  }
}

export async function GET(_req: NextRequest) {
  const checks: Record<string, Probe | { ok: boolean; detail: string }> = {};

  // Supabase — cheap query against a known table.
  const admin = supabaseAdmin();
  if (admin) {
    checks.supabase = await probe("supabase", async () => {
      const { error } = await admin
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (error) throw error;
    });
  } else {
    checks.supabase = {
      ok: false,
      detail: "supabaseAdmin not configured",
    };
  }

  // Stripe — account.retrieve() pings the API with the configured
  // secret key. Returns 200 + acct id when key is valid.
  // Capture the narrowed reference outside the closure so TS keeps
  // it non-null inside the probe callback.
  const s = stripe;
  if (s) {
    checks.stripe = await probe("stripe", async () => {
      // balance.retrieve() doesn't take an account id and works for
      // both standalone keys and Connect platform keys, where
      // accounts.retrieve() requires the platform-vs-connected
      // account id distinction.
      await s.balance.retrieve();
    });
  } else {
    checks.stripe = { ok: false, detail: "stripe not configured" };
  }

  // Resend — env-only check (we don't fire a probe email; that'd
  // count against the deliverability quota). The presence of the
  // env vars means Resend WILL be used; absence means notifyTeam
  // is no-op'd elsewhere.
  const resendConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RYDA_NOTIFY_FROM,
  );
  checks.resend = {
    ok: resendConfigured,
    detail: resendConfigured ? "env present" : "RESEND_API_KEY or RYDA_NOTIFY_FROM unset",
  };

  // Aggregate state: all three must be ok for a green response.
  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allOk,
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      env: process.env.VERCEL_ENV ?? "development",
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
