# RYDA — Production Smoke-Test Runbook

A short, repeatable checklist for verifying production end-to-end after a
deploy. Run this on the live origin (currently
`https://ryda-web-teal.vercel.app` — swap to `ryda.com` once DNS is
cut over) using a real test card.

Time: 8–10 minutes. Run after any release that touches auth, Stripe,
Supabase, or webhooks.

---

## 0. Prep

- One test member account you control (e.g. `you+ryda-smoke@gmail.com`)
- Stripe test card `4242 4242 4242 4242` (any future date, any CVC)
- A second tab open at the Vercel function logs:
  - `vercel logs $(production_url) --follow --environment production`
- `.env.local` has `SUPABASE_ACCESS_TOKEN` for any DB checks below

## 1. Sign-in / sign-out

| Step | Expect |
|------|--------|
| Visit `/signin`, request magic link to test email | Email lands within 30s |
| Click magic link | Redirect to `/account` (or the gated `next` URL) |
| Header shows "Account" pill (no Log in / Sign up) | ✓ |
| Visit `/account/security` → "Sign out of every device" | Redirected to `/`; header flips back to anon |
| Sign back in for the rest of the smoke | ✓ |

## 2. Profile + notifications

| Step | Expect |
|------|--------|
| `/account/profile` → enter Legal name, Phone, City | Save succeeds; "Profile saved." flash |
| Hard refresh | Values still present (loaded from `user_profiles`) |
| `/account/notifications` → flip "SMS" toggle | Brief "Saved." footer; reload preserves state |

## 3. KYC

| Step | Expect |
|------|--------|
| `/account/verification` → Start verification | Redirect to Stripe Identity hosted page |
| Complete the Stripe sandbox flow | Redirect to `/account/verification?kyc=ok` |
| Page shows "Verified" pill within ~60s | ✓ |

If pill doesn't update, check `vercel logs` for `[kyc webhook]` — the
webhook may have hit a signature error or dedup conflict.

## 4. Share purchase (card)

| Step | Expect |
|------|--------|
| `/markets/F296/buy?shares=2` (or boats equivalent) | KYC step shows "Verified" |
| Walk through Documents step (typed-name fallback OK in test) | ✓ |
| Funding → Card → Stripe Checkout opens | ✓ |
| Pay with `4242…` | Land at `/share-purchase/<id>?ok=1` |
| Tracker page transitions "Pending" → "Paid · LLC amendment in flight" within ~60s | ✓ |
| Welcome email with LLC amendment PDF attached | Lands in test inbox |

## 5. Share purchase (ACH)

Repeat step 4 but pick ACH at the Funding step. Stripe test ACH:

- Routing `110000000`, account `000123456789`
- Click "Confirm payment" — settlement is async, Stripe simulates it
  successfully

| Step | Expect |
|------|--------|
| Tracker stays at "Pending" until simulated settlement (test mode: ~minutes) | ✓ |
| `async_payment_succeeded` webhook flips to Paid | ✓ |
| Welcome email arrives | ✓ |

## 6. Webhook event-id dedup

| Step | Expect |
|------|--------|
| In Stripe Dashboard → Webhooks → endpoint → Events → pick a recent `checkout.session.completed` | ✓ |
| Click "Resend" | `vercel logs` shows `duplicate event, skipping <id>` |
| `share_purchases` row state unchanged | ✓ |

## 7. Refund (self-serve, within window)

| Step | Expect |
|------|--------|
| For the test purchase from step 4, hit `POST /api/share-purchase/<id>/refund` (via dev tools / curl with auth cookie or Bearer) | Returns `{ ok: true, action: "refunded" }` |
| Stripe dashboard shows refund issued | ✓ |
| `share_purchases.status` = `canceled` | ✓ |
| `share_holdings.transferred_at` set (rows soft-released) | ✓ |
| `contact_messages` has a row with `context = "Refund · self_serve_refund"` | ✓ |

## 8. Resend amendment

| Step | Expect |
|------|--------|
| For a paid purchase, `POST /api/share-purchase/<id>/resend-amendment` | Returns `{ ok: true }` |
| Inbox receives a fresh email with subject `Re-sent: your … amendment` | ✓ |

## 9. Bookings + calendar

| Step | Expect |
|------|--------|
| `/bookings/new` → pick a vehicle the test member co-owns → 3-day range 14 days out | Confirm; row in `bookings` |
| `/my-cars/<symbol>` calendar shows the booking with "You" badge | ✓ |
| Try a past-dated booking (`startDate=2020-01-01`) | API returns 400 |
| Try `?vehicleSymbol=F296&boatSlug=foo` on GET | 400 "Provide at most one of …" |

## 10. Account section sweep

| Page | Expect |
|------|--------|
| `/account` overview | Real stats (assets count, upcoming bookings) |
| `/account/membership` | Lists actual LLCs owned |
| `/account/documents` | Lists real `llc_amendments` + `document_signatures` rows |
| `/account/payments` → "Open Stripe Customer Portal" | Redirects to billing.stripe.com session |
| `/account/privacy` → "Request my data" | `contact_messages` row inserted with `context = "Data export"` |

## 11. Admin (if your test account has `role: admin`)

| Step | Expect |
|------|--------|
| `/admin` | Loads with counts + recent rows tables |
| Non-admin account hits `/admin` | 403 panel "no admin access" |

## 12. Logs sanity

After running through 1–11, `vercel logs --environment production` from
the same window should show:

- No 500s
- `[stripe webhook]` lines for each Stripe event delivered
- One `duplicate event, skipping` from step 6
- KYC: `[kyc-start · 401]` only if you tested without auth
- Auth diag: every signed-in request shows `diag: ok:header` (no `getuser_error`)

## 13. Failure modes

If anything red surfaces:

1. **Webhook 400 invalid signature** — `STRIPE_WEBHOOK_SECRET` or
   `STRIPE_KYC_WEBHOOK_SECRET` mismatched between Stripe dashboard
   endpoint and Vercel env. Re-pull from dashboard, re-push to Vercel.
2. **401 with `getuser_error:AuthApiError:Invalid API key`** —
   `SUPABASE_SERVICE_ROLE_KEY` corrupted (fixed in commit `1324d27`,
   but worth verifying with `vercel env pull --environment production`
   and confirming length matches `.env.local`).
3. **Duplicate amendment emails** — `stripe_events` dedup not
   inserting; check `[stripe webhook] dedup insert failed`. Most
   often means migration 0015 wasn't applied.
4. **Empty `/account` overview after creating bookings** — RLS
   blocking? `share_holdings` and `bookings` policies should allow
   `auth.uid()` reads. Verify with the Supabase SQL editor:
   ```sql
   set role authenticated;
   set request.jwt.claims = '{"sub":"<your_user_id>"}';
   select count(*) from bookings;
   ```

---

## After-launch follow-ups (not part of smoke)

- 7-day refund-window edge cases (paid 6.5 days ago → still self-serve;
  paid 7.5 days ago → ticket branch)
- Share-transfer happy-path once `/account/transfers/[id]` page lands
- KYC `requires_input` recovery path (test member uploads bad photo →
  retry flow)
