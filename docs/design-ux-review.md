# RYDA design / UX / redundancy review

Pre-launch deep review at commit b78dd48 + post-audit fixes. Findings
are advisory — none of these changes are applied automatically. Each
item is sized [S]mall, [M]edium, or [L]arge so you can pick what's
worth shipping in which sprint.

---

## Tier 1 — recommended before launch (member-visible)

### 1. Sign-in vs sign-up form visual mismatch [S]
- `/signup/page.tsx:364` — boxed inputs (`rounded-xl border border-rule bg-cream`).
- `/signin/page.tsx:274` — bottom-border underline inputs (`border-0 border-b border-rule bg-transparent`).

A prospect who toggles between them sees two design languages on the
most important conversion surface. Pick one (the bottom-border treatment
reads more luxury; the boxed treatment is more accessible). Apply it
to both pages and any future auth flows.

### 2. /inside still references a non-existent domain [S]
- `inside/page.tsx:74` — fake browser chrome captioned `ryda.pro · /portfolio`.

`ryda.pro` doesn't exist and `/portfolio` is the public sample-data
demo, not a real product surface. To a $150K buyer this reads as a
half-built mock. Replace with the real production domain (after
`ryda.pro` is registered) and a real route like `/account`, OR remove
the chrome entirely and replace with a static brand-card mockup.

### 3. /account/membership ships placeholder tier card [S]
- `account/membership/page.tsx:94-125` — hardcoded "RYDA Core · Free
  tier" regardless of the member's actual tier, with the inline
  comment `placeholder until membership_tiers table lands`.

Members who paid $500–$1,500 will see "Core · Free" on their own
membership page. Either build the `membership_tiers` table now (one
SELECT against `user_profiles.membership_tier` would do) or remove
the card until the table lands.

### 4. Splash splitter says "Coming soon" for boats but boats has shipped [S]
- `app/page.tsx:55` — the boats column carries a "Coming soon" pill.

Boats has 4 fully-priced featured boats, full buy flow, sample
documents, FAQs. The pill contradicts the product. Either:
- swap the boats pill to "Live · Miami Q3 2026" (matches cars), or
- if boats are not yet bookable, gate the boats buy flow + sample
  docs behind the same coming-soon state so labels match reality.

### 5. Off-palette emerald used for "good number" affordances [M]
- 12 instances on `boats/portfolio/[slug]/cost-sheet/page.tsx:162-346`
- 12+ instances on `markets/[symbol]/cost-sheet/page.tsx`
- 4 instances on `inside/page.tsx:94`, `bookings/page.tsx:278`, `share-purchase/[id]/page.tsx:75,80`.

The brand palette is red / marine / ink / cream — Tailwind's default
`emerald-700` for "this is a positive number" reads as a default,
not a designed choice. On the financial-math pages that have to
inspire trust, this is the highest-impact single fix. Map "good number"
to a custom green-500/-600 in the cream palette, OR use ink + a
small "↗" symbol if the chart is the wrong place for color signals.

### 6. "Three doors into RYDA" hero copy duplicated [S]
- `membership/page.tsx:100`
- `boats/membership/page.tsx:106`

Same metaphor on both vertical's membership pages. Boats is a
different product (chartering, 5-member LLC, 3-year hold) and
deserves its own framing.

---

## Tier 2 — quality-of-life polish (consider for first month post-launch)

### Layout / typography
- **216 instances** of `h-9/h-10/h-11/h-12` rounded-full pills across the
  codebase. On `cars/page.tsx` alone, five different combos appear.
  Tokenize `<Btn variant="primary|secondary|ghost" size="sm|md|lg" />`.
- **Membership tier cards use `rounded-none`** (`membership/page.tsx:266`,
  `boats/membership/page.tsx:286`) inside a `rounded-2xl` system —
  visually they read as table cells next to the pricing cards on the
  rest of the site.
- **Footer "Sign up" button** uses square non-rounded ink (`site-footer.tsx:34`)
  while the entire rest of the site uses `rounded-full` pills. One-off.
