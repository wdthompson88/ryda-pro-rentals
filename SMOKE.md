# RYDA Rentals — Production Smoke-Test Runbook

A short, repeatable checklist for verifying production end-to-end after a deploy. Run it on
the live origin `https://ryda.pro` using a real Stripe test card.

Time: 8–10 minutes. Run after any release that touches auth, Stripe, Supabase, or webhooks.

---

## 0. Prep

- One test account you control (e.g. `you+ryda-smoke@gmail.com`)
- An admin account (`npx tsx scripts/grant-admin.ts <email>`)
- At least one operator onboarded through Stripe Connect with `charges_enabled` true —
  without it there is nothing to charge against
- Stripe test card `4242 4242 4242 4242` (any future date, any CVC)
- A second tab on the function logs:
  `vercel logs $(production_url) --follow --environment production`

---

## 1. Sign-in / sign-out

| Step | Expect |
|------|--------|
| Visit `/signin`, request magic link to test email | Email lands within 30s |
| Click magic link | Redirect to `/account` (or the gated `next` URL) |
| Header shows "Account" pill (no Log in / Sign up) | ✓ |
| `/account/security` → "Sign out of every device" | Redirected to `/`; header flips back to anon |
| Sign back in for the rest of the smoke | ✓ |

## 2. Profile + notifications

| Step | Expect |
|------|--------|
| `/account/profile` → enter Legal name, Phone, City | Save succeeds; "Profile saved." flash |
| Hard refresh | Values still present |
| `/account/notifications` → flip a toggle | "Saved." footer; reload preserves state |

## 3. Browse the fleet (anonymous)

Open a private window — this is the path most visitors take.

| Step | Expect |
|------|--------|
| `/` | Landing page renders; fleet count matches the browse grid |
| `/rent` | Browse grid lists cars; no co-ownership or share language anywhere |
| `/rent/<slug>` for a RYDA car and a partner car | Both render; photo gallery works |
| Operator names | Never shown — copy reads "a vetted Miami operator" or similar |
| `/how-it-works` | Three-step referral model |

## 4. Rental inquiry (the funnel entry point)

| Step | Expect |
|------|--------|
| On `/rent/<slug>`, submit the inquiry form with real dates | Success state; no error flash |
| `rental_inquiries` has a new row, `status = 'new'` | ✓ |
| Team notification email arrives at `RYDA_NOTIFY_TO` | ✓ |
| Submit the same form twice quickly (double-tap) | Only ONE row — `client_token` unique index holds |
| While signed in, `/account/requests` | The inquiry is listed against your account |

## 5. Admin triage

Signed in as admin.

| Step | Expect |
|------|--------|
| `/admin` | Funnel overview: counts strip + recent inquiries / bookings / payments |
| Counts reflect the inquiry you just made | `inquiries_new` incremented |
| Non-admin account hits `/admin` | "No permission" empty state; the API 403s |
| `/admin/inquiries` | Your inquiry is in the list |
| Move it to `sent` (operator confirmed price off-platform) | Status updates |
| `/admin/partners` | Operator roster; onboarded operators show `stripe_onboarded_at` |

## 6. Payment link (Connect direct charge)

This is the money path. Take it slowly.

| Step | Expect |
|------|--------|
| On the `sent` inquiry, enter a price and send the payment link | `{ ok: true, url }`; customer receives the email |
| `rental_payments` row created, `status = 'pending'` | ✓ |
| `application_fee_cents` matches `computeRentalFee` at the partner's `commission_rate` | ✓ |
| Click the link — inspect the Checkout page | It is on the OPERATOR's account, not the platform |
| Press "send link" again at the SAME amount | Returns the same URL, `deduped: true` — no second session |
| Press "send link" at a DIFFERENT amount | 409 — re-quoting requires expiring the old link first |
| Pay with `4242…` | Checkout succeeds |
| Within ~60s: `rental_payments.status = 'paid'`, inquiry `status = 'booked'` | ✓ |
| Confirmation emails to customer and operator | ✓ |
| Stripe dashboard → the operator's connected account | Charge is there, with the application fee split out |
| Platform balance | Only the application fee. The rental price never lands here |

## 7. Webhook dedup

| Step | Expect |
|------|--------|
| Stripe Dashboard → the Connect endpoint → Events → the `checkout.session.completed` from step 6 → "Resend" | Logs show `duplicate event, skipping <id>` |
| `rental_payments` row unchanged | ✓ |

## 8. Expired link recovery

| Step | Expect |
|------|--------|
| Create a link, let it expire (or expire the session from the Stripe dashboard) | `checkout.session.expired` fires |
| `rental_payments.status` flips `pending → expired` | ✓ |
| Admin can now mint a fresh link at a new price | ✓ |

## 9. KYC (built, not yet in the rental funnel)

Identity is wired but no rental step depends on it. Smoke it only if you touched
`/api/kyc/*`.

| Step | Expect |
|------|--------|
| `/account/verification` → Start verification | Redirect to Stripe Identity hosted page |
| Complete the sandbox flow | Redirect to `/account/verification?kyc=ok` |
| "Verified" pill within ~60s | ✓ |

If the pill doesn't update, check logs for `[kyc webhook]` — usually a signature error.

## 10. Account sweep

| Page | Expect |
|------|--------|
| `/account` | Overview renders, no co-ownership panels |
| `/account/requests` | Your rental inquiries with status |
| `/account/payments` → "Open Stripe Customer Portal" | Redirects to billing.stripe.com |
| `/account/privacy` → "Request my data" | `contact_messages` row with `context = "Data export"` |

## 11. Operator-facing

| Page | Expect |
|------|--------|
| `/partners` | Operator acquisition page |
| `/partner` signed in as a linked operator | Their own view resolves via `partner_accounts` |

## 12. Logs sanity

After 1–11, the log window should show:

- No 500s
- `[connect webhook]` lines for each Stripe event delivered
- One `duplicate event, skipping` from step 7
- Every signed-in request showing `diag: ok:header` (no `getuser_error`)

## 13. Failure modes

1. **Connect webhook never fires.** The endpoint was created without "Listen to events on
   connected accounts." Direct-charge events never reach a platform-account endpoint. Recreate
   it with the toggle on.
2. **Webhook 400 invalid signature.** `STRIPE_CONNECT_WEBHOOK_SECRET` or
   `STRIPE_KYC_WEBHOOK_SECRET` mismatched between the dashboard endpoint and Vercel. One
   secret per endpoint — they are not interchangeable. Re-pull and re-push.
3. **Payment link returns 503.** `STRIPE_SECRET_KEY` unset.
4. **Payment link refuses to mint.** The operator's connected account can't accept charges —
   check `charges_enabled`, re-send an onboarding link.
5. **401 `getuser_error:AuthApiError:Invalid API key`.** `SUPABASE_SERVICE_ROLE_KEY`
   corrupted. `vercel env pull --environment production` and compare length to `.env.local`.
6. **Inquiry submits but no email.** `RESEND_API_KEY` / `RYDA_NOTIFY_FROM` /
   `RYDA_NOTIFY_TO` unset — `notifyTeam()` degrades to a log by design, so the form still
   succeeds. Check the logs before assuming the form is broken.

---

## Not part of smoke

- `rental_bookings` end-to-end. The schema (`0047`) is in place but the request/approve flow
  is still being built — smoke it once the routes land.
- Deposit authorization and the re-auth sweep (`deposit_auth_expires_at`).
- Renter KYC as a gate in the booking flow.
