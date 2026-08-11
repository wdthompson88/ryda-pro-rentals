<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RYDA Web Agent Context

Keep this context lean. Read files that match the task instead of loading broad historical docs.

## Project

- Repo: `moocow4844/ryda-web` (private). Clone anywhere; all paths in this file are repo-relative.
- Stack: Next.js App Router, TypeScript, Supabase, Stripe, Vercel, Resend, Playwright/Vitest.
- Production domain: `https://ryda.pro`
- Product: **rentals-first marketplace.** RYDA lists local operators' luxury/exotic cars,
  captures inquiries against real accounts, routes each lead to the operator, and earns a
  referral commission. Co-ownership is the 2027 chapter — its pages, member dashboards, and
  share-purchase flow all still exist and still work, but they are no longer the front door.

## The pivot, in one paragraph (read before changing product surfaces)

August 2026: rentals became the product. `/` is a landing page, `/rent` is the browse grid,
`/how-it-works` explains the referral model. Co-ownership content lives on at its own URLs
(`/portfolio`, `/membership`, `/co-ownership`, the boats tree) and is reachable from the
footer — **do not delete it**, and do not re-introduce it into the top nav or onto rental
surfaces. Payments are **fee-only Stripe Connect direct charges**: the customer pays a link
that charges the operator's connected account, the rental price never enters RYDA's balance,
and RYDA's commission rides along as `application_fee_amount`. Never write copy — anywhere —
promising that RYDA holds, guarantees, or never touches payment; state what the code does.
Operators are never named on customer-facing surfaces ("a vetted Miami operator").

## Source-Of-Truth Areas

- App routes: `src/app`
- Rental funnel: `src/app/api/rental-inquiry`, `src/components/rental-inquiry-form.tsx`
- Browse + listings data: `src/components/rental-listings.tsx`, `src/lib/partner-fleet.ts`
- Partner program: `src/app/partner`, `src/app/admin/partners`, `src/app/api/admin/partners`
- Rental payments: `src/app/api/admin/inquiries/[id]/payment-link`,
  `src/app/api/stripe/connect-webhook`, `src/lib/fees.ts` (the only home for money math)
- Design system: `.claude/skills/frontend-design/SKILL.md` — light-only palette, tokens only
- Admin flows: `src/app/admin`, `src/app/api/admin`
- Share purchase and Stripe: `src/app/api/share-purchase`, `src/lib/stripe.ts`
- Supabase admin client: `src/lib/supabase-admin.ts`
- Marketing automation: `scripts/marketing`, `src/lib/image-gen`, `src/lib/video-gen`, `src/lib/generative-ai`
- Database migrations: `supabase/migrations`
- Tests: `tests`, `src/**/*.test.ts`, `playwright.config.ts`

## RYDA Safety Rules

- Keep `content_queue` and admin approval states as source of truth for generated media.
- Do not auto-publish generated assets.
- Do not run Supabase migrations, production env changes, paid MuAPI generation, social publishing, or deploys without explicit approval.
- Never print or commit `.env.local`, Stripe secrets, Supabase service-role keys, MUAPI keys, or webhook secrets.
- For Stripe webhooks, local `STRIPE_WEBHOOK_SECRET` comes from `stripe listen`; production secrets live in Vercel.

## Verification

Use the smallest relevant check first:

```sh
npm run typecheck
npm run test
npm run build
```

For browser-facing changes:

```sh
npm run test:e2e
```

For marketing queue work:

```sh
npm run marketing:sync:dry
npm run marketing:brief
```

## Collaboration

More than one person — each with their own Claude Code — works in this repo.
Two agents can be editing the same tree at the same time. These rules exist so
that never turns into a lost commit or a clobbered migration.

### Branch and merge

- **Never commit or push to `main`.** Always branch: `feat/<initials>-<slug>`,
  `fix/<initials>-<slug>`, `chore/<initials>-<slug>`.
- A `pre-push` hook enforces this locally. `npm install` wires it up (the
  `prepare` script points `core.hooksPath` at `.githooks/`). It is client-side
  only — GitHub gates real branch protection behind Pro for private repos —
  so it stops the accident, not the intent. Emergency override:
  `RYDA_ALLOW_MAIN_PUSH=1 git push`.
