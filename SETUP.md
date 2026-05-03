# RYDA — Production Setup Runbook

End-to-end checklist for getting the site from "marketing demo" to
"actually transacts." Order matters. Each section ends with a
verification step so you know it landed before moving on.

---

## 0. Prerequisites

You need accounts on:
- **Vercel** (already linked locally — `vercel whoami` works)
- **Supabase** — https://supabase.com (database + auth)
- **Stripe** — https://dashboard.stripe.com (payments + Identity for KYC)
- **Resend** — https://resend.com (transactional email — already configured)
- **Dropbox Sign** — https://app.hellosign.com (e-signature, optional)

---

## 1. Run database migrations (Supabase)

Seven migrations live in `supabase/migrations/`. Run them in order.

**Easiest: paste each into the Supabase SQL Editor**

1. Open https://supabase.com/dashboard → your project → SQL Editor → New query.
2. For each file in this exact order, paste contents and click Run:
   - `0007_share_purchases.sql`
   - `0008_share_holdings.sql`
   - `0009_bookings.sql`
   - `0010_kyc_verifications.sql`
   - `0011_llc_amendments.sql`
   - `0012_document_signatures.sql`
   - `0013_purchase_fulfillment_idempotency.sql`
3. Verify: SQL Editor → run
   ```sql
   select table_name from information_schema.tables
   where table_schema='public' order by table_name;
   ```
   You should see: `bookings`, `contact_messages`, `document_signatures`,
   `help_escalations`, `investor_inquiries`, `kyc_verifications`,
   `llc_amendments`, `share_holdings`, `share_purchases`, `waitlist`.

**Alternative: psql one-liner.** If you have psql installed and a
direct connection string, you can run them all at once:

```bash
for f in supabase/migrations/00{07,08,09,10,11,12,13}_*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

---

## 2. Wire env vars in Vercel

The site needs these to actually transact. Get each, then run the
commands below. Each `vercel env add` will prompt you for the value
and which environments to set it in (you typically want all three:
Production, Preview, Development).

### 2.1 Supabase service-role key

- Supabase dashboard → Project Settings → API → `service_role` `secret`.
  This is the LONG key (`eyJhbGciOiJIUzI1NiIs...`), not the publishable one.
- Run:
  ```bash
  vercel env add SUPABASE_SERVICE_ROLE_KEY
  ```

### 2.2 Stripe keys

- https://dashboard.stripe.com/apikeys → Standard keys (test mode is fine to start)
- Run:
  ```bash
  vercel env add STRIPE_SECRET_KEY
  vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ```

### 2.3 Stripe webhook signing secret

After step 3 below (creating webhook endpoints), copy the signing
secret from the Stripe dashboard, then:

```bash
vercel env add STRIPE_WEBHOOK_SECRET
```

### 2.4 Dropbox Sign (optional — e-signature)

If you've created Dropbox Sign API credentials + templates:

```bash
vercel env add DROPBOX_SIGN_API_KEY
vercel env add DROPBOX_SIGN_CLIENT_ID
vercel env add DROPBOX_SIGN_OA_TEMPLATE_ID
vercel env add DROPBOX_SIGN_MSA_TEMPLATE_ID
vercel env add DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID
```

Without these, the DocumentsStep keeps the typed-name signature
fallback and the routes return 503.

### 2.5 Verify

```bash
vercel env ls production
```

You should see all the new vars listed as `Encrypted`.

---

## 3. Configure Stripe webhooks

Two webhook endpoints — both POST to your deployed origin.

### 3.1 Share-purchase webhook (Stripe Checkout)

- https://dashboard.stripe.com/webhooks → Add endpoint
- Endpoint URL: `https://YOUR-DOMAIN.com/api/share-purchase/webhook`
- Events to send:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`
- Save → click into the endpoint → Reveal "Signing secret" → copy it.
- That goes into `STRIPE_WEBHOOK_SECRET` (step 2.3 above).

### 3.2 KYC webhook (Stripe Identity)

You have two valid layouts. Pick one:

**Option A — Two Stripe endpoints (recommended).** Each endpoint gets
its own signing secret; reusing the share-purchase secret on the KYC
endpoint will fail signature verification on every event.

- Same dashboard → Add another endpoint
- Endpoint URL: `https://YOUR-DOMAIN.com/api/kyc/webhook`
- Events:
  - `identity.verification_session.verified`
  - `identity.verification_session.processing`
  - `identity.verification_session.requires_input`
  - `identity.verification_session.canceled`
- Reveal that endpoint's signing secret and set:
  ```bash
  vercel env add STRIPE_KYC_WEBHOOK_SECRET
  ```
  The KYC route reads `STRIPE_KYC_WEBHOOK_SECRET` first, with a
  fallback to `STRIPE_WEBHOOK_SECRET` (so Option B below stays
  working without code changes).

