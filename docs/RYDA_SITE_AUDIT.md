# RYDA — Live Site Audit (Pre-Launch)

A two-perspective review of `https://ryda.pro` as a $5-15M Miami HNW
buyer would experience it on first read.

**Reviewer composition:**
- **Claude Sonnet 4.6** — page structure, technical/SEO/a11y review, brand-system
  consistency check via direct HTML inspection
- **OpenAI Codex (gpt-5-codex)** — independent UX/copy/positioning review with
  live web research comparing against Pacaso, mph club, BluStreet, and Curated

Both reviewers worked independently from cold-start prompts with no
shared context.

---

## Executive verdict

**Both reviewers converged on: NEEDS-WORK pre-launch.**

> *"RYDA is not amateur, but it is overbuilt in the wrong direction. The
> site is strongest where it explains legal/economic structure and weakest
> where a $5-15M Miami buyer decides whether the company is real enough
> to wire money."* — Codex

> *"The site reads as intellectually thorough but operationally early.
> Pacaso feels institutional. mph club feels commercially alive. BluStreet
> feels reachable now. Curated feels culturally authoritative. RYDA
> currently feels like a sophisticated product prototype."* — Codex

> *"Structurally the site has correct bones but is bleeding three
> categories of trust: missing third-party operational proof, mixed
> message about launch readiness, and primary CTAs that ask for SaaS-style
> account creation when the buyer wants a phone call."* — Claude

This is fixable in 1-2 weeks of focused work. Specific fixes below.

---

## Where Claude and Codex strongly agreed (high-confidence findings)

### 1. The homepage doesn't lead with the offer

The first thing a Miami HNW buyer sees is "Cars · Boats · Planes" and
"Luxury vehicle access." That communicates *category*. They need to
know in 5 seconds: **"Own 20% of a Ferrari 296 in a Miami LLC,
operated by RYDA. $68K buy-in + $14,160/year. Launching Q3 2026."**

The splitter is visually distinctive and brand-correct, but it's a
navigation device, not a value proposition.

### 2. "Sign up" is the wrong primary CTA for a $68K minimum commitment

Across the homepage, vehicle pages, About, FAQ, and Membership, the
top CTAs are *Sign up*, *Apply now*, and *Create account*. For a
$5-15M-net-worth buyer evaluating a $68K minimum LLC interest, the
right first action is **"Talk to a founder"** or **"Request the
ownership packet."** Account creation comes after qualification,
not before.

mph club uses *"Apply for access"* — psychologically calibrated to
luxury. RYDA's *"Sign up"* is calibrated to SaaS.

### 3. Trust contradiction: "Live · Miami today" vs "Q3 2026 launch"

Codex caught this on the homepage splitter: the Cars column shows
*"Live · Miami today"* while the rest of the site (About, How-It-
Works, /membership) says Miami launches Q3 2026. Either the cars
vertical is operating now (in which case the rest of the site
understates) or it's not (in which case the splitter overstates).
A sophisticated reader will notice this in the first 30 seconds and
downgrade trust accordingly.

### 4. Named third parties are largely missing

Codex flagged this strongest on `/how-it-works`, `/portfolio`, and
the vehicle detail pages. RYDA references "title-and-escrow
partner," "marque specialist," "insurance carrier," "dealer
network," "storage partner" — but never names any of them.

For a buyer wiring $34K, the difference between *"professional ops
partner"* and *"K&L Gates as standing securities counsel, Wells
Fargo escrow, Chubb agreed-value coverage at $XM, ABC Concours
Storage in Wynwood"* is the difference between credible and
hand-wavy.

If partners aren't yet signed: say *"partner pending"* explicitly.
Honest absence beats vague gesture.

### 5. The buy flow is a fintech checkout in luxury context

Both reviewers separately landed on this. The 5-step Review →
Verify → Documents → Fund → Confirm flow is operationally
sophisticated (Stripe, KYC, escrow, multiple funding paths) — but
asks the buyer to self-serve too much before human trust is earned.

> *"A Miami HNW buyer is more likely to want 'hold my position and
> call me' than 'type your legal name and fund.'"* — Codex

The right pre-launch default is concierge-led: request packet →
founder call → legal review → soft reservation → only then enter
the fully-built buy flow.

### 6. The /membership page competes with mph club on mph club's terms

Core / Blue / Black tiers in a SaaS-pricing-page layout. mph club's
offer is blunt and commercially strong (*$30K for 30 rental days,
$75K for 100 days, 100+ cars, 1,000+ five-star reviews*). RYDA's
membership page looks timid beside that **and** competes with
RYDA's own primary offer (LLC co-ownership at $68K+).

