---
name: frontend-design
description: RYDA frontend design system — tokens, components, anti-patterns. Apply to any UI work in ryda-web.
---

# RYDA frontend design system

This is the design language for ryda-web. Every UI decision should ladder back to one of these tokens or patterns. Don't invent new colors, spacing values, or component shapes; if you need one that doesn't exist here, propose adding it to the system before using it.

The brand position is **quiet luxury** — Aman, Loro Piana, Tom Ford website-era restraint. NOT SaaS-startup, NOT tech-bro, NOT crypto. The product (fractional luxury vehicle co-ownership) sells on trust + exclusivity, not on feature density.

## Color tokens

All colors are CSS custom properties defined in `src/app/globals.css` and surfaced as Tailwind utilities via `@theme inline`. **Never use hex values directly in components — always reference tokens.** Both light and dark modes have full token sets; the same token name resolves to mode-appropriate values automatically.

| Token | Tailwind | Light | Dark | Use for |
|---|---|---|---|---|
| `cream` | `bg-cream` | `#F4F1EC` | `#0E0E10` | Page background |
| `cream-2` | `bg-cream-2` | `#E9E4D8` | `#161618` | Section variant (subtle band separating areas) |
| `surface` | `bg-surface` | `#FFFFFF` | `#1B1B1F` | Card backgrounds |
| `surface-2` | `bg-surface-2` | `#F0EBDF` | `#232328` | Card hover / elevated surface |
| `ink` | `text-ink` | `#0E0E10` | `#F4F1EC` | Primary text |
| `ink-soft` | `text-ink-soft` | `#3A3A3D` | `#B8B2A8` | Secondary text |
| `mute` | `text-mute` / `border-mute` | `#6A655F` | `#9A9590` | Tertiary text + hairline borders. Bumped to AA. |
| `rule` | `border-rule` | `#D8D3C8` | `#2A2A2E` | Hairline dividers (1px) |
| `red` | `text-red` / `bg-red` | `#C03030` | `#DC4747` | Brand action (CTAs, important indicators) |
| `red-deep` | `bg-red-deep` | `#9C2424` | `#ED5C5C` | Hover state for `red` |
| `gold` | `text-gold` | `#A88340` | `#C9A66B` | Premium tier accent (Black tier only — sparing use) |
| `marine` | `text-marine` | `#1E5DAB` | `#4A90D9` | Boats vertical accent (vs cars=red) |
| `success` | `bg-success` | `#2E8459` | `#5FB58A` | Positive economic indicators (rental net positive, etc.) |

**Rules:**
- **No raw hex** anywhere in component code. If you need a color that's not in the table, raise it; don't invent.
- **Don't mix vertical accents** — cars context uses `red`, boats context uses `marine`. They never appear in the same component cluster.
- **Gold is rare** — only on Black-tier membership UI, premium document watermarks, Founder badge. Overusing it cheapens it.
- **AA contrast minimum** — every color combo passes WCAG AA. Don't introduce a new combo without checking.

## Typography

Two fonts, loaded via `next/font` and mapped to CSS variables in globals.css:

| Family | CSS var | Tailwind | Use for |
|---|---|---|---|
| Fraunces | `--font-fraunces` | `font-display` | Headings, prices, anything that needs to feel editorial |
| Inter | `--font-inter` | `font-sans` (default) | Body, UI labels, navigation |

Sizes — use Tailwind's default scale, no custom tracking. Common patterns visible in the codebase:

- **Card titles**: `font-display text-xl text-ink leading-tight`
- **Prices**: `font-display text-2xl text-ink tabular-nums` (always tabular for numerals)
- **Section headers**: `font-display text-3xl md:text-4xl text-ink`
- **Body**: `text-sm text-ink-soft leading-relaxed`
- **Caption / metadata**: `text-xs uppercase tracking-[0.16em] text-mute`
- **Button labels**: `text-sm font-medium`

**Do not introduce new font families.** If you need a stylistic break, use weight/size/letter-spacing within Fraunces or Inter.

## Spacing

Tailwind default spacing scale (4px base, so `p-4` = 16px, `gap-6` = 24px, etc.). The codebase consistently uses these intervals:

- **Section vertical padding**: `py-16 md:py-24` (64–96px)
- **Card padding**: `p-5` (20px)
- **Grid gaps**: `gap-6` (24px) for card grids, `gap-3` (12px) for inline element groups
- **Stack within cards**: `mt-3` between info clusters, `mt-4` for new sections within the card

