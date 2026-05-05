# RYDA · Firstbase LLC formation setup

This module ships with **mock-mode by default** — no `FIRSTBASE_API_KEY`
in env means every "Form LLC" click returns a fake providerId, the
status auto-advances to `completed` after 8 seconds, and the EIN comes
back as `99-XXXXXXX` (recognizable as fake). No money is spent. No
real LLC is created. Safe to demo, screenshot, and click around.

When you're ready to actually form a Florida LLC for a real car, follow
the steps below.

## Pre-flight

You'll need:

- A real car (or yacht) acquired by RYDA, with title in hand
- A budget — first formation is **~$524** (Firstbase $399 + Florida filing $125)
- 30-60 min for the Firstbase signup + Partner API access request

## 1. Sign up at Firstbase (5 min)

Go to https://www.firstbase.io and sign up with a business email.
Sign up flow asks for:

- Founder name + address (use ops@ryda.pro as the contact)
- Business name + intended state (Florida)
- Founding member info (you can skip the LLC-creation flow itself
  here — we'll trigger it via API once Partner access is granted)
- Payment method (only charged when the first formation is submitted)

## 2. Request Partner API access (1-3 days)

The Firstbase REST API is gated. Two paths:

- **Faster**: email `partnerships@firstbase.io` with subject
  "RYDA — Partner API access for SPV LLC automation". Mention you'll
  be forming Florida LLCs at ~10/year initially, growing to 30+ in
  year 2. They typically respond in 24-48 hours.
- **Slower**: their contact form at https://www.firstbase.io/partners

You'll get back a publishable key + secret key, plus access to a
sandbox environment.

## 3. Set environment variables

In **Vercel project settings → Environment Variables**, add:

| Variable | Production value | Preview/dev value |
|---|---|---|
| `FIRSTBASE_API_KEY` | live key (`fb_live_...`) | sandbox key (`fb_test_...`) |
| `FIRSTBASE_WEBHOOK_SECRET` | live webhook secret | sandbox webhook secret |
| `FIRSTBASE_MODE` | `live` | `sandbox` |

**CRITICAL**: only set `FIRSTBASE_MODE=live` after you've verified the
sandbox flow end-to-end. Live mode means every formation API call
spends real money. The mode flag is the kill-switch.

## 4. Register the webhook endpoint

In the Firstbase dashboard:

- URL: `https://ryda.pro/api/webhooks/firstbase`
- Events to subscribe: `formation.*`, `ein.issued`, `registered_agent.renewed`
- Signing secret: copy this into `FIRSTBASE_WEBHOOK_SECRET`

The handler (in `src/app/api/webhooks/firstbase/route.ts`) verifies
HMAC-SHA256 signatures + a 5-min timestamp window. Mismatches return
400; duplicates dedupe by `event_id`.

## 5. Apply the database migration

```sh
# From the repo root
psql $SUPABASE_DB_URL -f supabase/migrations/0022_llc_entities.sql
```

Or via Supabase Studio → SQL Editor → paste the contents of
`0022_llc_entities.sql`.

The migration adds two tables (`llc_entities`, `llc_formation_events`)
with RLS gated to admin role. No data migration needed — empty at
first.

## 6. Sandbox smoke test

With `FIRSTBASE_MODE=sandbox`:

1. Sign in at `/admin` as a user with `app_metadata.role = 'admin'`
2. Go to `/admin/llc` — should show the mode banner: **SANDBOX MODE**
3. Click "Form new LLC →"
4. Pick any vehicle, default everything else, submit
5. Land on `/admin/llc/[id]` — watch status flip from `submitted` →
   `filed` → `completed` (sandbox auto-advances faster than real
   state filings; production live-mode takes 1-7 business days)
6. Verify the webhook receiver captured events: in Supabase Studio,
   `select * from llc_formation_events` should show 1-3 rows
7. Verify the row updated: `select * from llc_entities where ...`
   should show `formation_status = 'completed'` + an EIN

## 7. Going live (FIRST REAL LLC)

**Cost**: $524 (Firstbase $399 + FL filing $125)

This is irreversible. Once you submit, Firstbase files with the
state of Florida and bills your card. There's no "undo."

1. Confirm `FIRSTBASE_MODE=live` is set in Vercel **production** only
   (preview/dev should stay on `sandbox`)
2. Confirm `FIRSTBASE_API_KEY` is the LIVE key, not sandbox
3. Confirm the webhook is registered for the live endpoint
4. Sign in at `/admin/llc/new`
5. **Verify the banner reads "LIVE MODE"** before clicking submit
6. Submit
7. Status flow: `submitted` → `filed` (within 1 hour) → `completed`
   (1-7 business days; FL Sunbiz processes filings asynchronously)
8. EIN takes 2-3 weeks to issue separately (IRS bottleneck, not
   Firstbase)

## 8. Post-formation (manual steps Firstbase doesn't cover)

- **Bank account**: Firstbase will prompt to open a Mercury account.
  Approve via their flow. NOT automated.
- **Title transfer**: take the new LLC's Certificate of Formation +
  EIN to a Florida tag-and-title agent. They re-issue the title in
  the LLC's name. ~$50-150, 1-2 weeks. NOT automated.
- **Insurance binding**: notify your high-value-auto carrier. They
  re-issue the policy with the LLC as the named insured. NOT automated.
- **Operating Agreement execution**: send via Dropbox Sign (already
  in your stack) to all founding members for signature.
- **Member register update**: the OA closing populates the
  `llc_entities` row with member references. Future flow.

## Provider migration path

When RYDA outgrows Firstbase (~50 LLCs/year), the adapter pattern at
`src/lib/llc-formation/adapter.ts` makes the swap trivial:

1. Implement `LLCFormationAdapter` in a new `src/lib/llc-formation/<provider>.ts`
2. Update `resolveAdapter()` to pick it based on a new env var
3. Existing `llc_entities` rows keep their `formation_provider` value;
   new formations use the new provider; webhook handlers route by
   provider. No data migration.

Candidates worth evaluating at scale:
- **Northwest Registered Agent**: ~50% cheaper at scale; gold-standard
  legal defensibility; has a B2B partner program (no public REST API,
  but they expose a bulk-filing portal + flat-rate annual contract)
- **Stripe Atlas**: tighter Stripe-native integration; but Delaware-only
  as of late 2025 — useful if you transition to a Delaware-master
  strategy for institutional credibility

## Troubleshooting

- **"Forbidden" on `/admin/llc`** → your Supabase user doesn't have
  `app_metadata.role = 'admin'`. Run in Supabase SQL editor:
  ```sql
  update auth.users set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'
  ) where email = 'YOUR_EMAIL';
  ```

- **Banner says "MOCK MODE" in production** → `FIRSTBASE_API_KEY` is
  unset in Vercel production env. Re-add it and redeploy.

- **Webhook signature mismatches** → the `FIRSTBASE_WEBHOOK_SECRET`
  in Vercel doesn't match the one Firstbase shows in the dashboard.
  Rotate the secret in Firstbase, copy the new value to Vercel,
  redeploy.

- **EIN not arriving** → IRS Form SS-4 processing is 2-3 weeks for
  online filers and longer for fax. Check `select * from llc_entities
  where ein is null` to see all pending EINs. Firstbase will fire a
  separate `ein.issued` webhook when the EIN lands.
