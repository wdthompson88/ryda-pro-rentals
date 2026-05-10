# Dropbox Sign — Production Setup Runbook

**Audience:** Ryan (or whoever holds the RYDA Dropbox Sign account).
**Time:** ~45 min (mostly waiting for template approvals).
**Prerequisite:** finalized PDFs of the Operating Agreement, Management Services Agreement, and (optional) Subscription Agreement, ready to upload as templates.

---

## What this gets us

The buy flow has two surfaces today:

- **Marketing demo (current default):** member types their full legal name into a text box. We persist that as a "signature" but it's not a real e-sig — it's a UX placeholder so the flow walks end-to-end without keys.
- **Production e-sig (this runbook):** member opens an embedded Dropbox Sign iframe, signs the actual PDF, the webhook flips `document_signatures.status` to `signed`, and we store the signed PDF URL.

The API + webhook + DB schema are already wired (see "What's already in code" below). This runbook covers the parts you have to do in the Dropbox Sign dashboard + Vercel env vars. The DocumentsStep component still needs a small UI rewire to switch from typed-name to embedded iframe (see "Outstanding code work" at the bottom).

---

## Step 1 — Create the Dropbox Sign account

1. Sign up at https://app.hellosign.com/ (Dropbox Sign is the rebrand of HelloSign — the URLs and SDK still use `hellosign`).
2. Use a shared `signing@ryda.pro` alias if you have one — otherwise `ryan@…` is fine and we'll move it later.
3. Pick the **Standard** plan or higher. The Free tier doesn't include API access.
4. Verify the billing email and add a backup admin (Stefano).

---

## Step 2 — Create the API key

