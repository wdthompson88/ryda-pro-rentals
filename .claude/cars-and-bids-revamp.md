# Cars & Bids–esque formatting revamp — progress & checklist

Working doc for the overnight continuation of this revamp. Read this file
first, every run — it's how independent runs stay coordinated. When you
finish an item, check it off **in this file** and commit that change
alongside your work, so the next run knows what's left.

## Context

Dave (the founder, non-engineer) asked for a formatting revamp toward a
"Cars & Bids" feel: cleaner, more confident, more standardized UI — "go
70% of the way there" — while keeping Fraunces/Inter typography and some
of the quiet-luxury materials (cream/ink/red palette, photography-led
cards). Full design-system rules: `.claude/skills/frontend-design/SKILL.md`
(read it before touching any UI — it has the token table, the anti-pattern
list, and the three patterns this revamp formalized: unified marketplace
card, numbered pillar/step grid, bordered hairline spec table).

**The single most important constraint, learned the hard way earlier in
this revamp:** this codebase carries extensive comments documenting
fabricated claims that were deliberately deleted — fake driver-age
requirements, invented delivery cities, a "vetted by RYDA" claim,
fleet-wide rate statistics, a car that was never in inventory, payment
language that would misrepresent how money moves. Read the comments in
any file before restyling it. **This revamp is presentation-only.** Never
add a new spec field, badge, stat, or claim that isn't already backed by
real data (`PartnerVehicle` in `src/lib/partner-fleet.ts`) or existing
approved copy. When in doubt, restyle the layout and leave the words
alone. If you're not sure whether a copy change is safe, don't make it —
skip that item, leave a one-line note under it in this file explaining
why, and move on.

## Ground rules for every run

1. `git pull` on `feat/dt-cars-bids-formatting` before starting — another
   run may have pushed since you cloned.
2. Read `.claude/skills/frontend-design/SKILL.md` and skim
   `AGENTS.md` before editing.
3. Pick the next unchecked item below. Prefer finishing a page you (or a
   prior run) already started over starting a new one.
4. Make the change. Reuse the established patterns (marketplace card,
   numbered pillar/step grid, bordered hairline spec table) wherever a
   page has a shape that matches one — that's what "standardized" means
   here. Don't invent new component shapes; if you hit a real gap the
   design system doesn't cover, add it to SKILL.md first (see that file's
   own "When to add to this skill" section), then use it.
5. Verify: `npm run typecheck && npm run test` at minimum; `npm run build`
   before your final commit of the session.
6. Check off what you finished in this file, note anything you skipped
   and why, commit (small, focused commits, clear messages), and
   **push** — the next run depends on it. Never touch `main`, never
   force-push, never open a PR.
7. If you run low on remaining time/budget for this session, stop at a
   clean, verified, committed, pushed state rather than mid-edit.
8. Out of scope, don't touch: `/admin/*`, `/account/*` (logged-in
   internal screens, not marketing surfaces), any API route, any
   Supabase/Stripe logic, `site-header.tsx`'s priority-nav overflow
   algorithm (functional code, not a style concern).

## Already done (this session, do not redo)

- [x] Unified marketplace card (`src/components/marketplace-card.tsx`),
      used by both `/rent` and the landing page's Featured fleet.
- [x] `/rent/[symbol]`: sticky booking card, bordered hairline spec
      table, numbered "How the rental works" pillars.
- [x] `/how-it-works` merged into `/` as the `#how-it-works` section,
      old URL 301-redirects (`next.config.ts`), every internal link
      updated, `tests/example.spec.ts` updated to match.
- [x] Landing page (`/`) gained "The model" (commission/payment
      breakdown, bordered hairline grid) and "Why the account?"
      sections, both carried over from the old `/how-it-works`.

## To do — public marketing/marketplace pages

Roughly in priority order (pages a real visitor is likeliest to hit
first). For each: apply the numbered pillar/step and bordered
hairline-table patterns wherever the page has a matching shape, tighten
card/spacing consistency, and generally push toward "clean, confident
marketplace" over "sleepy brochure" — without touching copy or adding
data that isn't already there.

- [ ] `/partners` — partner recruitment page.
- [ ] `/faq` — check accordion/list styling against the design system.
- [ ] `/help`, `/help/[category]`, `/help/[category]/[slug]` — help
      center. Likely the biggest surface area; do the shared layout
      shell first, individual articles should inherit it for free.
- [ ] `/contact`
- [ ] `/trust-and-safety`
- [ ] `/locations/miami`
- [ ] `/host-your-car` — operator recruitment landing.
- [ ] `/about`
- [ ] `/investors`
- [ ] `/press`
- [ ] `/search` — results page.
- [ ] `/signup`, `/signin` — auth forms. Light touch: form field/button
      consistency, not a redesign.
- [ ] `/legal/terms`, `/legal/privacy`, `/legal/cookies`,
      `/legal/disclaimer`, `/legal/accessibility` — **light touch only.**
      These are legal text; keep them conservative and readable. Spacing/
      typography consistency, nothing more.
- [ ] `src/components/rental-inquiry-form.tsx` — the multi-step request
      form. Apply the same density/confidence treatment as the booking
      card got, without changing its validation/submission logic.
- [ ] `src/components/dialog.tsx` / `rental-request-dialog.tsx` — modal
      shell polish, if it doesn't already match the rest.
- [ ] Final pass: grep all touched files for raw hex values (should be
      none) and reread the whole diff once for anything that reads like
      a new claim or invented data point.

## Skipped / needs a human call

(Add entries here if you skip something because it's ambiguous or risky
— don't guess. Dave will read this in the morning.)