If membership is a buyer-qualification filter, lead with standards.
If it's monetization, it's premature pre-launch.

### 7. The investor page may undermine buyer confidence

The /investors page publicly states "raising $2.5M seed, 20
vehicles + 120 co-owners + $1.2M ARR by Year 3." That's
appropriate for an investor deck; risky on a public page that
prospective buyers will read.

Codex: *"Buyers need 'stable operator'; investors need 'seed-
stage upside.' Do not make the same visitor hold both ideas."*

Either gate the investor page behind an inquiry form (the deck
itself already is gated) or move ARR/cohort/raise figures off
the public surface.

---

## Claude's findings (structural/technical, complementary to Codex)

These were not in Codex's pass and aren't visible from a buyer
walkthrough; they show up in SEO, accessibility audits, and search
indexing.

### 1. Homepage and /signup have no semantic `<h1>`

Verified by direct HTML inspection. The splitter's "RYDA" wordmark
and the Cars/Boats/Planes labels are the largest text on the page
but render as `<p>` tags styled as headings. Same on /signup —
the form has no H1.

**Impact:** Search engines treat the homepage as topically
ambiguous. Screen readers have no anchor for page structure.
WCAG 2.1 AA requires programmatic page structure.

**Fix:** add a visually-hidden `<h1>` per page (e.g., `<h1
className="sr-only">RYDA — fractional luxury vehicle co-ownership
in Miami</h1>`) so the semantic structure exists without changing
the splitter visual design.

### 2. 8 of 10 pages have a duplicate "· RYDA" suffix in `<title>`

Examples from the live HTML:
- `<title>About — RYDA · RYDA</title>`
- `<title>FAQ — RYDA · RYDA</title>`
- `<title>How it works — RYDA · RYDA</title>`
- `<title>Membership — RYDA · RYDA</title>`
- `<title>Apply — RYDA · RYDA</title>`

**Cause:** the per-page `metadata.title` already includes "RYDA",
and the layout-level `metadata.title.template` re-appends "· RYDA".

**Impact:** ugly social-share previews, ugly browser tabs, ugly
search-result titles. Looks like a bug to anyone who notices.

**Fix:** make per-page titles short subjects only ("About", "FAQ",
"Apply") and let the template add "· RYDA" exactly once.

### 3. JSON-LD structured data missing from 5 of 10 key pages

Present on: `/about`, `/how-it-works`, `/cars`, `/boats`,
`/investors`.
Missing on: `/`, `/portfolio`, `/membership`, `/faq`, `/signup`.

**Impact:** Google can't generate rich-snippet results for the
pages most likely to be search-landed (homepage, portfolio, FAQ).

**Fix:** add `Organization` schema sitewide via the root layout,
plus page-specific schemas (`ItemList` for portfolio, `FAQPage`
for /faq, `Product` for vehicle pages).

### 4. Heading hierarchy on `/signup` is non-existent

The signup form has no headings at all — neither H1 nor any H2
section labels. For a regulated-adjacent product collecting
identity-relevant data (name, email, age confirmation, ToS), this
is a screen-reader navigation problem.

**Fix:** add H1 ("Apply for RYDA membership"), H2 sections
("Your details", "Confirm eligibility", "Agreements").

---

## Per-page summary (Codex's findings, lightly compressed)