- **39 different `shadow-{sm,md,lg,xl,2xl}` declarations** — settle on
  2–3 tiers ("subtle / lifted / floating") and replace.
- **Nine consecutive `bg-cream-2` sections** on `about/page.tsx`
  (lines 58, 143, 207) creates a rhythmless wall of beige.

### Copy / brand voice
- **Brand-voice mismatch**: home/cars/boats hero copy is poetic
  ("The sea, where the horizon opens"); `about/page.tsx:24` reads
  startup-vision ("We're building the supercar market that should
  already exist"); `/inside` hero feels app-marketing. Pick one
  register (luxury-considered) and rewrite the off-tone surfaces.
- **"Schedule a 30-minute call"** repeated verbatim 8 times across
  the site (`about/page.tsx:136`, `boats/about/page.tsx:148`, 4×
  in boats/, `markets/[symbol]/page.tsx:431`, `member-protection/
  page.tsx:246`). Pull into `<ScheduleCallCard />` so copy + visual
  treatment evolve in one place.
- **"Become a member" + "Membership is limited to verified
  individuals 28 years or older"** repeated 7 times across the site.
  Extract into `<MemberCTAFooter />`.
- **Date-bound copy "Apply by July 2026 to lock early-member
  pricing"** hardcoded in `membership/page.tsx:217` and
  `boats/membership/page.tsx:232`. Move to a single config so it
  flips without code when the date passes.

### Information architecture
- **/markets vs /portfolio confusion**: `/markets` is the public car
  portfolio (live), `/boats/portfolio` is the boats version, `/portfolio`
  is the public sample-data dashboard, `/account/membership` is the
  real member-shares view. Members and prospects both stumble on this.
  Suggested rename: `/markets` → `/portfolio/cars`, `/boats/portfolio`
  → `/portfolio/boats`, current orphaned `/portfolio` → delete or
  redirect to `/portfolio/cars`.
- **/messages empty state in nav**: the `/messages` route says "Ships
  at launch" (`messages/page.tsx:37`) but is still in nav for any
  signed-in member. Either remove from nav until messaging ships
  or only render when the messaging service flag is true.

### Misc bug-adjacent
- **Stale "/transport" ref**: removed by audit. Check for similar
  routes referenced in copy that don't exist (`/host-your-car` is
  real but several pages reference it as if it ships post-launch).
- `account-nav` and `site-header` have parallel auth-aware
  patterns; consider unifying.
- `account/profile/page.tsx:249` has an empty `<Field label="" hint="" />`
  spacer — reads as "(blank label)" in screen readers.

---

## Tier 3 — polish

### Accessibility
- **Status pill spans** throughout markets pages (`markets/page.tsx:299-307`,
  `cars/page.tsx`) lack semantic role. "Live" / "Coming Q3 2027" / "Sold out"
  is conveyed only by background color. Add `role="status"` or text prefixes.
- **Bottom-border underline inputs** on `/signin` (`signin/page.tsx:274`)
  drop the focus ring (`focus:ring-0`); low-vision users can't see
  focus state.
- **Hardcoded `min-w-[640px]/[760px]/[840px]` tables** at
  `how-it-works/page.tsx:252`, `member-protection/page.tsx:85`, etc.
  force horizontal scroll on mobile but the wrappers don't announce
  scrollability to screen readers.
- **Footer `· ` separators** at `site-footer.tsx:43-49` are literal
  text dividers; mark them `aria-hidden="true"`.
- **Color-only "Included / Not included"** cells at
  `membership/page.tsx:351-364`. Already has an `aria-label` (good)
  — verify boats version has parity.

### Component opportunities
- `order-panel.tsx`, `planes-mission-profile-form.tsx`,
  `inline-email-capture.tsx`, `sticky-toc.tsx` each have 1 usage —
  verify they earn their keep or inline.

---

## Redundancy / consolidation candidates