1. **Settings** → **API** (or directly: https://app.hellosign.com/home/myAccount#api).
2. Click **Create API Key**.
3. Name it `RYDA Production` (and create a second one named `RYDA Test` while you're there).
4. Copy the key — it looks like `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (64 hex chars).
5. **Do not commit this anywhere.** Paste it into the Vercel env-var section in Step 6 below.

---

## Step 3 — Create the Embedded Signing Client ID

Embedded signing is a separate API surface from the standard signature requests — it's what lets us mount the iframe inside our buy flow rather than redirecting to Dropbox Sign's hosted page.

1. **Apps** → **API** → **Embedded Signing** → **Create App**.
2. Name: `RYDA Buy Flow`.
3. **Domain whitelist** — add ALL of these:
   - `https://ryda.pro`
   - `https://www.ryda.pro`
   - `https://*.vercel.app` (for preview deployments)
   - `http://localhost:3000` (for local dev — required even if you mostly test in prod)
4. **Callback URL** — leave blank for now. The webhook URL goes in Step 5.
5. Save. Copy the **Client ID** — it's a 32-char hex string.

---

## Step 4 — Create the three templates

Each template needs to be uploaded as a PDF, with the signer role and merge fields configured **exactly as listed below**. The merge-field names matter: the API route at `src/app/api/documents/sign-request/route.ts` populates them by name, so a typo here means the field stays blank in the signed PDF.

### Template 1 — Operating Agreement

1. **Templates** → **Create Template**.
2. Upload your final OA PDF.
3. Title: `Operating Agreement v1`. Subject: `LLC Operating Agreement`. Message: `Please review and sign your Operating Agreement.`
4. Add **one signer role** named exactly: `Member`.
5. On the document, drop the following fields and assign them:
   | Field           | Type      | Assigned to | Required |
   |-----------------|-----------|-------------|----------|
   | Signature       | Signature | Member      | Yes      |
   | Date signed     | Date      | Member      | Yes      |
   | Initials        | Initials  | Member (every page) | Yes |
6. Add **merge fields** (these are pre-filled by us, NOT signer-editable). Each needs to match these names exactly:
   | Field name      | Type | Assigned to |
   |-----------------|------|-------------|
   | `member_name`   | Text | Sender (you, pre-filled) |
   | `member_email`  | Text | Sender |
   | `asset_label`   | Text | Sender |
   | `llc_name`      | Text | Sender |
   | `shares`        | Text | Sender |
   | `buy_in`        | Text | Sender |
7. Save. **Copy the Template ID** from the URL after save (`https://app.hellosign.com/home/manageTemplates/...id...`) — it's a 40-char hex string.

### Template 2 — Management Services Agreement

Same process. Title: `Management Services Agreement v1`. Same `Member` signer role. Same six merge fields (`member_name`, `member_email`, `asset_label`, `llc_name`, `shares`, `buy_in`). Copy its Template ID.

### Template 3 — Subscription Agreement (optional)

If we use a separate subscription doc, repeat. If the OA covers subscription terms inline, skip — leave `DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID` blank in env, the buy flow only requires OA + MSA.

---

## Step 5 — Configure the webhook

1. **Apps** → **API** → **Account Callback URL**.
2. Set it to: `https://ryda.pro/api/documents/webhook`
3. Save. Dropbox Sign will fire a `callback_test` event immediately to verify — our route returns the literal string `Hello API Event Received` per their protocol. If it fails, check the route is deployed and `DROPBOX_SIGN_API_KEY` is set in Vercel.

**Note:** there is no separate webhook signing secret. Dropbox Sign HMAC-signs payloads using the API key itself. The webhook route at `src/app/api/documents/webhook/route.ts` re-computes the HMAC and rejects mismatches. So setting `DROPBOX_SIGN_API_KEY` correctly in Vercel is what makes webhook verification work.

---

## Step 6 — Add env vars to Vercel

Production project → **Settings** → **Environment Variables**. Add **all five** to **Production** (also add to Preview if you want preview deploys to use the same templates):

| Name                                     | Value                       |
|------------------------------------------|-----------------------------|
| `DROPBOX_SIGN_API_KEY`                   | (the 64-hex from Step 2)    |
| `DROPBOX_SIGN_CLIENT_ID`                 | (the 32-hex from Step 3)    |
| `DROPBOX_SIGN_OA_TEMPLATE_ID`            | (Template ID from Step 4.1) |
| `DROPBOX_SIGN_MSA_TEMPLATE_ID`           | (Template ID from Step 4.2) |
| `DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID`  | (Template ID from Step 4.3, or leave unset if unused) |

After saving, **Redeploy** the latest production build so the new env vars are picked up. Vercel doesn't auto-redeploy on env-var changes.

---

## Step 7 — Verify

Once redeployed, run the verification script. Easiest path:

```bash
# verify against local .env.local
npm run check:dropbox-sign

# verify against production env vars (pull them first):
vercel env pull .env.production.local
ENV_FILE=.env.production.local npm run check:dropbox-sign
```

It will:
1. Read your `.env.local` (or whatever `ENV_FILE` points at).
2. Confirm all required env vars are present (`DROPBOX_SIGN_API_KEY`, `DROPBOX_SIGN_CLIENT_ID`, `DROPBOX_SIGN_OA_TEMPLATE_ID`, `DROPBOX_SIGN_MSA_TEMPLATE_ID`). Subscription template is optional and skipped if unset.
3. Authenticate against Dropbox Sign by calling `accountGet` (proves the API key is live and points at the right account email).
4. For each configured template ID, hit `templateGet` and confirm:
   - Template exists in this account
   - Has a signer role named `Member`
   - Has all six required merge fields by name (across `template.documents[].customFields`)
5. Print PASS/FAIL per check, exit 0 if all pass.

**What the script does NOT verify (manual smoke-test required):**
- That the Client ID is actually embedded-signing-enabled with the right domain whitelist — that only surfaces at iframe-mount time. After templates pass, do one real test purchase against the staging build (template`testMode` is automatically `true` in non-production builds; see `src/app/api/documents/sign-request/route.ts` line 142) and confirm the iframe loads.

If everything passes, the embedded signing API is live. The DocumentsStep UI still needs the rewire described below before members will see the iframe.

---

## What's already in code

These files are production-ready and don't need changes when you fill in env vars:

- `src/lib/dropbox-sign.ts` — API client wrapper, `isDropboxSignConfigured()` gate, lazy clients (so missing keys don't crash boot).
- `src/app/api/documents/sign-request/route.ts` — POST endpoint that creates an embedded signature request from a template and returns the embed URL. Handles auth, ownership check, idempotency for re-signed docs, merge-field population.
- `src/app/api/documents/webhook/route.ts` — Production-grade webhook handler with HMAC verification, replay defense, claim-then-mark-processed pattern, state-machine guards. Has been through 6+ rounds of codex security review.
- `src/lib/dropbox-sign-claims.ts` + tests — pure decision logic for the dedup table.
- `supabase/migrations/0012_document_signatures.sql` — table schema with RLS.
- `supabase/migrations/0024_dropbox_sign_events_dedup.sql` — webhook dedup table.
- `supabase/migrations/0027_dropbox_sign_events_processed_at.sql` — claim-then-mark column.

## Outstanding code work

`src/components/shared/buy-flow.tsx` → `DocumentsStep` currently renders a typed-name signature box, NOT the Dropbox Sign embedded iframe. Once templates are configured and verified, we need to:

1. Replace the `DocCard` "Mark as signed" buttons with a real call to `POST /api/documents/sign-request` per doc type.
2. Mount the returned `embedUrl` in an iframe (the Dropbox Sign embedded JS does the heavy lifting — see https://developers.hellosign.com/docs/embedded-signing/walkthrough).
3. Subscribe to the embedded JS's `signed` event to mark the local UI state as complete.
4. Poll or subscribe to `document_signatures.status` for the row to flip to `signed` (the webhook does this asynchronously after signing).
5. Only enable Continue when both OA + MSA rows are `signed`.

That's roughly a half-day of UX work and should ship as a separate PR alongside e2e tests against Dropbox Sign's sandbox mode. Until that ships, the typed-name fallback continues to work for the marketing demo path.

---

## Troubleshooting

**Webhook test fails on Step 5:**
- The route at `src/app/api/documents/webhook/route.ts` returns **503** if any of these aren't set in Vercel: `DROPBOX_SIGN_API_KEY`, `DROPBOX_SIGN_CLIENT_ID` (both gated by `isDropboxSignConfigured()`), or the Supabase service-role env (`SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`). All four must be present for the webhook to even attempt to process the test event.
- Confirm the production URL responds to GET (it should 405 — the route is POST-only) at `https://ryda.pro/api/documents/webhook`.
- Check Vercel function logs for `[docsign webhook]` entries — they'll tell you which check failed (HMAC mismatch, missing config, state-machine guard, etc.).

**Embed iframe shows "domain not whitelisted":**
- Re-check Step 3.3 — the exact `https://ryda.pro` and the wildcard `https://*.vercel.app` both need to be present.
- Note that `*.vercel.app` covers preview deploys but NOT custom preview domains (e.g. `staging.ryda.pro`). Add those explicitly if used.

**Merge fields show as `[member_name]` placeholder text in the signed PDF:**
- The merge field name in the template doesn't match the `customFields[].name` value the API sends. Check Step 4.6 spelling exactly — case-sensitive, no spaces.

**Webhook fires but `document_signatures.status` doesn't update:**
- The route logs every state-machine guard rejection with `[docsign webhook · ...]`. Check Vercel logs.
- Common cause: the row already has a terminal status (`signed`, `declined`, `canceled`) — by design, the route refuses to downgrade it.
