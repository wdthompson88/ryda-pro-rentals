<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RYDA Web Agent Context

Keep this context lean. Read files that match the task instead of loading broad historical docs.

## Project

- Path: `/Users/odinpartners/Desktop/dev/ryda-web`
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

## Context Hygiene

- Do not treat root `/Users/odinpartners/Desktop/APp/CLAUDE.md` as detailed RYDA product context.
- Prefer this file plus current source files.
- Use `/Users/odinpartners/Desktop/dev/agent-ops/docs/HANDOFF_STATUS_2026-05-15.md` for current setup state.
- Use `/Users/odinpartners/Desktop/dev/agent-ops/docs/MODEL_COUNCIL_WORKFLOW.md` when multiple AI outputs need prompt judgment.
