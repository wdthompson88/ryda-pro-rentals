<!--
Keep this short. The point is that the other person can tell, at a glance,
whether your branch is about to collide with theirs.
-->

## What and why

<!-- One or two sentences. What changes, and what problem it solves. -->

## Areas touched

<!--
Tick what this PR modifies. If someone else's open PR ticks the same box,
talk before merging.
-->

- [ ] App routes (`src/app`)
- [ ] Admin flows (`src/app/admin`, `src/app/api/admin`)
- [ ] Share purchase / Stripe (`src/app/api/share-purchase`, `src/lib/stripe.ts`)
- [ ] Supabase access (`src/lib/supabase-admin.ts`)
- [ ] Marketing automation (`scripts/marketing`, `src/lib/*-gen`)
- [ ] **Database migration** — number claimed: `____`
- [ ] Tests only
- [ ] Docs / config only

## Test plan

<!-- What you actually ran. `npm run verify` at minimum. -->

- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e` (browser-facing changes only)

## Needs operator approval before merge

<!-- Tick anything that applies. These are the RYDA safety rules — see AGENTS.md. -->

- [ ] Runs a Supabase migration
- [ ] Changes production env vars
- [ ] Deploys
- [ ] Spends money (MuAPI / OpenAI / FAL generation)
- [ ] Publishes to social or sends email
- [ ] None of the above
