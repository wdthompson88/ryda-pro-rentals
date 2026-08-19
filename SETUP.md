# RYDA Rentals — Production Setup Runbook

End-to-end checklist for a fresh `ryda-pro-rentals` clone, from cold install to
production-ready. Order matters. Each section ends with a verification step so you know it
landed before moving on.

> This repo is the rentals product only. It carries the git history of the original
> `ryda-web` repo, but the co-ownership product — share purchases, LLC formation,
> e-signature documents, the boats tree — has been removed. If a step below seems to be
> missing something you remember from that runbook, that is why.

---

## 0. Prerequisites

- **Node 24.** `.npmrc` sets `engine-strict=true`, so `npm install` on any other major
  fails with `EBADENGINE` rather than quietly rewriting the lockfile. `nvm use` reads
  `.nvmrc`.
- Accounts on:
  - **Vercel** — hosting (`vercel whoami` should work)
  - **Supabase** — database + auth
  - **Stripe** — payments (**Connect** is required) and Identity for KYC
  - **Resend** — transactional email

```bash
node -v          # must be v24.x
npm install
```

---

## 1. Run database migrations (Supabase)

The chain is **46 files, `0001` through `0047`, with one gap at `0026`**. The gap is
inherited and harmless — `scripts/__tests__/migration-numbering.test.ts` tolerates gaps and
fails only on duplicate ordinals.

Roughly half of these migrations create **co-ownership tables that no application code
reads any more** (`share_purchases`, `share_holdings`, `llc_entities`, `llc_votes`,
`dispute_cases`, `boats`, …). They are kept so the chain stays intact and applied history
is never rewritten. Against a fresh project they will be created and sit empty. That is
expected, not a misconfiguration.

**Recommended: Supabase CLI** (handles ordering, applies idempotently)

```bash
brew install supabase/tap/supabase   # if not already installed
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push                     # applies every migration in supabase/migrations/
```

**Alternative: psql loop**

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f" || break
done
```

**Verification** — in the SQL Editor:

```sql
select table_name from information_schema.tables
where table_schema='public' order by table_name;
```

The tables the rental app actually uses:

| Table | Migration | What it holds |
|---|---|---|
| `rental_inquiries` | `0039`, `0045` | Inbound leads. Status `new → sent → booked / lost` |
| `rental_profiles` | `0040` | Renter profile linked to `auth.users` |
| `partners` | `0041` | Operators, incl. `commission_rate` and Connect account id |
| `rental_payments` | `0041` | The Connect charge ledger, one row per payment link |
| `partner_accounts` | `0042` | Operator ↔ user linkage |
| `rental_listings` | `0044` | Per-operator car inventory (the `/rent/[symbol]` key) |
| `rental_availability` | `0046` | Blackout / availability windows |
| `rental_bookings` | `0047` | Booking requests and their quote snapshot |
| `kyc_verifications` | `0011`, `0029` | Stripe Identity results (built, not yet in the rental flow) |
| `content_queue` | `0037` | Marketing generation queue |
| `audit_log`, `stripe_events` | `0020` etc. | Admin audit trail, webhook dedup |

---

## 2. Wire env vars

`.env.local.example` is the authoritative list — it documents every variable the app reads
and what degrades when it is unset. Copy it and fill in real values:

```bash
cp .env.local.example .env.local
```

For Vercel, `vercel env add <NAME>` prompts for the value and the environments (you usually
want all three).

### 2.1 Supabase

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY     # Project Settings → API → service_role
```

The service-role key bypasses RLS and is server-only. Never prefix it `NEXT_PUBLIC_`.

### 2.2 Stripe

```bash
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Webhook signing secrets come after step 3.

### 2.3 Resend

```bash
vercel env add RESEND_API_KEY
vercel env add RYDA_NOTIFY_FROM     # verified sender on a domain you own
vercel env add RYDA_NOTIFY_TO       # team alias that receives lead notifications
```

Unset, `notifyTeam()` logs and no-ops — forms still succeed, they just don't email.

### 2.4 Verify

```bash
vercel env ls production
```

Everything should list as `Encrypted`.

---

## 3. Configure Stripe

### 3.1 Enable Connect

The rental rail is **direct charges on operators' Express accounts**. Without Connect there
is no payment flow at all.

- https://dashboard.stripe.com/connect → enable Connect
- Platform profile → choose **Express** accounts
- Set your platform name, support email and branding — operators see these during onboarding

### 3.2 Connect webhook

- https://dashboard.stripe.com/webhooks → Add endpoint
- URL: `https://YOUR-DOMAIN.com/api/stripe/connect-webhook`
- **Tick "Listen to events on connected accounts."** This is not cosmetic. Rental checkouts
  are direct charges on the operators' accounts, so their events only ever arrive on a
  connected-account endpoint. A platform-account endpoint will never fire.