- Open a PR. Merge only when the `verify` check is green.
- `git pull --rebase origin main` before you start and before you push.
- Small PRs. A branch older than a day is a merge conflict waiting to happen.
- **Claim your surface out loud.** The August 2026 pivot cost a day of reconciliation
  because two agents independently built a partner system — one an application funnel,
  one a Stripe operator roster — that then had to be merged into one. Before starting
  anything that touches a shared surface (`site-header`, `/admin/*`, auth/signup, the
  design tokens, or a new DB table), check the open branches (`git fetch && git branch -r`)
  and say in the PR title what you are claiming. Two agents shipping the same concept is
  more expensive than one waiting.

### Why `main` is not actually locked

This repo is private on the GitHub free plan, and that plan cannot block a
push to `main` by any means:

| Mechanism | Status |
|---|---|
| Classic branch protection | Pro required |
| Repository rulesets | Pro required |
| Pre-receive hooks | Enterprise only |
| GitHub Actions | Runs *after* the push has landed |

So the model here is **prevent the accident, detect the bypass**:

1. `.githooks/pre-push` refuses a `main` push. Beats forgetting which branch
   you were on. Loses to `git push --no-verify`.
2. The `direct-push-guard` job fails on any commit that reaches `main` with no
   pull request behind it. That puts a red X on the default branch and emails
   the repo owner — a bypass is loud and permanently recorded, even though it
   could not be stopped.

Treat the rule as binding. Nothing will physically stop you; the other person
will simply see it.

### If something does land on `main` directly

Do not force-push `main` to "clean it up" — that rewrites history under
whoever else has it checked out, which is worse than the original mistake.

```sh
git revert <sha>     # new commit undoing it, via a PR like anything else
```

Then say so, so the other person can rebase rather than discover it.

### Migrations are the collision risk

`supabase/migrations/` uses sequential numbering (`0037_*` is current HEAD).
Two people adding `0038_` on separate branches produces two different
migrations with the same number and a broken chain.

- Before writing a migration, `git fetch origin && ls supabase/migrations` on
  latest `main` — and say in the PR title which number you are claiming.
- Never renumber a migration that has already been applied anywhere.
- Applying migrations still requires explicit operator approval (see Safety Rules).

### Node version

Node **24** everywhere, because that is what Vercel runs in production for
this project (`vercel project inspect ryda-web`). CI, both operator machines,
and any new clone all match it. Not "the newest" — the one production uses.

`.nvmrc` pins it, `engines.node` declares it, and `.npmrc` sets
`engine-strict=true` so `npm install` on the wrong major **fails** rather than
warning. That is deliberate: without it npm installs anyway and silently
rewrites `package-lock.json` in the older npm's format, which then ping-pongs
between machines. A refused install that names the required version is better
than lockfile churn nobody can source.

If an install fails with `EBADENGINE`, you are on the wrong Node. Switch to
24 rather than working around it.

### Secrets

- `.env.local` is git-ignored and **never** leaves the machine — not over chat,
  email, or a PR. It holds a live Stripe secret key and a Supabase
  service-role key.
- New machine gets its own copy from Vercel, not from a teammate:
  ```sh
  vercel link          # select the ryda-web project
  vercel env pull .env.local
  ```
- CI runs with no secrets by design. Anything that needs a real key is tested
  locally, not in Actions.

### Agent conduct

- State which branch you are on before editing.
- Run `npm run verify` before opening a PR — do not push red.
- If `git status` shows changes you did not make, stop and ask. Another agent
  may be mid-task in the same tree.

## Context Hygiene

- Prefer this file plus current source files over broad historical docs.
- The following are **operator-local to Ryan's machines** and will not exist in
  other clones — ignore them if absent:
  - `../CLAUDE.md` at the `dev/` workspace root (not RYDA product context).
  - `../agent-ops/docs/HANDOFF_STATUS_2026-05-15.md` — setup state.
  - `../agent-ops/docs/MODEL_COUNCIL_WORKFLOW.md` — judging multiple AI outputs.
