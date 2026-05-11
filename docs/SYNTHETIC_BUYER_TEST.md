# Synthetic Buyer Test — Runbook

End-to-end verification that a prospect can complete the buy flow
and that all post-purchase member surfaces render correctly. Two
modes:

- **Automated (Playwright)**: walks the marketing-demo path of the
  buy flow without hitting Stripe, Supabase, or Dropbox Sign. Fast,
  deterministic, runs in CI. See `tests/synthetic-buyer.spec.ts`.
- **Manual (live test mode)**: walks the same flow with real Stripe
  test-mode keys + real Supabase + real Dropbox Sign templates (when
  configured). Catches integration-only failures that the automated
  test can't see. Documented below.

Run both before each launch milestone. Automated catches
component-level regressions; manual catches integration drift.

---

## Mode 1 — Automated

### Local

```bash
cd ryda-web
npm run test:e2e -- synthetic-buyer
```

Playwright auto-starts `npm run dev` if no server is running on
:3000 (see `playwright.config.ts`).

### Against staging or production

```bash
PLAYWRIGHT_BASE_URL=https://ryda.pro npm run test:e2e -- synthetic-buyer
```

Skips the local webServer; targets the live URL. Useful as a smoke
check after each Vercel deploy.

### What it covers

1. Portfolio listings render and link to the chosen vehicle (Ferrari 458)
2. Vehicle detail page renders title, acquisition badge, order panel
3. Buy flow Step 1 (Review) renders the shares stepper + vehicle summary + Continue
4. Buy flow Step 2 (Verify) renders the Stripe-Identity KYC entry point
   with the Continue button correctly disabled until KYC completes
5. `/messages` renders the sign-in CTA when signed out
6. `/votes` renders the sign-in CTA when signed out

### What it does NOT cover

- Buy flow Steps 3-5 (Documents, Fund, Confirm) — gated behind KYC
  completion which requires a real Stripe Identity flow. Covered
  by the manual walk-through below.
- Real Stripe checkout (no test card submitted)
- Real Supabase persistence (no `share_purchases` row written)
- Dropbox Sign embedded signing (templates not configured by default)
- Email confirmations (no SMTP triggered)
- Member-area authenticated paths (`/messages/<llcId>`, `/votes/<id>`)

The manual mode below covers all of these.

---

## Mode 2 — Manual (live test mode)

### Prerequisites

1. Test-mode Stripe keys configured in Vercel Production env:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_WEBHOOK_SECRET_BUY=whsec_test_...`
   - `STRIPE_WEBHOOK_SECRET_BOOKING=whsec_test_...`
2. Real Supabase project (production or a staging mirror)
3. Optional: Dropbox Sign templates configured per
   `docs/DROPBOX_SIGN_SETUP.md`
4. A test email you control (e.g. `synthetic+test@yourdomain.com`)
5. A Stripe test card — `4242 4242 4242 4242`, any future expiry,
   any 3-digit CVC, any 5-digit ZIP

### The walk-through

**1. Land on portfolio**
- Open `https://ryda.pro/portfolio` (or staging URL)
- Confirm 7 vehicle cards render with brand badges + share-availability pills
- Click into the Ferrari 458

**2. Vehicle detail**
- Title `Ferrari 458 Italia` shows
- Acquisition badge reads "Sourced" with the explainer sentence
- Order panel shows shares-available counter + "Buy a share" CTA
- Reads "Target market: Miami" (NOT "Stored in Miami") since the
  vehicle is sourced, not secured

**3. Cost sheet**
- Click "Download cost sheet ↓" on the vehicle detail page
- Confirm header reads "Target market: Miami" (not "Stored in")

**4. Buy flow → Step 1 (Review)**
- Click "Reserve N shares directly →" in the order panel (or
  "Buy a share" elsewhere on the detail page)
- URL becomes `/portfolio/f458/buy?shares=2` (the buy flow defaults
  to a 2-share floor — minimum buy-in, no need to increase)
- Step counter shows "Step 1 of 5"
- Total displays based on `lib/market-data.ts` (Ferrari 458:
  $18,900/share × 2 shares + 5% acquisition fee = $39,690 grand
  total — verify current pricing as the market-data file is the
  source of truth)
- Tick the terms checkbox at the bottom (the Continue button
  stays disabled until accepted)
- Click "Continue to verification"

**5. Step 2 (Verify) — Stripe Identity KYC**
- Step counter shows "Step 2 of 5"
- This is NOT a local form — it's a Stripe Identity flow
- Click "Start identity verification →"
- You're redirected to a Stripe-hosted identity-verification page
  (uses the test-mode Stripe Identity flow if STRIPE_SECRET_KEY
  starts with sk_test_)
- Complete the synthetic verification (test-mode auto-passes any
  uploaded ID image; see Stripe docs for test-mode specifics)
