# RYDA Rentals

Production app for the RYDA luxury and exotic car rental marketplace.

RYDA lists local operators' cars, captures rental inquiries, routes each lead to the
operator, and earns a referral commission. Payment is a Stripe Connect **direct charge** on
the operator's connected account — the rental price never lands in RYDA's balance, and
RYDA's commission rides along as `application_fee_amount`.

- Production: **https://ryda.pro**
- Stack: Next.js (App Router) + TypeScript + Supabase + Stripe + Vercel + Resend + Playwright/Vitest
- Repo: `wdthompson88/ryda-pro-rentals`

> **This repo is rentals only.** It was seeded from the history of `moocow4844/ryda-web` and
> then stripped of the fractional co-ownership product (share purchase, LLC formation, member
> voting, the boats tree). That product continues in the original repo. Commits before the
> strip still reference routes and tables that no longer exist here — see the "no
> co-ownership" section of [AGENTS.md](AGENTS.md) before acting on anything you find in
> history.

## Quickstart

```bash
nvm use                                    # Node 24 — a wrong major hard-fails npm install
npm install
cp .env.local.example .env.local           # fill in Supabase + Stripe + Resend keys
npm run dev                                # http://localhost:3000
```

The app degrades gracefully without keys: unset Supabase falls back to a simulated auth path,
unset Resend makes `notifyTeam()` log instead of email, and an unset Stripe key makes the
admin payment-link action return 503. You can browse and develop the marketing surface with
an empty `.env.local`.

For local Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/connect-webhook
```

Put the printed `whsec_*` into `STRIPE_CONNECT_WEBHOOK_SECRET`. Production webhook secrets
live in Vercel env, never in the repo.

## Common commands

```bash
npm run dev                # local dev server
npm run typecheck          # tsc --noEmit
npm run test               # vitest
npm run test:e2e           # playwright (browser-facing flows)
npm run build              # production build
npm run verify             # typecheck + test + build — run before opening a PR

# Marketing automation
npm run marketing:sync:dry # preview draft → queue diff
npm run marketing:brief    # daily marketing brief
```

## Documentation

| Doc | What it covers |
|---|---|
| [AGENTS.md](AGENTS.md) | Agent context — safety rules, source-of-truth dirs, verification, migrations, branching |
| [SETUP.md](SETUP.md) | First-time setup: migrations, env vars, Stripe Connect + Identity webhooks |
| [SMOKE.md](SMOKE.md) | Post-deploy smoke checks against `https://ryda.pro` |
| [CLAUDE.md](CLAUDE.md) | Defers to AGENTS.md — used when invoked from Claude Code CLI |
| [docs/](docs/) | Per-feature deep-dives. Inherited and uneven; some predates the strip |

## Architecture in 30 seconds

- **App routes** at `src/app/` (App Router conventions)
- **Rental funnel**: `/rent` browse → `/rent/[symbol]` → `POST /api/rental-inquiry`
- **Admin triage** at `src/app/admin/` + `src/app/api/admin/` — `/admin` is the funnel
  overview, `/admin/inquiries` owns lead triage and payment links, `/admin/partners` owns the
  operator roster and Stripe Connect onboarding
- **Money math** lives only in `src/lib/fees.ts` (`computeRentalFee`)
- **Payment rail** at `src/app/api/admin/inquiries/[id]/payment-link` +
  `src/app/api/stripe/connect-webhook`
- **Identity/KYC** at `src/app/api/kyc/` — built, wired, and not yet used by the rental flow;
  kept for renter verification later
- **Supabase admin** at `src/lib/supabase-admin.ts`
- **Marketing automation** at `scripts/marketing/`
- **Database migrations** at `supabase/migrations/` — 46 files, `0001`–`0047`, gap at `0026`,
  next number is `0048`. Roughly half create co-ownership tables that no code reads; they are
  inherited and intentionally left alone
- **Tests** at `tests/`, `src/**/*.test.ts`, `playwright.config.ts`

## Hard safety rules (do NOT override without explicit operator approval)

- Production deploys
- Supabase migrations
- Production env changes
- Paid MuAPI / OpenAI / FAL generation
- Social publishing (Instagram, LinkedIn, X, email send)
- Auto-publishing of generated assets (queue stays in operator approval state)
