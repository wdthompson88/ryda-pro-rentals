# Vercel cron strategy + restoration plan

## Current state (Hobby tier)

`vercel.json` declares two cron jobs, both Hobby-compatible (daily):

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/expire-transfers` | `0 3 * * *` (daily 3am) | Mark share transfers expired after the 14-day window |
| `/api/cron/template-hash-check` | `0 4 * * *` (daily 4am) | Detect tampering on legal-doc template hashes |

## What's NOT auto-running (and why)

Two crons used to exist at sub-daily cadence:

| Path | Original schedule | Status |
|---|---|---|
| `/api/cron/reconcile-pending-purchases` | `0 * * * *` (hourly) | **Removed from vercel.json** |
| `/api/cron/social-publisher` | `*/15 * * * *` (every 15 min) | **Removed from vercel.json** |

The route handlers themselves are still deployed and reachable. They're
just not auto-triggered by Vercel anymore.

**Why removed:** Vercel Hobby tier caps cron frequency at once-per-day
per cron. Both routes exceeded that cap, which silently broke every
deploy from May 8 onward (the Vercel build step rejected the config
with `Hobby accounts are limited to daily cron jobs`).

**Why this is acceptable right now:** Pre-launch with zero real wires
and zero scheduled marketing posts, neither cron has work to do. The
day either condition changes, restore the cadence (see Restoration
options below).

## When to restore cadence

| Condition | Action required |
|---|---|
| First buyer wires money | Restore `/api/cron/reconcile-pending-purchases` to hourly **before** the wire is sent |
| First scheduled marketing post has a publish-time set | Restore `/api/cron/social-publisher` to ≤30-min cadence |

Both of these are likely to happen the same week as the first cohort
calls (per RYDA_STRATEGIC_AUDIT.md).

## Restoration options

### Option A — Cloudflare Workers Cron (free, recommended)

Cloudflare Workers free tier allows 5 cron triggers, 100K requests
per day, and sub-daily cadence. RYDA already uses Cloudflare for DNS
and has an API client at `src/lib/cloudflare.ts`, so this is a
natural fit.

**Setup steps (~30-60 min):**

1. Generate a `CRON_SECRET` and add it to Vercel env vars
2. Modify the two route handlers to verify
   `Authorization: Bearer <CRON_SECRET>` instead of relying on
   Vercel's `x-vercel-cron` header
3. Create a Cloudflare Worker `crons-worker.ts`:

   ```ts
   export default {
     async scheduled(controller, env, ctx) {
       const path =
         controller.cron === "*/15 * * * *"
           ? "/api/cron/social-publisher"
           : "/api/cron/reconcile-pending-purchases";
       ctx.waitUntil(
         fetch(`${env.APP_URL}${path}`, {
           method: "POST",
           headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
         }),
       );
     },
   };
   ```

4. `wrangler.toml` triggers:

   ```toml
   [triggers]
   crons = [
     "7 * * * *",       # reconciliation hourly, offset to avoid top-of-hour
     "*/15 * * * *",    # social publisher every 15 min
   ]
   ```

5. Deploy via `wrangler deploy`

**Reliability:** Cloudflare Workers cron is more reliable than GitHub
Actions free-tier scheduled workflows (which GitHub explicitly
documents as "may be delayed or dropped" under load).

### Option B — Upgrade Vercel to Pro ($20/month)

Restores the original schedules in `vercel.json` as-is, no code
changes needed beyond reverting the two cron entries.

```json
{
  "path": "/api/cron/reconcile-pending-purchases",
  "schedule": "0 * * * *"
},
{
  "path": "/api/cron/social-publisher",
  "schedule": "*/15 * * * *"
}
```

Pro plan also unlocks:
- `maxDuration` up to 800s (vs 300s on Hobby) — relevant for the
  video generation route
- Multiple custom domains (Hobby caps at 1)
- 6,000 build minutes/mo (vs 100 on Hobby)
- Team-member access (invite Dave, Stefano)

**Trigger to upgrade:** the day RYDA actually launches and starts
collecting real wires. $20/mo is rounding error against the share
buy-in, and Pro removes every plan-tier debugging headache in one
shot.

## Why we landed here

Commit `ba5589e` (May 8) "Pivot video + image gen to OpenAI API"
added the long-running video pipeline + the sub-daily marketing
crons. Both exceeded Hobby's limits. Deploys silently failed for
~36 hours before the gap was caught.

Lesson: when adding anything that changes cron frequency or
function `maxDuration`, run a manual `vercel deploy --prod` from
the parent directory immediately after to confirm the build still
passes. The GitHub→Vercel webhook does not surface plan-tier
violations to GitHub status checks.

## Related files

- `vercel.json` — current cron config (only Hobby-compatible
  entries)
- `src/app/api/cron/*/route.ts` — the route handlers, deployed and
  reachable, awaiting external trigger
- `src/lib/cloudflare.ts` — existing Cloudflare API client (would
  pair naturally with a Workers-based scheduler)
- `RYDA_STRATEGIC_AUDIT.md` — context on why "until Stefano's first
  cohort wires" is the right restore trigger
