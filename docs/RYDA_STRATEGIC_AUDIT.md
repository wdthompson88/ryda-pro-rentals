# RYDA — Strategic Audit (Pre-Launch, May 2026)

A YC-style critical evaluation applied to RYDA in its current state. Five
prompts originally designed for pre-build evaluation, applied here as an
audit of decisions already made and assumptions already baked in.

Reviewer composition: Claude Sonnet 4.6 + an independent OpenAI Codex pass
on the same prompts (see Appendix A for Codex divergences).

---

## Prompt 1 — Pressure Test

### Core assumption that must be true

**HNW Miami residents who can afford a $34K share + $7K/year in operating
fees would rather co-own a Ferrari with 4 strangers under an LLC than
either rent it 5x/year ($12K total) or buy it outright.** Everything else
in the business — exit math, residual modeling, member-management
overhead, the second-vertical (boats) expansion — assumes this is true.

If the answer is no, RYDA isn't a worse version of Pacaso. RYDA has no
business.

### Three fatal flaws — most dangerous first

**1. The buyer pool isn't economic; it's psychographic, and the
psychographic doesn't match the offering.**

A $34K-share + $7K/yr buyer profile is someone who can put $42K into a
Ferrari but for whom $250K outright is meaningfully tight. That person
exists, but they overlap heavily with the rental segment — not the buyer
segment. People who buy supercars buy them as identity expression and
flex; co-owning isn't the flex. The sweet-spot buyer (rich enough to
afford it, poor enough to need fractionalization) is narrow and not
distinctly Miami-concentrated.

The site's comparison frame ("vs $40-80K/yr to own outright") implicitly
assumes the buyer was going to buy outright and now can't. But the buyer
who would have bought outright is going to buy outright — owning the
title is the entire point of the experience for that buyer. RYDA is
adverse-selecting itself into the "wanted to but couldn't" segment, and
that segment is much smaller than the marketing copy implies.

**2. The 2-share minimum is a regulatory dodge that backfires.**

Two shares per member × 5 members = 10 shares = 1 LLC. The 2-share floor
is almost certainly to keep the LLC member count ≤ 5 and avoid the SEC
"investment contract" trigger that fires around 35+ owners. But it cuts
the addressable market in half: anyone who can afford 1 share but not 2
is excluded. And if the LLC scales to ≥ 6 members per car at any point,
the legal posture changes.

The site treats "2 shares minimum per member" as a policy choice. It
reads to me as a securities-law constraint dressed as a feature. Founders
should be honest about why this floor exists — both to themselves and to
investors.

**3. The 24-month exit doctrine assumes a liquid resale market for
2-year-old supercars at modeled depreciation.**

The site assumes ~10% depreciation over 24 months on a Ferrari 296.
Historical Ferrari 296 depreciation in years 1-3 is closer to 25-35%
unless the car appreciates from supply scarcity (rare for current-gen).
If the actual exit clears at 70% instead of 90%, every member loses ~$10K
on their share — and the entire "real exit at year two" pitch breaks.

There's no Plan B in the public materials for what happens if the modeled
residual is wrong by 20 points on the first 5 LLCs. That's the kind of
miss that ends co-ownership platforms. (Pacaso has the same risk on
homes; they survive because residential real estate appreciates on
average. Supercars do not.)

### Problem validation: vitamin or painkiller?

**Vitamin, dressed up as painkiller.**

The site frames the pain as "supercars are too expensive to own, too
hollow to rent." The painkiller test: does the buyer suffer this
*weekly*? No. They suffer it on weekends a few times a year and most of
them solve it with a $2-3K rental for the weekend. That's not a 7-day-a-
week chronic pain that drives platform adoption — that's an occasional
inconvenience that drives a single Turo booking.

Co-ownership becomes a painkiller for ONE narrow buyer: the person who
wants ~30 days a year of supercar use AND wants the title-holder
emotional ownership (not rental) AND can't or won't put $250K-$1M into a
single car. That's the pitch. It's a narrower wedge than the marketing
implies.

### Founder-market fit