The biggest single wins. Each of these is a `*-cars` and `*-boats`
copy of the same component with minor diffs (variable names, accent
color, a few text tokens). Every checkout/UX improvement is currently
2× the work and prone to drift.

| File pair | Diff | LOC saved | Effort |
|-----------|------|-----------|--------|
| `buy-flow.tsx` (1,269L) + `boat-buy-flow.tsx` (1,245L) | 24-line diff | ~1,200 | L |
| `compare-calculator.tsx` (777L) + `boat-compare-calculator.tsx` (776L) | 1-line import diff | ~770 | M |
| `cost-breakdown.tsx` (271L) + `boat-cost-breakdown.tsx` (279L) | variable names + accent | ~270 | M |
| `share-value-chart.tsx` (270L) + `boat-share-value-chart.tsx` (260L) | unit labels + depreciation constants | ~260 | M |
| `markets-listings.tsx` + `boats-listings.tsx` + `rental-listings.tsx` | identical filter-select pattern | ~30 | S |
| `membership/page.tsx` (389L) + `boats/membership/page.tsx` (404L) | content tokens | ~380 | M |
| `how-it-works/page.tsx` (833L) + `boats/how-it-works/page.tsx` (502L) | trimmed cars | ~500 | L |
| `faq/page.tsx` + `boats/faq/page.tsx` | same template, content swap | ~150 | S |
| `sample-documents/page.tsx` + `boats/sample-documents/page.tsx` | same template | ~150 | S |
| `about/page.tsx` + `boats/about/page.tsx` | same template | ~280 | M |

**Recommended pattern** for the big three (buy-flow, compare-calculator,
cost-breakdown):

```tsx
// shared/buy-flow/index.tsx
type Asset = Vehicle | Boat;
interface BuyFlowConfig {
  asset: Asset;
  accent: 'red' | 'marine';
  cancelHref: string;
  // ... shared shape that abstracts car vs boat vocabulary
}
export function BuyFlow({ config }: { config: BuyFlowConfig }) { /* ... */ }

// app/markets/[symbol]/buy/page.tsx
<BuyFlow config={configFromVehicle(vehicle, shares)} />

// app/boats/portfolio/[slug]/buy/page.tsx
<BuyFlow config={configFromBoat(boat, shares)} />
```

Saves the ~3,500-LOC twin maintenance burden going forward. Single
biggest-ROI change in this whole report.

### Dead routes / code

- **`/founding-members`** — redirect-only stub to `/signup` with no
  inbound links. Audit removed; safe to delete entirely if `gh search`
  confirms no external press references.
- **`/inside`** — sample-data preview, footer-only entry. Decide:
  ship to canonical `/preview` with real data or delete.
- **`order-panel.tsx`** + **`sticky-toc.tsx`** — single-usage components,
  inline candidates.

---

## What's working

- The splitter intro is genuinely novel and brand-defining. Don't
  change it.
- The palette tokens (`red` / `marine` / `cream` / `ink`) and
  editorial typography combine into a real luxury identity.
- The 5-step ownership story (review / verify / docs / fund / confirm)
  is well-paced and respects the buyer's time.
- The KYC + e-sig + Stripe-checkout integration is invisible to the
  member, which is the right outcome.
- The cost-breakdown math (despite the emerald-color quibble) is
  clear and trustworthy. Keep showing the buy-in, acquisition fee,
  and annual contribution as separate line items.

---

## Highest-ROI shortlist

If you ship just three things from this report:

1. **Consolidate the 8 cars/boats component twins** into shared
   parametrized components. Saves ~3,500 LOC, halves all future
   checkout/UX work.
2. **Fix the `/portfolio` post-sign-in landing route** — already
   applied (audit fixed default to `/account`); verify in QA.
3. **Reconcile the splash splitter "Coming soon" pills** with what's
   actually shipped (boats vs cars).

Do those three and the site goes from "credible-but-rough" to
"ready for a Miami launch press cycle."
