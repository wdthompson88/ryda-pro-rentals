<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RYDA Rentals — Agent Context

Keep this context lean. Read files that match the task instead of loading broad historical docs.

## Project

- Repo: `wdthompson88/ryda-pro-rentals` (private). Clone anywhere; all paths in this file are repo-relative.
- Stack: Next.js App Router, TypeScript, Supabase, Stripe, Vercel, Resend, Playwright/Vitest.
- Production domain: `https://ryda.pro`
- Product: **rentals marketplace, and only that.** RYDA lists local operators' luxury and
  exotic cars, captures inquiries against real accounts, routes each lead to the operator,
  and earns a referral commission.

## The product in one paragraph (read before changing product surfaces)

`/` is the landing page, `/rent` is the browse grid, `/rent/[symbol]` is a car, and
`/how-it-works` explains the referral model. A visitor submits an inquiry; an admin triages
it at `/admin/inquiries` and sends a payment link; the operator gets paid and RYDA takes a
commission. Payments are **fee-only Stripe Connect direct charges**: the customer pays a
link that charges the operator's connected account, the rental price never enters RYDA's
balance, and RYDA's commission rides along as `application_fee_amount`. Never write copy —
anywhere — promising that RYDA holds, guarantees, or never touches payment; state what the
code does. Operators are never named on customer-facing surfaces ("a vetted Miami
operator").

## There is no co-ownership here

This repo was seeded from the history of `moocow4844/ryda-web` and then stripped. The
fractional-share product — share purchase, LLC formation and amendments, member voting,
dispute cases, the boats tree, `/portfolio`, `/membership`, `/co-ownership`,
`/sample-documents` — **was deliberately removed and must not be reintroduced here.** It
lives on in the original repo, which is a separate product with separate owners.

Two consequences worth stating plainly, because both look like bugs otherwise:

- **The git history still contains all of it.** Commits before the strip reference routes,
  tables and components that no longer exist. History is not documentation — do not restore
  a file just because an old commit shows it.
- **The migration chain still contains its tables.** See the migrations section below. They
  are inert, not pending work.

If a task seems to call for co-ownership functionality, that is a signal to stop and ask,
not to rebuild it.

## Source-Of-Truth Areas

- App routes: `src/app`
- Rental funnel: `src/app/api/rental-inquiry`, `src/components/rental-inquiry-form.tsx`
- Browse + listings data: `src/components/rental-listings.tsx`, `src/lib/partner-fleet.ts`,
  `src/lib/market-data.ts` (the fleet catalog — feeds the landing page count, the browse
  grid, `/rent/[symbol]`'s `generateStaticParams`, `/locations` and the sitemap; it reads
  co-own-ish in places and still has some unreferenced share-era exports, but it is
  load-bearing for rentals — prune with care and a green test run)
- Bookings + availability: `src/lib/rental-availability.ts`, `src/lib/rental-listings-db.ts`
- Partner program: `src/app/partner`, `src/app/admin/partners`, `src/app/api/admin/partners`
- Rental payments: `src/app/api/admin/inquiries/[id]/payment-link`,
  `src/app/api/stripe/connect-webhook`, `src/lib/fees.ts` (the only home for money math)
- Identity / KYC: `src/app/account/verification`, `src/app/api/kyc/*`, the onboarding
  Identity step. Currently **unused by the rental flow** — kept on purpose for renter
  verification later. Do not delete it as dead code.
- Design system: `.claude/skills/frontend-design/SKILL.md` — light-only palette, tokens only
- Admin flows: `src/app/admin`, `src/app/api/admin`
- Supabase admin client: `src/lib/supabase-admin.ts`
- Marketing automation: `scripts/marketing`, `src/lib/image-gen`, `src/lib/video-gen`, `src/lib/generative-ai`
- Database migrations: `supabase/migrations`
- Tests: `tests`, `src/**/*.test.ts`, `playwright.config.ts`

## RYDA Safety Rules

- Keep `content_queue` and admin approval states as source of truth for generated media.
- Do not auto-publish generated assets.
- Do not run Supabase migrations, production env changes, paid MuAPI generation, social publishing, or deploys without explicit approval.
- Never print or commit `.env.local`, Stripe secrets, Supabase service-role keys, MUAPI keys, or webhook secrets.
- For Stripe webhooks, local secrets come from `stripe listen`; production secrets live in Vercel.

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

`npm run verify` runs typecheck + test + build together. Run it before opening a PR.

## Migrations

`supabase/migrations/` holds **46 files numbered `0001` through `0047`, with one gap at
`0026`.** Both of those facts are inherited and both are fine.

- **The gap is not a missing file.** `0026` was already absent upstream.
  `scripts/__tests__/migration-numbering.test.ts` deliberately tolerates gaps and hard-fails
  only on *duplicates* — two files claiming the same ordinal is the actual breakage.
- **Roughly half the chain creates co-ownership tables** — `share_purchases`,
  `share_holdings`, `llc_entities`, `llc_votes`, `dispute_cases`, `boats` and friends. No
  application code references them any more. They were left in place on purpose: renumbering
  or deleting an applied migration is the one action in this repo that cannot be undone by
  re-adding a file. Point this repo at a fresh Supabase project and those tables get created
  and sit empty forever. That is cheaper than a broken chain.
- **The next new migration claims `0048`.** Check `ls supabase/migrations | tail -1` first
  anyway.
- Applying migrations requires explicit operator approval (see Safety Rules).

## Working in this repo

This is a single-owner repo. The multi-agent contention rules the upstream repo needed — claim
your migration number in the PR title, check open branches before touching a shared surface,
coordinate with the other operator — **do not apply here.** There is no second operator to
collide with, and migration numbers cannot be double-claimed from one machine.

What still holds:

- **Never commit or push to `main`.** Branch: `feat/<initials>-<slug>`, `fix/<initials>-<slug>`,
  `chore/<initials>-<slug>`. `.githooks/pre-push` refuses a `main` push and `npm install`
  wires it up via the `prepare` script. It is client-side only, so it stops the accident, not
  the intent. Emergency override: `RYDA_ALLOW_MAIN_PUSH=1 git push`.
- Open a PR and merge when the `verify` workflow is green. The `direct-push-guard` job fails
  any commit that reaches `main` without a PR behind it.
- If something does land on `main` directly, `git revert <sha>` through a PR. Do not
  force-push `main`.
- `git pull --rebase origin main` before you start and before you push. Small PRs.

### Node version

Node **24** everywhere, because that is what Vercel runs in production. `.nvmrc` pins it,
`engines.node` declares it, and `.npmrc` sets `engine-strict=true` so `npm install` on the
wrong major **fails** rather than warning. That is deliberate: without it npm installs anyway
and silently rewrites `package-lock.json` in the older npm's format, which then ping-pongs
between machines. A refused install that names the required version is better than lockfile
churn nobody can source.

If an install fails with `EBADENGINE`, you are on the wrong Node. Switch to 24 rather than
working around it.

### Secrets

- `.env.local` is git-ignored and **never** leaves the machine — not over chat, email, or a
  PR. It holds a live Stripe secret key and a Supabase service-role key.
- A new machine gets its own copy from Vercel, not from a teammate:
  ```sh
  vercel link          # select this project
  vercel env pull .env.local
  ```
- `.env.local.example` documents every variable the app reads, and what breaks when each is
  unset. Keep it current when you add one.
- CI runs with no secrets by design. Anything that needs a real key is tested locally.

### Agent conduct

- State which branch you are on before editing.
- Run `npm run verify` before opening a PR — do not push red.
- If `git status` shows changes you did not make, stop and ask.

## Context Hygiene

- Prefer this file plus current source files over broad historical docs.
- `docs/` is inherited and uneven. Some of it predates the strip and still describes the
  co-ownership product — treat anything in there as historical unless it says otherwise, and
  trust the source over the doc.