| Page | 5-sec read | Trust signal | Brand fit | Conversion path | Top issue |
|---|---|---|---|---|---|
| `/` | **Weak** — communicates category, not offer | High visually, low operationally; "Live · Miami today" is a contradiction | Best page on site | "Sign up" too cold for $68K commitment | No flagship economics above the fold; missing founder face |
| `/how-it-works` | **Strong** | **Best trust page on site** — exit doctrine, K-1, transfer | Drifts into SaaS-explainer density | Educates well, doesn't close — needs section-end CTAs | Named third parties missing |
| `/portfolio` | Strong | Medium — fleet looks pre-launch | Marketplace/SaaS register | Good — vehicle cards lead to listings | No acquisition status (sourced? secured? optioned?) |
| `/portfolio/[symbol]` (vehicle detail) | Strong | **Strongest buyer-decision surface** — PPI, accident disclosure, market embed, founder call CTA | Mixed — best phrases are direct ("Read before you wire"), worst are dashboard-y | Mobile/desktop CTA inconsistency: "Schedule a call" vs "Reserve shares" | Real documents needed visible (sample OA preview, not just "request packet") |
| `/portfolio/[symbol]/buy` | Functionally clear, wrong temperature | Operationally sophisticated | **Pure SaaS/fintech — weak** | Too obvious. Self-serve checkout when buyer wants conversation | Needs "book call before funding" pause |
| `/about` | Good | Medium-high — founder bios specific and credible | One of the better copy pages | Good | Missing physical Miami presence, advisors, counsel, photos that feel real |
| `/membership` | Clear, **strategically questionable** | Mixed — pricing clear but cheapens $68K LLC offer | **Weakest brand-register page** | Pushes account creation before relationship | Reframe as standards filter, not subscription tier |
| `/faq` | Strong | **Strong content** — securities, transfer, insurance, total-loss answers | Utilitarian (acceptable for FAQ) | Good — book consultation | Hard objections missing ("What if RYDA fails?", "Who holds title?", "Can creditors reach the vehicle?") |
| `/signup` | Clear but low-luxury | Basic | **Weak — SaaS app pattern** | Clear | Needs phone-first / founder-led option as primary; password creation secondary |
| `/investors` | Clear | **Risky** — public startup metrics may undermine buyer confidence | More startup than luxury house | Clear — request deck | Either gate or move ARR figures off public surface |
| `/boats` | Clear | Lower than cars — placeholder imagery noticeable | Templated from cars (acceptable if labeled "in development") | Clear | Huge content gaps — captain credentials, marina partners, hurricane plan, charter legality |

---

## Where Claude and Codex slightly diverged

- **On the homepage splitter as a design choice.** Claude's frontend-design
  skill explicitly endorses the splitter as the brand's most distinctive
  signature. Codex called it "weak for a first-time buyer" because it
  forces the user to choose a vertical instead of an offer. **Both are
  right.** The splitter is visually correct and the offer is not on it.
  The fix isn't to kill the splitter — it's to add an offer-led band
  *below* the splitter (which the editorial second screen already does;
  Codex's pass didn't fully see that section, suggesting it doesn't
  read above-the-fold weight even when present).

- **On the buy flow's depth.** Claude's prior pass concluded "the buy
  flow is mature, skip workstream A." Codex agreed it's operationally
  sophisticated but called the *temperature* wrong — too SaaS-y for
  the moment in the buyer's journey. **Codex is right.** The flow
  shouldn't be rebuilt; the *entry point* into the flow should be
  reframed. Today: vehicle page → "Reserve shares" → buy flow.
  Better: vehicle page → "Request the packet" → founder call →
  reservation hold → buy flow. The flow stays as-is for cohort 2+;
  cohort 1 goes through the concierge pre-step.

- **On RYDA's positioning sentence.** Both reviewers independently
  proposed slightly different "this is what RYDA actually is" lines.
  Codex's: *"asset-backed, legally structured, professionally operated
  co-ownership for people who are too rational to solo-own and too
  proud to rent."* Claude's prior framing: *"the way real Americans
  co-own real supercars."* The Codex line is sharper for investors,
  the Claude line is sharper for marketing. Either works on the
  homepage. **Pick one and use it everywhere.**

---

## Top 5 fixes THIS WEEK (cross-reviewer consensus)

Ranked by leverage. All five are achievable in 5-10 hours total.

### 1. Fix the "Live · Miami today" trust contradiction

Replace with "**Founding cohort open**" or "**Miami launch · Q3 2026**"
on the splitter Cars column. Stop saying "live" if operations launch
later. **Effort: 5 minutes.** This is a single-line change in
`src/app/page.tsx`.

### 2. Add a flagship offer band above the editorial second screen

Single sentence + 3 numbers + 1 button. Example:

> **The Ferrari 296 GTB. Co-owned. Miami. Q3 2026.**
>
> $34K per share · ~32 days/year · Year-2 planned exit
>
> [ Request the ownership packet ]

Position it between the splitter and the editorial founder pull-quote.
That's the answer to the 5-second test. **Effort: 1-2 hours.**

### 3. Replace "Sign up" with "Talk to a founder" / "Request the packet" as the primary CTA pre-launch

On homepage, vehicle pages, About, FAQ, and Membership. Account
creation moves to secondary. The buy flow stays as-is for buyers who
arrive there qualified — but the **path into the buy flow** becomes
concierge-led for the founding cohort. **Effort: 2-3 hours** across
the affected pages.

### 4. Fix the duplicate "· RYDA" titles + add semantic H1s on homepage and /signup

Two technical fixes, mechanical, ~1 hour total. Improves SEO + a11y
+ social-share previews + browser-tab readability. No design impact.

### 5. Reframe `/membership` (delete tier mechanics OR reposition as filter)

Either:
- **(A)** Move Core/Blue/Black tiers out of the public site until
  post-launch (they compete with the LLC offer for buyer attention),
  OR
