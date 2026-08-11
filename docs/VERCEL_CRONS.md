# Vercel cron strategy + restoration plan

## Current state: no crons

`vercel.json` declares no `crons` array at all. Read the next section
before adding one back — the key is not optional in the way it looks.

The rentals-first strip removed three of the four cron routes this repo
ever had, because all three served the retired co-ownership product:

| Path | Was | Why it went |
|---|---|---|
| `/api/cron/expire-transfers` | daily 3am | Expired share transfers after the 14-day window. `share_transfers` has no application code left. |
| `/api/cron/template-hash-check` | daily 4am | Tamper-detection on legal-doc template hashes, for the LLC document packet. |
| `/api/cron/reconcile-pending-purchases` | hourly (already unscheduled) | Reconciled pending `share_purchases` against Stripe. |

One cron route survives:

| Path | Schedule | Status |
|---|---|---|
| `/api/cron/social-publisher` | none | Deployed and reachable, not auto-triggered. See below. |

## The rule that breaks deploys

**Vercel fails a build when a `functions` glob matches no file.** That
makes `vercel.json` a hard build dependency on route file paths, and it
is invisible to `npm run build` — a local build passes and the deploy
fails. `functions` currently names three real files:

```
src/app/api/kyc/webhook/route.ts        maxDuration 15
src/app/api/cron/social-publisher/route.ts   maxDuration 60
src/app/api/admin/generate-video/route.ts    maxDuration 300
```

If you delete or move any of those routes, edit `vercel.json` in the
**same commit**. The only local command that validates these globs
against the filesystem is `npx vercel build`; run it before a first
push after any route-tree surgery.

## Why social-publisher has no schedule

Vercel Hobby caps cron frequency at once per day. The social publisher
wants every 15 minutes, which exceeded the cap and silently broke every
deploy from May 8 onward (`Hobby accounts are limited to daily cron
jobs`) until it was removed from the config. The handler is still
deployed and still reachable; it just waits for an external trigger.

**Restore the cadence when:** the first scheduled marketing post has a
publish-time set.

## Restoration options

### Option A — Cloudflare Workers Cron (free, recommended)

Cloudflare Workers free tier allows 5 cron triggers, 100K requests per
day, and sub-daily cadence. RYDA already uses Cloudflare for DNS and has
an API client at `src/lib/cloudflare.ts`, so this is a natural fit.

**Setup steps (~30-60 min):**

1. Generate a `CRON_SECRET` and add it to Vercel env vars
2. Modify the route handler to verify `Authorization: Bearer
   <CRON_SECRET>` instead of relying on Vercel's `x-vercel-cron` header
3. Create a Cloudflare Worker `crons-worker.ts`:

   ```ts
   export default {
     async scheduled(controller, env, ctx) {
       ctx.waitUntil(
         fetch(`${env.APP_URL}/api/cron/social-publisher`, {
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
   crons = ["*/15 * * * *"]   # social publisher every 15 min
   ```

5. Deploy via `wrangler deploy`

**Reliability:** Cloudflare Workers cron is more reliable than GitHub
Actions free-tier scheduled workflows (which GitHub explicitly documents
as "may be delayed or dropped" under load).

### Option B — Upgrade Vercel to Pro ($20/month)

Restores the original schedule in `vercel.json` with no code changes:

```json
"crons": [
  { "path": "/api/cron/social-publisher", "schedule": "*/15 * * * *" }
]
```

Pro also unlocks `maxDuration` up to 800s (vs 300s on Hobby — relevant
for the video generation route), multiple custom domains, 6,000 build
minutes/mo, and team-member access.

## Why we landed here

Commit `ba5589e` (May 8) "Pivot video + image gen to OpenAI API" added
the long-running video pipeline plus sub-daily marketing crons. Both
exceeded Hobby's limits. Deploys silently failed for ~36 hours before
the gap was caught.

Lesson: when adding anything that changes cron frequency or function
`maxDuration`, run a manual `vercel deploy --prod` immediately after to
confirm the build still passes. The GitHub→Vercel webhook does not
surface plan-tier violations to GitHub status checks.

## Related files

- `vercel.json` — `functions` durations; no `crons` key today
- `src/app/api/cron/social-publisher/route.ts` — the surviving handler,
  deployed and reachable, awaiting an external trigger
- `src/lib/cloudflare.ts` — existing Cloudflare API client (would pair
  naturally with a Workers-based scheduler)
