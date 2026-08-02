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
- Product: asset-backed luxury vehicle co-ownership and booking platform with admin gates.

## Source-Of-Truth Areas

- App routes: `src/app`
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