Strong on **finance, capital structuring, and HNW network access**.
Stefano's 30 years at Evercore/BAML/Artio puts him 1 phone call away
from buyers. Dave's IB + PE Services background covers LLC structuring
and capital flow. Ryan's executive search role at Odin Partners means
direct access to the buy-side seat covers — which IS the target
demographic.

Weak on **automotive operations, fleet management, regulatory expertise
specific to fractional personal-property ownership (NOT real estate),
and tech build**. CEO/CTO is one role split across one person who is
neither a tech founder nor an auto-industry operator. The "we run the
ops the way an aviation club runs jets" framing on /about is aspirational
— there is no aviation club operator on the team.

The team can sell this. The team has not yet demonstrated they can
operate it. That gap shows up the day they take their first member's
$34K and their first Ferrari arrives at the garage.

### Brutal verdict

**WEAK — would not fund in current form.**

Not pivot-required. Not strong. Weak. The thesis is reasonable, the
unit economics are plausible, the founders are credible on the
fundraising side. But:

- Zero customers
- Zero LLCs formed
- Zero proof the residual model holds
- Zero proof the 2-share minimum doesn't cap demand
- One launch market (Miami concentration risk)
- A "we have no competition" framing that misses the real enemy
  (high-end Turo + supercar rental clubs that are already operating
  in Miami at scale)

What I'd want to see before funding: 5 LLCs formed and 25+ members
signed and at least 3 confirmed exit dispositions before a Series A
conversation. Right now this is at "convincing landing page, no proof."

---

## Prompt 2 — Validate the Real Problem

### Specific pain

A Miami HNW resident (~$5-15M net worth, not yet ultra-HNW) wants the
*experience* of owning an exotic — pulling into Setai valet in a
Ferrari, weekend run to Key West, the Saturday morning Wynwood coffee
loop in something special. They don't want:

- The $250K-$1M capital outlay
- The carrying cost on an asset they use 30 days/year
- The garage-it-yourself logistics
- The "I rented it" social downgrade

The pain shows up roughly **monthly**, not daily. It peaks during car-
season events (F1 Miami, Art Basel, Spring Break) and declines in
summer. That makes it a **medium-cadence pain**, not a chronic one.

### Early adopter profile (most acute)

**Specific person:** 38-year-old male, Miami Beach or Coral Gables
resident, finance or law professional with ~$8M liquid net worth, owns
1-2 cars currently (one practical, one moderately fast like a Porsche
911 GT3), has rented an exotic 2-3 times in the past 18 months from
Marathon Club / Curated / a high-end Turo host, and was unsatisfied
with the rental experience for one of two reasons: (a) the wrong car
was available, or (b) the host's car had wear they didn't like.

This person is NOT the ultra-HNW buyer who already owns 5 cars. That
buyer has no use for RYDA. RYDA's wedge is the "rich-but-not-Forbes"
buyer who has aspired to a Ferrari for years.

### 5 customer discovery questions (open-ended)

1. Walk me through the last time you wanted to drive an exotic and
   couldn't / didn't. What did you end up doing instead?
2. The last time you rented an exotic, what was the gap between the
   experience you imagined and the experience you got?
3. If you could put $40K into having a specific Ferrari available to
   you ~30 days a year for 2 years, vs $40K into something else,
   what's the something else?
4. When you imagine telling your friends "I co-own a Ferrari with
   four other people," how does that line land — proud, neutral, or
   slightly embarrassing?
5. What's the smallest amount of car-related operational friction
   that would make you cancel the whole thing? (e.g., scheduling
   conflicts, condition disputes, surprise fees)

### Validation criteria (what proves the problem is real)

- **Painkiller signal:** ≥ 30% of qualified prospects we contact
  agree to a 30-minute call within 7 days, AND ≥ 50% of those who
  take the call ask "when can I sign up" unprompted.
- **Vitamin signal:** They take the call out of curiosity but ask no
  follow-up questions about timing, pricing, or process. They
  thank you and never reply.
- **Proof of urgency:** ≥ 3 of the first 25 qualified prospects ask
  to put down a deposit *before* a specific car is available. If
  nobody offers money before there's a car to put it on, the
  problem isn't acute enough.

