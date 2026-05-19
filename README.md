# RYDA Web

Production app for asset-backed luxury vehicle co-ownership and booking.

- Production: **https://ryda.pro**
- Stack: Next.js (App Router) + TypeScript + Supabase + Stripe + Vercel + Resend + Playwright/Vitest
- Repo split from `ryangalli-app` monorepo 2026-05-19 — sibling repos are `agent-ops` and `trading-suite` under `~/Desktop/APp/`

## Quickstart

```bash
npm install
cp .env.local.example .env.local           # fill in Supabase + Stripe + Resend keys
npm run dev                                  # http://localhost:3000
```

For local Stripe webhook handling: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_*` into `STRIPE_WEBHOOK_SECRET`. Production webhook secrets live in Vercel env.

## Common commands

```bash
npm run dev                # local dev server
npm run typecheck          # tsc --noEmit
npm run test               # vitest
npm run test:e2e           # playwright (browser-facing flows)
npm run build              # production build
npm run lint               # eslint

# Marketing automation
npm run marketing:sync:dry # preview draft → queue diff
npm run marketing:brief    # daily marketing brief
```

## Documentation

| Doc | What it covers |
|---|---|
| [AGENTS.md](AGENTS.md) | Agent context — safety rules, source-of-truth dirs, verification commands |
| [SETUP.md](SETUP.md) | First-time setup, Supabase migrations, env vars |
| [SMOKE.md](SMOKE.md) | Post-deploy smoke checks against `https://ryda.pro` |
| [CLAUDE.md](CLAUDE.md) | Defers to AGENTS.md — used when invoked from Claude Code CLI |
| [docs/](docs/) | Per-feature deep-dives (admin v3, sample documents, Vercel crons, etc.) |

## Architecture in 30 seconds

- **App routes** at `src/app/` (App Router conventions)
- **Admin flows** at `src/app/admin/` + `src/app/api/admin/`
- **Share-purchase flow** at `src/app/api/share-purchase/` + `src/lib/stripe.ts`
- **Supabase admin** at `src/lib/supabase-admin.ts`
- **Marketing automation** at `scripts/marketing/` (TypeScript content sync + queue poller + daily-brief + video composer)
- **Database migrations** at `supabase/migrations/` (chain through `0037_*` as of 2026-05-19)
- **Tests** at `tests/`, `src/**/*.test.ts`, `playwright.config.ts`

## Hard safety rules (do NOT override without explicit operator approval)

- Production deploys
- Supabase migrations
- Production env changes
- Paid MuAPI / OpenAI / FAL generation
- Social publishing (Instagram, LinkedIn, X, email send)
- Auto-publishing of generated assets (queue stays in operator approval state)

## Cross-repo

- Operations / dashboard / auto-commit steward: `~/Desktop/APp/agent-ops/`
- Trading desk (unrelated to this app): `~/Desktop/APp/trading-suite/`

Each is its own git repo; you push to them independently.
