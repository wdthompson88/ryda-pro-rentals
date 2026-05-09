# RYDA — Comprehensive Design Overview & Improvement Plan

A design-side companion to `RYDA_STRATEGIC_AUDIT.md`. Where the
strategic audit asks "is this a real business?", this overview asks
"does the site present the business well?" Both have to be true for
RYDA to convert its first cohort.

Tools used:
- `ui-ux-pro-max` (newly installed, queried via search.py)
- 21st.dev Magic MCP (component inspiration, generation)
- `frontend-design` skill (RYDA's existing brand tokens)
- Codex (independent review pass on the proposed diff)

---

## Headline finding

**The site looks correct. It does not yet sell.** The visual
identity is on point — quiet luxury, Aman/Loro Piana register,
disciplined token system, Fraunces + Inter, hairline borders,
no SaaS gradients. That's the right foundation. But there are
four specific places where the design is doing its job and the
content is not — and they're the four places that decide whether
the site converts the first cohort.

---

## What ui-ux-pro-max recommends vs what RYDA does

I queried the design-intelligence database for "luxury fractional
ownership marketplace, premium HNW audience, automotive vertical."
The recommendations:

| Field | ui-ux-pro-max says | RYDA actually does | Verdict |
|---|---|---|---|
| Style | Liquid Glass + Glassmorphism | Flat surfaces, single accent | **RYDA wins** |
| Color | Black + Gold (#FFD700) + White | Cream/ink/red, gold sparing | **RYDA wins** |
| Auto vertical | Motion-Driven + 3D & Hyperrealism | Subtle motion, no 3D | **RYDA wins** |
| Hospitality | Liquid Glass + Minimalism | Pure minimalism | **Match** |
| Typography | Cormorant Garamond + Montserrat | Fraunces + Inter | **Match** |

This is a good signal. The mainstream design-intelligence database
defaults toward SaaS-template aesthetics (glassmorphism, gold
accents, 3D hero) — RYDA's quiet-luxury position is *unconventional*
and that's exactly what differentiates it. The /frontend-design skill
in this project already documents this as policy. Don't deviate.

The **universally-applicable UX rules** (independent of style
direction) that ui-ux-pro-max surfaced and that RYDA should adopt:

1. **Typography line-length cap.** Limit body copy to 65-75 chars
   per line (`max-w-prose` in Tailwind). Currently several editorial
   sections run wider on large screens, which hurts readability.
2. **Line-height 1.5-1.75 for body.** Already mostly applied; spot-
   check a few exception cases.
3. **Body-text contrast 4.5:1 minimum.** Already AA-compliant per
   the frontend-design skill, but `text-mute` on `bg-cream-2` is
   borderline in some places.

---

## Four places content is failing the design

### 1. The pricing comparison is overstated

**Where:** `/how-it-works`, the comparison table and the lifecycle
section. Currently anchors at *"$2,400+/day to rent"*.

**The problem:** Codex's web research surfaced live Miami pricing:
- BluStreet Miami — Ferraris $1.4K-$3K+/day
- AGEMBRAND — 2024 Ferrari 296 GTB at ~$1,900/day
- LUXX Miami — Ferraris $1,185-$4,000/day

The actual market floor is **~$1,200-2,000/day**, not $2,400. A
prospect verifies this in 60 seconds on Google and downgrades RYDA's
credibility on a number they could have stated honestly.

**Fix:** Update to "$1,500-3,000/day" or "from ~$1,500/day at the
Miami market floor." The math still works at honest numbers — and
the credibility win is bigger than the marketing gain from cherry-
picking the high end.

### 2. The "resentment machine" objection is unaddressed

**Where:** `/how-it-works` Booking Model section.

**The problem:** Codex's strongest insight was that *"a Ferrari
unavailable on the wrong Saturday is not a Ferrari product. It is
a resentment machine."* The booking section talks about fairness
in code (peak-period caps, BookingTiersExplainer) but never
addresses the visceral fear: *"what if I want it on the F1 weekend
and someone else got there first?"*

The current copy is from RYDA's perspective ("calendar fairness is
enforced by code"). The buyer's perspective is not addressed.

**Fix:** Add a small "The honest answer about peak periods" callout
in the booking section. Acknowledge the constraint, name the policy
(rotation, lottery for top events, off-peak compensation if
preempted). Buyers trust honesty about constraints far more than
marketing copy that pretends constraints don't exist.

### 3. The competitive landscape is invisible

**Where:** `/how-it-works` Compare section.

**The problem:** The comparison table compares RYDA to abstractions
("Solo ownership", "Daily rental", "Supercar club"). No specific
competitor is named. This reads as if RYDA invented a category.

A sophisticated buyer immediately wonders: *which clubs? Marathon?
Curated? mph? Ark?* The omission registers as either ignorance of
the market or unwillingness to engage. Neither is good for trust.

**Fix:** Name the alternatives in a short comparison footnote.
"Daily rental: $1,200-3,000/day on operators like BluStreet, LUXX,
AGEMBRAND. Membership clubs: ~$30-80K/yr at mph club, Ark Exotics,
Curated Selection. Each is a real option for a different kind of
buyer." Naming them honestly is more persuasive than pretending
they don't exist.

### 4. There's no premium scroll moment

**Where:** Homepage and `/portfolio/[symbol]` pages.

**The problem:** Apple, Aman, Tom Ford website-era — every premium
brand has at least one *moment* of scroll-driven choreography that
makes the site feel inhabited rather than templated. RYDA's
homepage has a beautiful splitter intro and now a quiet editorial
band, but the scroll experience between them is functional, not
cinematic.

A clip-path scroll reveal on a single hero image (cropped to a
slim band, expanding to full-bleed as the user scrolls) is the
canonical luxury-brand pattern. It costs ~50 lines of framer-motion
and adds zero new dependencies — we already have framer-motion.

**Fix:** Add one scroll-reveal moment between the splitter and the
editorial band. Single Ferrari poster, clip-path expanding from
center as the user scrolls 100vh. Subtle, not gimmicky.

---

## Implementation plan

Four changes, in dependency order, all in this single pass:

### Change 1 — Honest pricing
- File: `src/app/how-it-works/page.tsx`
- Edit: Replace "$2,400+/day" references with the honest range
- Estimated diff: ~6 lines

### Change 2 — Peak-period honesty callout
- File: `src/app/how-it-works/page.tsx` Booking section
- Add: Small "Honest answer about peak periods" subsection
  inside the existing Booking section with rotation policy +
  off-peak compensation language
- Estimated diff: ~25 lines

### Change 3 — Name the competition
- File: `src/app/how-it-works/page.tsx` Compare section footnote
- Edit: Add a paragraph after the comparison table naming the
  actual market alternatives at honest prices
- Estimated diff: ~8 lines

### Change 4 — Clip-path scroll-reveal hero moment
- New file: `src/components/scroll-reveal-hero.tsx`
- Pattern: framer-motion useScroll + useTransform on clip-path
  inset, single image expanding from 30%→0% inset over 1× viewport
  scroll. Respects prefers-reduced-motion.
- Wire into: `src/app/page.tsx` between splitter and
  BelowFoldEditorial (one new scroll moment, doesn't disturb
  the existing rhythm)
- Estimated diff: ~80 lines new + ~10 lines wiring

Total: ~130 lines added, ~12 lines edited, 1 new component file.
Zero new dependencies.

---

## What ui-ux-pro-max correctly recommends and we should adopt

These are universal UX best practices the skill flagged. None
conflict with the brand position; all are quiet improvements:

1. **`max-w-prose` on long body paragraphs** that currently run
   the full container width on large screens. The /how-it-works
   exit doctrine paragraphs and rental opt-in lede are the
   biggest offenders.
2. **Tabular numerals on every numeric value** (we mostly do this
   via `tabular-nums` on prices but miss it on percentage-points
   and mileage callouts).
3. **Visible focus rings on every interactive element.** Tailwind's
   default `focus-visible:ring-2 ring-ink/20` would cover this
   without changing the visual identity for sighted users.

These are deferred for a separate sweep — they're worth doing but
don't make the audit's top-4 cut.

---

## What we explicitly chose NOT to do

- **No glassmorphism, no 3D, no gold-accent overlays** — even
  though the design-intelligence database recommends them for
  the luxury vertical. The frontend-design skill exists to
  enforce this anti-pattern list.
- **No Aceternity-style `HeroParallax` 3-row product showcase** —
  Magic MCP returned this as the closest match to "luxury hero";
  it's a SaaS pattern dressed in dark mode. Skipped.
- **No Lenis smooth-scroll library** — it's the canonical premium-
  scroll dependency but adds ~15KB bundle for a marginal feel
  improvement. We already have framer-motion's useScroll.
- **No `next/dynamic` refactor of the splitter** to chase 90+
  mobile Lighthouse — that's deferred until we have real
  production CDN data from Vercel.

---

## Codex review hooks

After implementation, the diff will be passed through `codex
review` for an independent pass before commit. Codex's prior
review of the strategic prompts agreed strongly with my
findings; expect the design-diff review to be more focused on
React/TypeScript correctness, accessibility regressions, and
build-system implications.