**Don't use arbitrary values like `mt-[27px]`** unless aligning to a non-grid element (icon, image). Stick to the scale.

## Border radius

| Tailwind | Use for |
|---|---|
| `rounded-full` | Pills, buttons, badges |
| `rounded-2xl` (16px) | Cards, modals, large surfaces |
| `rounded-xl` (12px) | Nested surfaces inside cards (e.g., spec grid) |
| `rounded-lg` (8px) | Form inputs, small surfaces |

**Don't use `rounded-md` or smaller for cards.** It reads cheap. Cards always get `rounded-2xl`.

## Component patterns

### Card
```tsx
<div className="rounded-2xl border border-rule bg-surface p-5">
  ...
</div>
```
Hover variant adds `hover:border-ink/40 hover:shadow-lg` (or use framer-motion `whileHover` for spring physics — see `src/components/portfolio-listings.tsx` for the spring values).

### Pill / status badge
```tsx
<span className="rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
  Label
</span>
```

### Primary button
```tsx
<button className="rounded-full bg-red px-5 py-2.5 text-sm font-medium text-cream hover:bg-red-deep">
  Apply for membership
</button>
```

### Secondary button
```tsx
<button className="rounded-full border border-rule bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:border-ink">
  Learn more
</button>
```

### Hairline divider
```tsx
<hr className="my-8 border-rule" />
```

### Section
```tsx
<section className="bg-cream py-16 md:py-24">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    ...
  </div>
</section>
```

## Animation

framer-motion is wired. Two primitives in `src/components/reveal.tsx`:

- `<Reveal>` — single-element scroll-triggered fade-up
- `<RevealStagger>` — grid wrapper, stagger children by 60–80ms

Both respect `prefers-reduced-motion` automatically. Easing is always `cubic-bezier(0.22, 1, 0.36, 1)` (matches the original CSS implementation; visually identical, just GPU-composited now).

Hover springs should be **subtle**: `y: -3, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.18)"`. **No bouncy springs** (damping ≥ 24). **No 3D transforms or rotations** on commerce surfaces. Animation is a polish layer, not a feature.

## What to avoid (anti-patterns)

These read as "AI-generated SaaS template" and should never appear in ryda-web:

- ❌ **Gradient backgrounds** (`bg-gradient-to-r from-purple-500 to-pink-500` and friends). RYDA uses flat surfaces, single accent colors, never multi-color gradients.
- ❌ **Glass / glassmorphism** beyond the existing `bg-cream/95 backdrop-blur` on small badges. No frosted-glass cards or buttons.
- ❌ **Generic SaaS sections** — "Trusted by 10,000+ teams", logo carousels, "Get started in 5 minutes", numbered feature lists with rocket emojis. RYDA's audience reads sophisticated copy, not feature density.
- ❌ **Pricing tables in SaaS shape** — three columns labeled "Starter / Pro / Enterprise" with checkmark grids. RYDA has variable share pricing per vehicle ($10K-$37K for 1/10), not subscription tiers. Show share economics inline with each vehicle, not as a "pricing page."
- ❌ **Icons from Lucide / Heroicons** in primary positions. The brand reads quieter without iconography. Use icons sparingly — utility only (close button, hamburger, arrow).
- ❌ **Dark hero with neon CTA** — that's crypto/AI-startup template. Hero is `bg-cream` (light) or video-driven (current splitter intro).
- ❌ **`hover:scale-105` on everything** — looks juvenile. Use spring `y: -3` for cards, scale only on images inside containers.
- ❌ **"Get started free" / "Try it now"** language — RYDA is a curated waitlist for a 100-member founding cohort. Copy should be selective, not eager.
- ❌ **Stock photos of "diverse team in office"** — every visual is the actual asset (cars, boats) or the actual location (Wynwood garage). No people-in-meetings stock.

## When to add to this skill

When you encounter a real design need that the existing tokens/patterns don't cover:

1. Don't invent a one-off
2. Open a discussion (or, if working solo, document the proposed addition to this file)
3. Add it as a new token + use site

Drift is the enemy of design systems. Discipline now = consistency in 6 months when there are 50 components instead of 15.

## Reference files

- `src/app/globals.css` — token definitions
- `src/app/layout.tsx` — font loading
- `src/components/portfolio-listings.tsx` — canonical card implementation (study this when building any new card)
- `src/components/reveal.tsx` — animation primitives
- `src/components/splitter-intro.tsx` — homepage splitter (the brand's most distinctive element)