### Vitamin or painkiller verdict

**Vitamin for most. Painkiller for a narrow wedge.**

The narrow wedge can sustain a 100-member founding cohort if RYDA
finds them. It cannot sustain a 10,000-member rollup. That's a
$10-30M ARR business at maturity, not a $1B platform. Founders
should know this and price the round accordingly.

---

## Prompt 3 — Map the Real Competition

### Current behavior (what they do now)

Miami HNW residents who want supercar access *today* do one or
more of the following, ranked by frequency:

1. **Rent from a high-end Turo host** ($1.5K-$3K/day). Most common.
2. **Rent from Marathon Club / Curated / Pirelli Driving** (annual
   membership ~$30-80K + per-day fees). Second most common.
3. **Borrow a friend's** (free; common in tight HNW circles).
4. **Buy outright and accept the carrying cost** (the wealthier
   subset of the audience).
5. **Don't drive an exotic** (the largest segment by count, but
   not RYDA's TAM).

### Direct competitors

- **Pacaso** — the obvious analog. Has done $1B+ in fractional
  homes. Has not entered cars (probably for good reason — homes
  appreciate, cars don't).
- **DriveShare by Hagerty** — defunct, never reached scale.
  Failure mode worth studying.
- **Carma / RallyRd** — fractional collector cars, structured as
  securities. Not co-ownership; *speculation*. Different market.
- **Curated Selection** (Miami-based exotic membership) — closest
  current competitor in geography. ~$50K/yr for rotating access.
  Different unit, same wallet.

There is no direct competitor doing single-purpose-LLC fractional
of currently-driveable supercars in Miami. The reason is: the
unit economics are tight, the operational lift is high, and the
addressable market is small.

### Indirect competitors

- **DuPont Registry / Bring a Trailer** for outright purchase.
- **Turo Premium / Onsight / Imagine Lifestyles** for daily
  rental at the high end.
- **Jet card programs** (NetJets, FlexJet) that already trained
  this customer to think in fractional terms — *for assets that
  appreciate or hold value*. The car ask is harder.

### The real enemy

**The 911 GT3 already in their garage.**

The single biggest competitive force RYDA faces is not another
co-ownership platform. It's the buyer's own existing car. A 38-
year-old finance bro with a 911 GT3 doesn't *need* a Ferrari — he
needs a different feeling than the one his GT3 gives him. RYDA
has to convince him that 30 days/year in a different car is worth
$42K when he already has the dopamine source in his garage.

The second real enemy is **inertia** — the same person renting
twice a year for $5K total isn't actively unhappy enough to fix
the situation by signing a 24-month commitment.

### Genuine differentiation

Honest differentiation, ranked by defensibility:

1. **The LLC structure is real ownership, not securities.** This
   is legally distinguishable from RallyRd and meaningful to a
   buyer who values "title in my name." It's also the source of
   the 2-share minimum constraint, so it's a double-edged sword.
2. **Single-car LLC vs rotating fleet.** Curated and Marathon
   give you "any of 30 cars"; RYDA gives you "this specific
   Ferrari." The buyer who wants the relationship-with-the-car
   experience has only one option: RYDA. The buyer who wants
   variety has 30 options that aren't RYDA.
3. **Exit doctrine is publicly documented.** Most rental clubs
   have opaque cancellation policies. RYDA's exit-at-year-2 +
   75% supermajority + 3% transfer fee is concrete and
   defensible. If marketed correctly, this is the trust signal
   that closes the deal.

What's NOT differentiated:

- "Premium ops / professional storage / detailing" — every
  serious rental platform does this. Marathon's garage is
  arguably nicer than RYDA will be on day 1.
- "Curated members" — every club says this.
- "No hidden fees" — every Pacaso copy of this exists too.

---

## Prompt 4 — First 10 Customers

### Where the first 10 are right now

Specific. Not "Miami HNW." Specific:

1. **The Setai Miami Beach members club** (residences and hotel
   ownership). 38-50yo finance professionals, ~$10M+ liquid,
   already pay for premium experiences.
2. **Coral Gables Country Club + Riviera Country Club** golf
   memberships. Same demo, slightly older.
3. **The Standard Miami / Soho Beach House lobby + pool
   regulars.** Wider net but high-conversion if hit right.
4. **Wynwood garage events at Maus & Hoffman / Curated Selection
   Saturday morning Cars & Coffee.** This is literally the buyer
   pool standing in one place.
5. **Brickell finance LinkedIn — hedge fund analysts at firms
   like Citadel Miami office, Universa Investments, Coatue
   Miami.** Stefano can warm-intro into 5 of these in one week.
6. **Miami Ferrari Owners Club + Lambo Owners Club.** They
   already own one — they're prospects for the SECOND car
   without doubling carrying cost.
7. **The Bal Harbour Shops parking deck Saturday afternoon.**
   Self-selecting demographic.
8. **F1 Miami Paddock Club attendees** (May, just passed —
   collect 2026 attendee list now).
9. **Polo Club Boca / Old Cutler Bay HOA listservs** for the
   Miami-South audience.
10. **Stefano's personal LinkedIn network at Evercore** — 200+
    finance professionals, 20+ in Florida. This is the
    fastest-converting cohort.

### Manual outreach approach

Stefano runs cohort 10. Period. His personal Rolodex closes the
first 5-7 buyers via 1:1 phone calls — no email blasts, no DMs.

For cohorts 8-10, Ryan and Dave do in-person at Saturday morning
Cars & Coffee at Curated Selection's garage. Bring printed
prospectus. Buy coffee. Talk to anyone who pulls up in something
expensive. Don't pitch — listen.

The first 10 must be hand-shook. Anyone who buys via the web
form *first* is the wrong customer. The web form converts
buyers Stefano has already warmed up.

### First message (Stefano's voice, used 1:1)

> "[Name] — Stefano Galli. Quick one. My son Ryan is launching
> something in Miami called RYDA — fractional co-ownership of
> supercars, single-car LLC, 32 days a year, real ownership not
> rental. Q3 launch. We're picking 100 founding members and I
> want you on the list before the public site goes live. 30
> minutes by phone this week if it's a fit?"

That's it. No deck attached. No link. The *only* ask is the
call. Mass-mailable templates would shoot Stefano's signal-to-
noise ratio in the foot.

### Success criteria

The first 10 must:

- Have wired the share-purchase amount within 30 days of their
  first call (not just signed an NDA — wired money).
- Have answered "yes I'd refer a friend" unprompted in the
  first conversation.
- Have asked at least one operational question that proves they
  read the materials (e.g., "what happens if I'm out of town
  during my booked week?").

If 10 buyers wire $42K each = $420K of capital + 10 named
references for the next 90. That's the proof point that unlocks
the institutional Series A pitch.

### Weekly milestone plan

| Week | Goal | Owner |
|------|------|-------|
| 1 | Stefano lists 50 warm-intro candidates from his Rolodex | Stefano |
| 2 | Stefano makes 25 personal phone calls; 10 take meetings | Stefano |
| 3 | 10 meetings happen; 5 wire deposits ($2-5K refundable) | Stefano + Dave |
| 4 | Ryan + Dave attend 3 Saturday morning car events; 5 in-person prospects | Ryan, Dave |
| 5 | 5 in-person prospects → 3 take a follow-up call | Ryan |
| 6 | 3 in-person + 5 from Stefano = 8 confirmed cohort members | All |
| 7 | First 5 wire full share amount; Ferrari 296 sourced and inspected | Dave |
| 8 | Cohort 6-10 close; LLC formed; first car arrives | All |

---

## Prompt 5 — MVP in 2 Weeks

### Reframing the MVP question

The site is built. The marketing materials exist. The "MVP" question
is no longer "what do we build?" — it's **"what's the smallest test
we can run BEFORE forming a single LLC?"**

### The single most important assumption to test

**Will a real, qualified buyer wire a real, refundable deposit on a
real Ferrari they have not yet seen, after a 30-minute phone call?**

If yes → the rest of the business model has a chance.
If no → no amount of polish on the marketing site changes anything.

### Minimum feature set (the test, not the product)

The test is *not* a software feature. It's a sales motion + a real
asset commitment. What we need to run it:

1. **One identified Ferrari 296 GTB** — sourced from a Miami
   dealer with right-of-first-refusal, NOT yet purchased. Need
   specific VIN, photos, mileage, paperwork.
2. **An escrow account** — Wells Fargo or Cross River — that can
   hold a refundable $5K deposit per prospect. Needs a real
   account number to share on the call.
3. **A 1-page reservation agreement** — signed by Stefano,
   countersigned by buyer, holds 1 of 10 share slots in the
   forthcoming LLC. Refundable if LLC doesn't form by [date].
4. **The site stays exactly as-is.** No changes. The site's
   only job is to make Stefano's phone call feel legitimate.

### What gets cut

- All planned features the site doesn't already have:
  - Stripe checkout integration → CUT (manual wire instead)
  - In-app booking calendar → CUT (Calendly + Stefano's
    spreadsheet)
  - Member dashboard polish → CUT (deferred until 1 LLC exists)
  - Boats, planes verticals → CUT (deferred)
  - LA/NY market expansion → CUT (deferred 18 months)
  - Anything autoscale-y → CUT
- Half the marketing site's pages aren't needed for this test
  either — but cost is sunk, leave them.

### Test criteria (behavioral)

- ≥ 5 of Stefano's 25 calls result in a refundable $5K deposit
  wired within 14 days. (Not "agreed to think about it." Not
  "want to see the Ferrari first." Wired.)
- At least 1 of those 5 unprompted asks "can I do 2 shares?"
  (proves the 2-share minimum isn't a deal-breaker for the
  early adopter — critical for Fatal Flaw #2 above).
- ≥ 1 prospect asks to talk to a previously-converted buyer
  before they wire (proves the network-effect / FOMO motion
  is starting to work).

### 2-week launch plan

| Day | Action |
|-----|--------|
| 1 | Open Wells Fargo escrow account in RYDA LLC's name |
| 2 | Identify candidate Ferrari 296 with Miami dealer; lock 30-day right-of-first-refusal |
| 3 | Draft 1-page reservation agreement with counsel |
| 4 | Stefano builds list of 25 warmest contacts |
| 5-6 | Stefano makes 25 calls |
| 7 | Track conversions in spreadsheet, identify follow-ups |
| 8-10 | Follow-up calls + first 3-5 deposits land |
| 11 | Mid-test review: how many wires? what objections? |
| 12-13 | Adjust messaging, send round 2 to top 10 prospects |
| 14 | Decision day: ≥5 wires → form LLC, buy car. < 5 wires → re-pressure-test thesis before spending another dollar |

If the test passes: form the first LLC, buy the Ferrari, deliver
on every promise to those 5 buyers, document everything for
investor decks. If the test fails: stop, regroup, do not raise
institutional capital on a thesis the market just rejected.

---

## TOP 3 THINGS TO DO THIS WEEK

1. **Stefano makes 25 phone calls to his warm Rolodex before
   Friday.** This is the only thing on the list that matters.
   Marketing polish, design improvements, additional pages —
   all of it is downstream of "do five qualified buyers want
   this." Find out this week.

2. **Open the escrow account and lock right-of-first-refusal on
   one specific Ferrari.** The MVP test requires a real asset
   to point at. Without it, the calls are theoretical. The cost
   is a $1-2K dealer hold fee — cheaper than a single week of
   the team's payroll.

3. **Stop building. Genuinely.** The site is good enough. The
   ops aren't built yet because the ops shouldn't be built until
   buyer #1 has wired money. Every hour spent on a sixth round
   of marketing polish is an hour not spent on the actual
   blocking question, which is whether anybody buys.

---

## Appendix A — Codex Independent Pass

The same 5 prompts were run through OpenAI Codex (gpt-5-codex, web-
search enabled) without any context-sharing between the two
reviewers. Strong convergence on most findings. Material
divergences worth attention:

### Where Codex went harder than I did

**Verdict: Codex says PIVOT REQUIRED. I said WEAK.** Codex is
right to be more aggressive. The distinction matters: WEAK reads
as "needs more proof." PIVOT REQUIRED reads as "the next dollar
should not go into building — it should go into selling." Take
Codex's framing as the operating instruction.

**Scheduling as a fatal flaw.** Codex flagged something I
under-weighted: "A Ferrari unavailable on the wrong Saturday is
not a Ferrari product. It is a resentment machine." The 32-days-
per-share entitlement is meaningless if those days don't include
F1 weekend, Art Basel, Spring Break, Memorial Day, etc. The
booking-priority logic on /how-it-works addresses this in code
but doesn't sell it. Members will judge RYDA on whether they got
the car when they wanted it, not on whether the calendar is
fair.

**Sharper articulation of the acute pain.** Codex's formulation:
*"I want the car often enough that renting feels stupid, but not
often enough that owning feels rational."* This is a tighter
problem statement than mine. It also makes clearer how narrow
the wedge is — a buyer in this exact zone is rarer than the
marketing copy assumes.

### Live competitive data Codex surfaced

Codex did web search for current Miami exotic-rental pricing.
Specific operators and current pricing from public listings:

- **BluStreet Miami** — Ferraris/Lamborghinis $1.4K-$3K+/day
- **AGEMBRAND** — 2024 Ferrari 296 GTB at ~$1,900/day
- **LUXX Miami** — Ferraris $1,185-$4,000/day
- **mph club** — exotic membership program, Miami
- **Ark Exotics** — exotic membership program, Miami

Implication: RYDA's site comparison frame ("$2,400+/day Miami
market rate") is at the high end of actual pricing. Real-world
rental clears closer to $1,200-$2,000/day for the equivalent
Ferrari. That tightens the rent-vs-co-own breakeven math
considerably:

- 32 days/yr × $1,500/day rental = $48,000/yr
- 32 days/yr × RYDA = $34K share + $7,080 ops = $42K Year 1,
  then $7,080/yr ongoing (and exit risk against modeled
  residual)

The breakeven holds for ≥ 2 years of usage but is much closer
than the marketing suggests. A buyer doing the math at the lower
rental price might conclude that rental is fine for ~24 days/yr
and only marginal at 32+. **Recommendation: update the site's
comparison numbers to reflect the actual Miami rental floor, not
the ceiling. Honest math beats favorable math when the buyer can
verify in 60 seconds.**

### Where Codex and I agreed (high-confidence findings)

- Painkiller/vitamin: **vitamin** for the broad market,
  painkiller only for a narrow wedge
- The 2-share minimum is a constraint dressed as a feature
- "We have no competition" reading is wrong — Miami has 5+ live
  rental operators and 2+ membership clubs in this exact space
- Real enemy = current behavior (rent on demand, or buy outright,
  or borrow from friends)
- The next milestone is not "more polish" — it's deposit-backed
  demand from 5+ qualified buyers
- The 100-member founding cohort is downstream of the first 10;
  the first 10 are downstream of Stefano's phone calls

### Where Codex's first-message language is better than mine

Codex's discovery-oriented draft is the right tool:

> "Quick question. We're testing whether Miami buyers want
> fractional access to a specific Ferrari instead of renting
> occasionally or owning outright. Not a club, not a rental
> fleet: 10 members per car, asset held in a dedicated LLC,
> roughly 32 drive days/year. Before we form the first LLC, I'm
> speaking with people who have rented, owned, leased, or
> seriously considered a supercar in Miami. Would you be open
> to a 15-minute blunt reaction? I'm especially interested in
> why you would not do it."

The "I'm especially interested in why you would not do it" line
is the discovery move my draft missed. Use Codex's version as
the actual outreach template.

## Appendix B — Notes on this audit's limits

This evaluation is from outside the cap table and outside Miami.
It assumes facts on the public marketing site are accurate
representations of operational reality. Any of the fatal flaws
could be already-mitigated by founder knowledge not visible to a
website reviewer; if so, the mitigation should be on the site,
because investors and customers will hit the same questions.

The strongest contribution this audit can make is to be wrong in
a way the founders can correct before a buyer or an investor
runs into it for them.