- **Important:** Stripe redirects back to
  `/portfolio/f458/buy?kyc=ok` (the `?kyc=ok` flag is appended by
  the route's `appendKycOk` helper) but the buy flow always
  re-initializes at Step 1 (Review). KYC status persists on the
  server; you'll need to:
  1. Retick the terms checkbox
  2. Click "Continue to verification" again
  3. You're now back on Step 2 with the "Continue to documents"
     button enabled (the page checks `/api/kyc/status` on mount
     and updates state)
- Click "Continue to documents"

**6. Step 3 (Documents)**
- Step counter shows "Step 3 of 5"
- Two document cards render: Operating Agreement + Management Services Agreement
- Click "I've reviewed" on each card. The button label flips to
  "Reviewed ✓" once clicked.
- **Note:** even with Dropbox Sign templates configured per
  `docs/DROPBOX_SIGN_SETUP.md`, the DocumentsStep UI does NOT yet
  switch to the embed iframe — that's the "Outstanding code work"
  flagged in the DBX setup runbook. Today, both demo and prod
  paths use the same "I've reviewed" local fallback. The
  Dropbox Sign API + webhook are wired and waiting.
- Type your full legal name in the signature box
- Click "Continue to funding"

**7. Step 4 (Fund)**
- Step counter shows "Step 4 of 5"
- Six funding tiles render: ACH, wire, card, crypto, liquidity,
  finance. Crypto + finance are disabled by feature flag, so
  4 are selectable in default config (verify in
  `src/lib/funding-paths.ts`)
- **For card or ACH test**: select either, click Continue. You'll
  be redirected to a Stripe Checkout session (both ACH and card
  route through Stripe). Use test card `4242 4242 4242 4242` for
  card; for ACH use a Stripe test bank routing/account number per
  https://docs.stripe.com/testing#test-account-numbers. After
  payment, Stripe redirects to `/share-purchase/<purchaseId>?ok=1`.
- **For wire/liquidity test**: select either, click Continue. The
  flow records purchase intent via `/api/share-purchase/intent`
  (no Stripe Checkout) and routes to the
  `/share-purchase/<purchaseId>` confirmation page.

**8. Step 5 (Confirm)**
- The in-flow confirm step heading reads "Welcome to RYDA."
- For Stripe-card and ACH/wire paths, the user is redirected to
  `/share-purchase/<purchaseId>` — that page renders the canonical
  post-purchase confirmation, not the in-flow Step 5. Either
  surface signals success.
- Lists the vehicle, shares, total, next steps
- For card path: a `share_purchases` row should exist in Supabase
  with status `paid`. Verify via:
  ```bash
  PROJECT_REF=svkqykabtpvrusikwcyc
  TOKEN=$SUPABASE_ACCESS_TOKEN
  curl -sS -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"select id, vehicle_symbol, shares, status, total_cents from share_purchases where email = '"'"'synthetic+test@yourdomain.com'"'"' order by created_at desc limit 1;"}'
  ```

**9. Member areas (auth required)**
- After purchase, the email should receive a magic-link signup
- Click the link, you're now signed in
- Visit `/account` — share holdings should list the Ferrari 458
- Visit `/account/documents` — both signed agreements should be downloadable
- Visit `/messages` — should list "RYDA F458 LLC" thread (assuming
  admin has created the LLC; otherwise empty state)
- Visit `/votes` — should be empty unless admin has created a test vote

### Cleanup

For repeated test cycles:
1. **Delete the test purchase** in Supabase:
   ```sql
   delete from share_purchases where email = 'synthetic+test@yourdomain.com';
   delete from share_holdings where user_id = (select id from auth.users where email = 'synthetic+test@yourdomain.com');
   ```
2. **Delete the test user**:
   ```sql
   delete from auth.users where email = 'synthetic+test@yourdomain.com';
   ```
3. **Refund the Stripe test charge** in the Stripe dashboard (test
   mode auto-refunds on session deletion in some cases; check)

---

## CI integration

Add to `.github/workflows/ci.yml` after the existing typecheck/test jobs:

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: npm }
    - run: npm ci
    - run: npx playwright install chromium --with-deps
    - run: npm run test:e2e -- synthetic-buyer
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 14
```

The Playwright HTML report uploads on failure for post-mortem.

---

## Troubleshooting

**"Continue to documents" button stays disabled on Step 2**
- KYC isn't complete. The button only enables once
  `/api/kyc/status` reports verified=true (which happens when the
  Stripe Identity flow finishes successfully). Click "Start
  identity verification →" first and complete the Stripe flow.

**"I've reviewed" button doesn't render on Step 3**
- DocumentsStep currently always renders the local "I've reviewed"
  buttons — there is no Dropbox Sign embed-iframe branch in the UI
  yet (see DROPBOX_SIGN_SETUP.md "Outstanding code work" for the
  rewire that's still needed). If the buttons aren't there, the
  bug is in DocumentsStep itself, not the Dropbox Sign config.

**Stripe checkout returns 500 / opens to error page**
- Check `STRIPE_SECRET_KEY` is set in Vercel and is in test mode
  (starts with `sk_test_`)
- Check `/api/share-purchase/create-checkout` logs in Vercel —
  common cause is a missing `success_url` or `cancel_url` in the
  request

**Post-purchase, no share_holdings row appears**
- Check the Stripe webhook is wired:
  - Vercel function logs for `/api/webhooks/stripe/buy`
  - Stripe dashboard → Webhooks → Recent deliveries → look for
    `checkout.session.completed` for the test charge
- Confirm `STRIPE_WEBHOOK_SECRET_BUY` matches the webhook's signing secret