**Option B — One Stripe endpoint with all event groups.** Point a
single endpoint at any one of the routes (typically share-purchase),
subscribe it to all six event types above plus the three checkout
events, and you only need `STRIPE_WEBHOOK_SECRET`. The trade-off is
that Identity events get POSTed to `/api/share-purchase/webhook`,
which currently ignores them. To use Option B you'd need to add a
single dispatcher route that fans events out by `event.type`. Most
teams prefer Option A.

### 3.3 Verify

In the Stripe dashboard endpoint detail → "Send test webhook" →
pick `checkout.session.completed` → Send. Check your Vercel
function logs for the matching POST. Status 200 = signature
verified.

---

## 4. Activate Stripe Identity (KYC)

Stripe Identity is included in your Stripe account but ships
disabled.

- https://dashboard.stripe.com/identity → click "Activate"
- Set the redirect-back domain to your production origin.
- Pricing: ~$1.50 per verification at the time of writing — confirm
  current rate before high-volume use.

No env-var change needed; `stripe.identity.verificationSessions.create`
works as soon as Identity is active.

---

## 5. Configure Dropbox Sign (optional — for real e-signatures)

Skip this if you're OK with the typed-name signature in the
DocumentsStep for now. The system keeps that path as a fallback.

### 5.1 API key + Client ID

- https://app.hellosign.com → Settings → API → API Keys → create one
- Settings → API → Embedded Signing → create a Client ID. Whitelist:
  - `https://YOUR-DOMAIN.com`
  - `https://*.vercel.app` (for preview deploys)

### 5.2 Templates

Create three templates from your finalized PDF documents:
- Operating Agreement
- Management Services Agreement
- Subscription Agreement

Each template MUST define merge fields with these exact names so the
API route can populate them:
- `member_name`
- `member_email`
- `asset_label`
- `llc_name`
- `shares`
- `buy_in`

Copy each template's ID from the URL into Vercel as
`DROPBOX_SIGN_OA_TEMPLATE_ID`, `DROPBOX_SIGN_MSA_TEMPLATE_ID`,
`DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID`.

### 5.3 Webhook

- Settings → API → Webhooks → set URL to
  `https://YOUR-DOMAIN.com/api/documents/webhook`
- Dropbox Sign signs payloads with HMAC-SHA256 against your API
  key — the route verifies automatically. No additional secret env
  var needed.

---

## 6. Redeploy

After env vars and webhooks land:

```bash
vercel --prod
```

Smoke-test in production:
1. Sign in at `/signin` (Supabase magic-link email arrives → click).
2. Go to `/markets/F296/buy?shares=2` → walk through the flow.
3. At the Funding step, pick **Card** → Stripe Checkout opens.
4. Use Stripe test card `4242 4242 4242 4242` (any future date, any CVC).
5. Land on `/share-purchase/<id>` and watch the stage flip from
   "Pending payment" to "Paid · LLC amendment in flight" within
   seconds (webhook fires).
6. Check your inbox for the welcome email with the LLC amendment PDF
   attached.

---

## 7. Post-launch hardening (later)

These aren't required to flip the switch but are worth scheduling:

- **Stripe Connect** if you want per-LLC escrow accounts (currently
  funds land in your Stripe balance and you transfer to the LLC bank
  account out-of-band).
- **Driving-record check** vendor (Checkr, ClearMechanic, etc.) —
  Stripe Identity verifies ID + selfie but doesn't check driving
  history. The LLC's insurance carrier will require this anyway.
- **Marine operator's license check** for boat side (USCG license
  validation).
- **Audit log** for `share_holdings` mutations — useful when transfers
  ship.
- **Stripe webhook deduplication** — current code is idempotent on
  `checkout.session.completed` (checks status before re-applying)
  but doesn't dedupe by event_id. Add an `event_log` table if you
  see duplicate-fire issues at volume.

---

## Operational runbook

### A purchase failed and the buyer wants to retry

Find the `share_purchases` row by id (the `/share-purchase/[id]` URL
is the row id). If status = 'failed' or 'canceled', the buyer can
restart the buy flow; a new purchase row + Checkout session will be
created. The old row stays for audit.

### A booking conflict needs to be resolved

`/api/bookings` returns 409 with the conflicting row id when dates
overlap. The team can mark the older booking `canceled` via the
Supabase dashboard (or build an admin tool later) to free the slot.

### Resending the LLC amendment PDF

The `/api/share-purchase/webhook` flow auto-emails it on payment
success. To resend manually:
1. Find the `share_purchases.id`
2. Re-trigger the webhook from Stripe dashboard (Events → re-deliver),
   or
3. (Future) `POST /api/share-purchase/[id]/resend-amendment` — not
   built yet.