- Events:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.expired`
  - `checkout.session.async_payment_failed`
- Reveal the signing secret, then:
  ```bash
  vercel env add STRIPE_CONNECT_WEBHOOK_SECRET
  ```

There is deliberately **no fallback** for this secret in code — a fallback would turn a
missing env var into a silent invalid-signature loop instead of a loud misconfiguration.

### 3.3 Identity (KYC) webhook

Stripe Identity is wired end to end (`/account/verification`, `/api/kyc/*`, the onboarding
step) but is **not yet part of the rental flow**. It is kept for renter verification later.
Set it up now or skip it; nothing in the rental funnel blocks on it.

- Add a second, ordinary (platform-account) endpoint
- URL: `https://YOUR-DOMAIN.com/api/kyc/webhook`
- Events:
  - `identity.verification_session.verified`
  - `identity.verification_session.processing`
  - `identity.verification_session.requires_input`
  - `identity.verification_session.canceled`
- ```bash
  vercel env add STRIPE_KYC_WEBHOOK_SECRET
  ```

Stripe assigns one signing secret per endpoint. Reusing the Connect secret here will 400
every event.

To activate Identity itself: https://dashboard.stripe.com/identity → Activate, and set the
redirect-back domain to your production origin. No further env change needed. Confirm
current per-verification pricing before high-volume use.

### 3.4 Local webhook development

```bash
stripe listen --forward-to localhost:3000/api/stripe/connect-webhook
```

Put the printed `whsec_*` into `STRIPE_CONNECT_WEBHOOK_SECRET` in `.env.local`.

### 3.5 Verify

Stripe dashboard → the endpoint → "Send test webhook" → `checkout.session.completed`. A 200
in the Vercel function logs means the signature verified.

---

## 4. Grant yourself admin

Admin is `app_metadata.role === 'admin'`, which is service-role-only writable — a user
cannot self-promote from the browser.

```bash
npx tsx scripts/grant-admin.ts you@example.com
```

It creates the user if needed and prints a one-time magic-link sign-in URL. Verify by
loading `/admin` — you should see the rental funnel overview rather than the
"no permission" empty state.

---

## 5. Onboard your first operator

1. Sign in as admin → `/admin/partners` → create the operator (name, contact,
   `commission_rate` — defaults to 15%).
2. Click to mint a **Stripe Express onboarding link**
   (`POST /api/admin/partners/[id]/onboarding-link`). The first call creates the connected
   account, idempotency-keyed on the partner id; later calls reuse the stored `acct_…`.
3. Send the operator the link. Account links are single-use and expire in minutes — minting
   a fresh one *is* the resend flow.
4. Once they finish, `GET /api/admin/partners` stamps `stripe_onboarded_at` when
   `charges_enabled` flips true. The roster shows onboarded state.

An operator who has not completed onboarding cannot be paid — the payment-link route refuses
to mint against an account that can't accept charges.

---

## 6. Redeploy and smoke-test

```bash
npm run verify     # typecheck + test + build
vercel --prod
```

Then walk [SMOKE.md](SMOKE.md).

---

## 7. Post-launch hardening (later)

- **Driving-record / license check** vendor. Stripe Identity verifies ID + selfie but does
  not check driving history; an operator's insurer will want it.
- **Renter KYC in the funnel.** The Identity stack is already built — wiring it into the
  booking flow is a product decision, not a build.
- **Deposit re-authorization sweep.** `0047` documents this: a card authorization lasts
  roughly seven days, so a multi-week rental's deposit hold expires mid-trip.
  `deposit_auth_expires_at` is the column a sweep would drive off.
- **Rate limiting at volume.** `UPSTASH_REDIS_REST_*` switches the limiter from in-memory to
  shared; without it each serverless instance counts separately.

---

## Operational runbook

### A payment link expired before the customer paid

`rental_payments.status` flips `pending → expired` on
`checkout.session.expired`. Mint a new link from `/admin/inquiries` — the expired row stays
for audit.

### A payment landed on an inquiry that was already closed

The Connect webhook emails a team alert instead of a booking confirmation. Money on a dead
lead is an ops incident, not a booking — reconcile manually and refund from the Stripe
dashboard on the connected account.

### An operator's charges stopped working

Check `charges_enabled` on their connected account in the Stripe dashboard. Express accounts
get restricted when Stripe's own verification requirements go stale. Re-mint an onboarding
link to send them back through.

### Webhook events look duplicated

They are deduplicated by `event.id` in `stripe_events`, scoped per endpoint. A replay from
the Stripe dashboard is safe.