- **(B)** Reframe the page as "Membership standards" — what it takes
  to qualify, not what it costs

Codex's read: *"the page looks timid beside mph club's $30K-for-30-
days commercial offer."* Both fixes are valid; pick one. **Effort:
2-3 hours.**

---

## Top 5 fixes BEFORE LAUNCH (different list)

These can wait 4-6 weeks but must be done before the first wire is
accepted.

### 1. Add real third-party operational proof everywhere money is discussed

Named insurance carrier, named title/escrow partner, named PPI
provider, named storage facility, named legal counsel. If signed:
name them. If pending: explicitly say "partner pending" rather
than implying finality. This is the single biggest unblock for
trust at the wire moment.

### 2. Add real human proof on /about and the homepage

Founder video (90 seconds, Ryan + Stefano on camera). Phone number.
By-appointment Miami address. Member/advisor quotes (once the first
cohort signs). Partner testimonials. Event photos. Actual vehicle
sourcing evidence (the candidate Ferrari with VIN, dealer name).

### 3. Turn vehicle pages into true buy-decision pages

Acquisition status (sourced / under PPI / secured / optioned).
Carfax/Autocheck status. Warranty status visible. Deductible
schedule. Damage procedure. Sample usage calendar. Exact handover
process.

### 4. Separate buyer and investor narratives

Public investor claims should not undermine buyer confidence. Move
ARR / cohort-size / raise-amount figures off the public `/investors`
surface; keep them in the gated PDF only. The public page becomes
"Inquire about the deck" — that's it.

### 5. Make the conversion default concierge-led

Public flow: Request packet → founder call → legal review → soft
reservation → KYC/docs/funding. The fully-built buy flow exists
for buyers who arrive there qualified, but it's no longer the
primary surface for cohort 1.

---

## What RYDA already does better than incumbents (per Codex)

These are the strengths Codex saw on direct comparison with
Pacaso, mph club, BluStreet, and Curated.

1. **Economic clarity.** RYDA explains buy-in, annual ops, exit,
   depreciation, days, miles, transfer, and LLC structure with a
   precision rental incumbents don't approach. mph club sells
   access; BluStreet sells convenience. RYDA explains the math.

2. **Legal structure clarity.** Member-managed LLC framework, 75%
   supermajority voting, no order book, K-1 not 1099-B framing,
   12-month minimum hold, 3% transfer fee — all stronger than any
   incumbent in exotic-car access.

3. **The vehicle-detail page bones.** Cost breakdown, share value
   chart, market comparables, sample documents, founder-call CTA,
   "read before you wire" copy — materially better than most Miami
   rental detail pages (which lean on inventory photos + a phone
   number).

4. **The founder note.** *"Buying outright sits idle. Renting is
   hollow."* is the clearest brand sentence on the site. Build
   around it.

5. **The biggest defensible idea.** Codex's framing is worth
   quoting in full:

   > *"RYDA's biggest defensible idea is not luxury access.
   > Everyone says that. It is **asset-backed, legally structured,
   > professionally operated co-ownership for people who are too
   > rational to solo-own and too proud to rent.** That is the
   > line. The site needs to say it faster, prove it harder, and
   > stop hiding behind platform UX."*

   That's the headline RYDA's homepage should pivot toward.

---

## Methodology + reproducibility

**Claude's pass:** direct fetch of 10 key pages via curl, structured
inspection of titles, meta descriptions, headings, CTAs, JSON-LD
schema. Reproducible via the script in `/tmp/ryda-audit/` (deleted
after audit, but the curl loop is in this commit's terminal history).

**Codex's pass:** invoked via `codex exec` with web-search enabled.
Codex tried to fetch ryda.pro directly (DNS resolution failed from
its sandbox); pivoted to inspecting the local `ryda-web` source
content + live web research on competitor sites. Comparison sources
cited at top of audit.

**Both passes started cold:** no shared context, no shared prompt,
no review of each other's work until synthesis. Strong convergence
on the 7 high-confidence findings increases confidence that they're
real, not artifacts of model preference.

---

## Status

- This audit is `docs/RYDA_SITE_AUDIT.md` + `RYDA_SITE_AUDIT.pdf`
  in the repo.
- The 5 "this week" fixes are ready to implement on request.
- The 5 "before launch" fixes are documented for the team to
  schedule against the strategic-audit recommendation that
  Stefano's outreach should drive product priorities.

This is the third dual-audit Claude + Codex pair on RYDA in this
session. The pattern is repeatable — say "run a dual audit on X"
and we'll run the same methodology against any future surface.
