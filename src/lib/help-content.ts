// Help center content. Single source of truth for /help, /help/[category],
// and /help/[category]/[slug]. Articles render from `body` blocks. Keep this
// file pruned and accurate, these pages are public-facing.
//
// ─────────────────────────────────────────────────────────────────────
// RYDA PROVIDES NO VEHICLE SERVICES. Terms §2, the Platform Disclaimer,
// /about, /faq and /trust-and-safety all state in writing that RYDA does
// not own, store, insure, maintain or operate any vehicle on the
// platform. This file is footer-linked and public, so anything here that
// contradicts that makes those statements false.
//
// Do not reintroduce, anywhere in this file:
//   - RYDA-provided insurance, coverage, waivers or policy limits
//   - a RYDA roadside number, a 24/7 line, or "RYDA Service"
//   - replacement vehicles dispatched by RYDA
//   - claims opened, adjusters coordinated or repairs arranged by RYDA
//   - RYDA storage, servicing, detailing, fuelling or inspection
//   - vehicle delivery or prep by RYDA (operators deliver, on their terms)
//   - a card on file, a stored payment method, or a RYDA statement/invoice
//
// The one payment rail is a Stripe Checkout link RYDA emails after the
// operator confirms, created on the OPERATOR's connected account with
// RYDA's commission as a platform fee — see /api/admin/inquiries/[id]/
// payment-link. Never write "RYDA never touches your payment"; the
// honest promise is "no card at request". Operators are never named on
// customer-facing surfaces (D6): "a vetted Miami operator".
//
// Still stale as of the 2026-08-12 false-service pass, deliberately left
// for the co-ownership rewrite: the `shares` and `legal` categories, the
// membership/LLC articles under `getting-started` and `account`, and
// `bookings/fair-use`. Several of those still describe RYDA procuring
// insurance, storage and maintenance for an LLC — fix them when that
// product content is rewritten, not piecemeal.
// ─────────────────────────────────────────────────────────────────────

export type HelpBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "h3"; text: string }
  | { type: "callout"; tone?: "info" | "warn"; text: string };

export type HelpArticle = {
  slug: string;
  q: string;
  summary: string;
  body: HelpBlock[];
};

export type HelpCategory = {
  slug: string;
  icon: string;
  title: string;
  blurb: string;
  articles: HelpArticle[];
};

export const HELP: HelpCategory[] = [
  // ── Getting started ──────────────────────────────────────────────
  {
    slug: "getting-started",
    icon: "→",
    title: "Getting started",
    blurb:
      "New to RYDA. How membership works, what tier to pick, what happens after you apply.",
    articles: [
      {
        slug: "what-is-ryda",
        q: "What is RYDA, in one paragraph?",
        summary:
          "Supercar co-ownership and rentals. Each vehicle is held in a single-purpose, member-managed LLC; up to 5 verified members co-own and manage it together. Members can also rent any car in the fleet by the day.",
        body: [
          {
            type: "p",
            text: "RYDA is a US member-managed supercar co-ownership platform. Each vehicle in the fleet is held in a single-purpose LLC with 10 shares, split across up to 5 members with a 2-share minimum per person. Each share entitles its holder to ~32 days and ~3,200 miles per year (100 mi/day allowance). Usage and cost scale linearly. A 5-share holder gets ~160 days; a 10-share holder is essentially the solo owner with professional ops.",
          },
          {
            type: "p",
            text: "RYDA does not own, store, insure, maintain, or operate any vehicle on the platform. Every car listed for rent is owned and run by an independent Miami operator, and the rental closes on that operator's own contract and their own insurance. RYDA lists the car, passes your request to the operator, and earns a referral commission from the operator when a booking completes.",
          },
          {
            type: "p",
            text: "RYDA also facilitates the LLC paperwork when a member transfers their share to another verified member after the 12-month minimum hold.",
          },
          {
            type: "p",
            text: "It's not a timeshare, not a fund, not an investment product. It's real member-managed co-ownership of a real car.",
          },
        ],
      },
      {
        slug: "vs-timeshare",
        q: "How is co-ownership different from a timeshare?",
        summary:
          "You hold a registered LLC membership interest, not a club point. You can sell, you have voting rights, and the asset is on a balance sheet.",
        body: [
          {
            type: "p",
            text: "A timeshare gives you the right to use a property for a fixed period each year. It's a use-right, not an asset. You can't sell it back to anyone but the operator (often at a steep discount), you have no claim on the underlying property, and the operator holds the strings.",
          },
          {
            type: "p",
            text: "A RYDA share is a registered LLC membership interest in a entity that owns a specific vehicle. You're a partial owner of the actual asset. Three things follow from that:",
          },
          {
            type: "ul",
            items: [
              "If the LLC sells the vehicle, the LLC's proceeds are distributed pro-rata to members per the Operating Agreement.",
              "You can transfer your share to another verified RYDA member after the 12-month minimum hold. RYDA facilitates the LLC paperwork.",
              "You have voting rights on material decisions (sale, modifications, replacement) defined in the Operating Agreement.",
            ],
          },
          {
            type: "p",
            text: "Functionally: timeshares are unsellable use-rights with hidden costs. Co-ownership is real ownership with transparent costs.",
          },
        ],
      },
      {
        slug: "membership-tiers",
        q: "Membership tiers explained: Core, Blue, Black",
        summary:
          "Core is free and lets you browse the fleet. Blue ($500/yr) unlocks co-ownership and rentals. Black ($1,500/yr) adds priority and premium perks.",
        body: [
          { type: "h3", text: "Core, Free" },
          {
            type: "p",
            text: "Free, no commitment. You can browse the fleet, see vehicle data, and read all marketing materials. You cannot claim a co-ownership share, book vehicles, or transfer between members on Core.",
          },
          { type: "h3", text: "Blue, $500/year ($350 early)" },
          {
            type: "p",
            text: "The standard tier for active co-owners. Includes co-ownership shares, member-to-member transfers, member event invitations, and standard member services. Early-100 members lock in $350/year for life.",
          },
          { type: "h3", text: "Black, $1,500/year ($1,000 early)" },
          {
            type: "p",
            text: "For high-utilization members. Adds priority booking during peak season, a dedicated contact, and first-look access on new fleet additions. Early-100 lock in $1,000/year for life.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Most active members start on Blue. You can upgrade to Black at any time and the price difference is prorated.",
          },
        ],
      },
      {
        slug: "accreditation",
        q: "Do I need to be an accredited investor?",
        summary:
          "No. RYDA is a luxury access platform, not an investment platform. Co-ownership is open to anyone who clears KYC verification and the standard membership requirements.",
        body: [
          {
            type: "p",
            text: "No accredited-investor status required. RYDA does not offer investments, co-ownership stakes are not registered securities and are not offered for investment purposes. They're a way to share the cost and use of a real car with a small group of other verified members.",
          },
          { type: "h3", text: "What you do need" },
          {
            type: "ul",
            items: [
              "Be 28 years or older.",
              "Hold a valid US driver's license with a clean recent driving record.",
              "Pass standard KYC (government ID + selfie match via Stripe Identity).",
              "Be willing to be added to the LLC's insurance policy.",
            ],
          },
          { type: "h3", text: "Why the structure works without accreditation" },
          {
            type: "p",
            text: "Each car is held in an LLC that you and the other verified members manage together, up to 5 co-owners per vehicle, with a 2-share minimum per person. RYDA operates the car under a separate management services agreement, but the LLC itself is yours. You're not buying a passive investment product; you're buying the right to use a car you and your co-owners actually own. Because the structure is consumption-first (real ownership, real usage rights, no profit expectation), it falls outside SEC investment-contract classification.",
          },
        ],
      },
      {
        slug: "markets",
        q: "What markets is RYDA in?",
        summary:
          "Miami first (Q3 2026), then Los Angeles (2027), then New York (2027). Members can join from anywhere in the US.",
        body: [
          {
            type: "p",
            text: "RYDA does not own or operate a fleet. It lists cars that independent operators own and run, market by market, and membership is available anywhere in the US.",
          },
          {
            type: "ul",
            items: [
              "Miami, live now. First market because of high HNW density, year-round driving weather, F1 Grand Prix and Art Basel anchors, and no state income tax. Every car on the browse grid today is run by a Miami operator.",
              "Los Angeles, 2027. Second market, focused on the Westside and South Bay.",
              "New York, 2027. Third market, focused on the Tri-state area.",
            ],
          },
          {
            type: "p",
            text: "If you live outside an active market, you can still join (the membership is national) and use vehicles when you travel to one of the operating cities. Members can also join early to lock in early-100 pricing.",
          },
        ],
      },
      {
        slug: "rental-vs-ownership",
        q: "Should I rent or claim a co-ownership share?",
        summary:
          "Rent first to test the experience and the specific vehicle. Claim a share when usage exceeds ~10 days a year and you want priority and a relationship with the car.",
        body: [
          { type: "h3", text: "Rent if any of these apply" },
          {
            type: "ul",
            items: [
              "You drive a supercar fewer than 10 days per year.",
              "You don't want long-term commitment to a specific vehicle.",
              "You're testing whether the platform actually fits your life before committing.",
              "You want to swap between different makes (Ferrari one weekend, McLaren another) instead of holding one.",
            ],
          },
          { type: "h3", text: "Claim a co-ownership share if any of these apply" },
          {
            type: "ul",
            items: [
              "You want 30+ days a year of usage and the rental math no longer pencils.",
              "You want priority access during peak season (F1, Art Basel, summer weekends).",
              "You want real ownership and member governance, not a paid usage right.",
              "You're a car enthusiast who wants the relationship with one specific vehicle.",
            ],
          },
          { type: "h3", text: "Per-day comparison" },
          {
            type: "p",
            text: "On a co-owned Ferrari 296 GTB at $34K per share (1 of 10) with ~32 days entitlement, the effective daily ops cost works out to about $221/day. The rental rate on the same vehicle is $1,500–3,000/day at the Miami market floor. If you'll drive 15+ days a year, co-ownership pays for itself.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Many members rent first, then convert that experience into a co-ownership share on the same vehicle. We credit a portion of recent rental payments toward the buy-in, capped at the most recent 30 days of payments.",
          },
        ],
      },
      {
        slug: "early-member-benefits",
        q: "What do early-100 members get?",
        summary:
          "Locked-for-life membership pricing ($350 Blue / $1,000 Black), early-100 badge, priority on first vehicle launches, member-event access, and faster onboarding for additional shares.",
        body: [
          { type: "h3", text: "Pricing locked for life" },
          {
            type: "p",
            text: "The first 100 members lock in $350/year for Blue tier or $1,000/year for Black tier, for as long as they hold continuous membership. Standard pricing is $500 and $1,500 respectively, so over a 10-year horizon a Black early member saves $5,000.",
          },
          { type: "h3", text: "Priority on launch fleet" },
          {
            type: "p",
            text: "Early-100 members get first-look on every new vehicle that joins the fleet. They see the listing 7 days before it goes public, with priority on share allocation. Particularly valuable for limited-production vehicles where shares move quickly.",
          },
          { type: "h3", text: "Other early benefits" },
          {
            type: "ul",
            items: [
              "Early-100 badge on member directory and event invitations.",
              "Reduced KYC friction (single identity verification carries across multiple co-ownership shares).",
              "Invitation to RYDA's annual early-member dinner.",
              "Direct line to RYDA founders for product feedback during the launch year.",
            ],
          },
          {
            type: "p",
            text: "Early-100 status is non-transferable. If you cancel and re-enroll, you re-enroll at standard pricing.",
          },
        ],
      },
      {
        slug: "share-financing",
        q: "Can I finance my co-ownership buy-in?",
        summary:
          "Yes, through your own personal credit (Marcus, LightStream, SoFi) or a securities-backed line of credit if you have a brokerage account. RYDA itself doesn't lend.",
        body: [
          {
            type: "p",
            text: "RYDA does not finance buy-ins directly. Members usually use one of three personal-credit paths:",
          },
          { type: "h3", text: "Personal unsecured loan" },
          {
            type: "p",
            text: "Many members use unsecured personal loans (Marcus, LightStream, SoFi) to fund a buy-in. Rates are typically 7–14% APR for high-credit borrowers. The LLC share isn't pledged, the loan is just personal credit on your name.",
          },
          { type: "h3", text: "Securities-backed line of credit" },
          {
            type: "p",
            text: "If you have a brokerage account at Schwab, Fidelity, or Morgan Stanley, you may already have access to a securities-backed line of credit (against your stocks/bonds, not against the LLC share) at lower rates (5–8% APR). This is often the cheapest path. Talk to your wealth manager.",
          },
          { type: "h3", text: "Specialty leisure-asset finance" },
          {
            type: "p",
            text: "Putnam Leasing and a few specialty lenders offer financing for fractional vehicle interests and luxury memberships. Higher rates (8–15%) but they understand the structure.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Cars depreciate. Co-ownership is a luxury access expense, not an investment that's expected to appreciate. Don't borrow more than you'd be comfortable spending, your buy-in funds a depreciating consumption product, like a country-club membership or a jet card.",
          },
        ],
      },
    ],
  },

  // ── Co-ownership ─────────────────────────────────────────────────
  {
    slug: "shares",
    icon: "$",
    title: "Co-ownership",
    blurb:
      "Claiming a co-ownership share, the Operating Agreement, the 12-month minimum hold, member-to-member transfers.",
    articles: [
      {
        slug: "how-to-buy",
        q: "How do I claim a co-ownership share?",
        summary:
          "Pick a vehicle, complete KYC, sign the Operating Agreement and Management Services Agreement, fund your share, you're a co-owner. No accreditation required.",
        body: [
          { type: "h3", text: "1. Pick the vehicle" },
          {
            type: "p",
            text: "Browse the fleet at /portfolio, pick a vehicle and the number of shares you want. Each vehicle is held in a separate LLC. RYDA's default share count is 10 per vehicle.",
          },
          { type: "h3", text: "2. Identity verification (KYC)" },
          {
            type: "p",
            text: "We verify identity through Stripe Identity. Government ID upload, selfie match, and a clean recent driving record check. Typically takes 5–10 minutes. Required to be added to the LLC's insurance policy.",
          },
          { type: "h3", text: "3. Documents" },
          {
            type: "p",
            text: "Two documents to sign electronically. The LLC Operating Agreement (governs how you and your co-owners run the LLC together, voting, fair-use, transfers, dissolution) and the Management Services Agreement (the contract between the LLC and RYDA covering operations, insurance, storage, scheduling, maintenance). Both are sent via secure e-signature.",
          },
          { type: "h3", text: "4. Funding" },
          {
            type: "p",
            text: "Wire or ACH your buy-in into the LLC's escrow account. RYDA holds funds in escrow until all signatures are collected, then releases to the LLC and your share is officially recorded in the LLC's member register.",
          },
          { type: "h3", text: "5. Onboarding" },
          {
            type: "p",
            text: "First booking can be scheduled the day funds clear. We schedule a 30-minute walkthrough on the vehicle (controls, etiquette, condition baseline) before your first drive.",
          },
          {
            type: "callout",
            tone: "info",
            text: "No accredited-investor status required. RYDA is a luxury access platform, not an investment platform. Co-ownership stakes are not registered securities and are not offered for investment purposes.",
          },
        ],
      },
      {
        slug: "documents",
        q: "What documents will I sign?",
        summary:
          "Operating Agreement (governs how you and your co-owners run the LLC) + Management Services Agreement (the LLC's contract with RYDA for operations). Both via e-signature, both reviewed by counsel.",
        body: [
          { type: "h3", text: "Operating Agreement" },
          {
            type: "p",
            text: "The Operating Agreement governs the LLC. The LLC is member-managed, meaning you and your co-owners hold authority over material decisions. Covers: voting thresholds (typically 75% supermajority for sale, replacement, modifications), fair-use rules during peak and off-season, what happens if a co-owner stops paying, how the vehicle gets sold or replaced, transfer mechanics, and dispute resolution. Standard length: 30–40 pages. We provide a 2-page plain-English summary alongside the full document.",
          },
          { type: "h3", text: "Management Services Agreement (MSA)" },
          {
            type: "p",
            text: "The MSA is between the LLC and RYDA. It defines the services RYDA provides, storage, insurance procurement, scheduling, maintenance, member services, and the all-in annual management fee charged to the LLC (~7–9% of vehicle value, covering RYDA's service component plus pass-through costs). RYDA is a service provider engaged by the LLC's members, not a manager of the LLC itself. The MSA can be renewed or terminated by member vote per the Operating Agreement.",
          },
          { type: "h3", text: "Annual documents" },
          {
            type: "p",
            text: "Each year you'll receive an updated certificate of insurance for the vehicle, an annual condition and service report (mileage, maintenance, inspections), an updated insurance valuation (used for the LLC's policy renewal), and an annual statement summarizing your contributions, fees paid, and usage.",
          },
          {
            type: "callout",
            tone: "info",
            text: "All documents are stored in your member dashboard and re-downloadable any time. We retain originals indefinitely.",
          },
        ],
      },
      {
        slug: "entitlement",
        q: "What does a co-ownership share actually entitle me to?",
        summary:
          "~32 days and up to ~3,200 miles per share per year (100 mi/day allowance; members hold 2–10 shares each), voting rights on material LLC decisions, and pro-rata participation in the LLC's assets at dissolution.",
        body: [
          { type: "h3", text: "Usage" },
          {
            type: "p",
            text: "Each share entitles you to ~32 days and up to ~3,200 miles of vehicle usage per year (100 mi/day allowance), with the exact entitlement set per vehicle when the LLC is formed. Members hold two shares or more, usage scales linearly (5 shares ≈ 160 days; 10 shares ≈ 320 days, with the rest reserved for service and rental pool). Days are booked on a shared calendar with the other co-owners. Fair-use rules cap consecutive days during peak season.",
          },
          { type: "h3", text: "Membership" },
          {
            type: "p",
            text: "You hold a registered LLC membership interest. The LLC is member-managed, you and your co-owners run it together. If the LLC eventually winds down (e.g., the group decides to sell the car and dissolve), the LLC's remaining assets are distributed pro-rata to members per the Operating Agreement.",
          },
          { type: "h3", text: "Voting" },
          {
            type: "p",
            text: "Material decisions, selling the vehicle, performing modifications, replacing the vehicle, require a vote per the Operating Agreement (typically a 75% supermajority by member interest). Routine maintenance, scheduling, and operations are delegated to RYDA via the Management Services Agreement.",
          },
          { type: "h3", text: "What it does not include" },
          {
            type: "ul",
            items: [
              "Title to the vehicle (the LLC holds title; you hold a member interest in the LLC).",
              "Unilateral decision-making (you share authority with co-owners).",
              "Commercial use of the vehicle.",
            ],
          },
        ],
      },
      {
        slug: "selling",
        q: "Can I transfer my share whenever I want?",
        summary:
          "After a 12-month minimum hold, yes, directly to another verified RYDA member. RYDA facilitates the LLC paperwork. 3% transfer fee.",
        body: [
          {
            type: "p",
            text: "Yes, with two conditions:",
          },
          {
            type: "ul",
            items: [
              "12-month minimum hold from your closing date. This is in the Operating Agreement to keep co-owner groups stable through at least one full year of use.",
              "The new co-owner must be a verified RYDA member who has cleared KYC. Shares can only transfer between RYDA members under the Operating Agreement.",
            ],
          },
          {
            type: "p",
            text: "Once the hold period clears, signal your intent to transfer through your dashboard. RYDA helps you negotiate directly with another interested verified member, there's no public marketplace, no order book, and no auction. You and the new co-owner agree on a price; RYDA handles the LLC paperwork to update the member register and Operating Agreement.",
          },
          { type: "h3", text: "How pricing usually works" },
          {
            type: "p",
            text: "Members typically reference a quarterly condition report and comparable-cost context for the vehicle (auction comparables, current retail offers) as a starting point and negotiate from there. This is not an exit price, a published bid, or a guaranteed transfer value, it's plain market context to help two co-owners agree on a number.",
          },
          {
            type: "p",
            text: "RYDA charges a 3% transfer fee on the agreed price, deducted at settlement. Settlement is typically 1–3 business days once both parties have signed updated documents.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Co-ownership shares are illiquid by design. Cars depreciate, transfer requires another verified member to want your share, and timing isn't guaranteed. Don't claim a share expecting on-demand exit, claim it because you want to drive the car.",
          },
        ],
      },
      {
        slug: "pricing",
        q: "How is a transfer price determined?",
        summary:
          "Two members negotiate directly. RYDA shares each LLC's current insurance agreed value and a condition/comparable-cost summary as context, but co-owners agree on the actual transfer price between themselves.",
        body: [
          {
            type: "p",
            text: "There is no marketplace, no order book, and no auction. Transfers happen by direct negotiation between two verified RYDA members.",
          },
          { type: "h3", text: "What RYDA provides as context" },
          {
            type: "ul",
            items: [
              "A quarterly vehicle condition report and comparable-cost summary (auction comparables on Bring a Trailer, RM Sotheby's, Mecum; current retail offers).",
              "A simple reference number for the share: (current comparable-cost estimate + accrued LLC reserves) ÷ share count.",
              "A summary of any prior transfers on the same vehicle for transparency.",
            ],
          },
          {
            type: "p",
            text: "These are reference numbers only, not exit prices, not published bids, not guaranteed transfer values. Co-owners negotiating a transfer can use them as a starting point or ignore them. There is no automatic matching engine, the transfer happens at whatever price the two members agree to.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Cars depreciate. Reference numbers typically decline over time. Don't claim a share expecting it to hold or grow in value, claim it for the use you'll get from the car.",
          },
        ],
      },
      {
        slug: "transfer-fee",
        q: "What's the 3% transfer fee?",
        summary:
          "A flat 3% of the agreed price on every member-to-member share transfer, paid to RYDA. Covers LLC paperwork, KYC re-verification of the new co-owner, and registry updates.",
        body: [
          {
            type: "p",
            text: "Every member-to-member share transfer that RYDA facilitates carries a 3% fee on the agreed price. It's deducted from seller proceeds at settlement.",
          },
          { type: "h3", text: "What the fee covers" },
          {
            type: "ul",
            items: [
              "Transfer paperwork and updated Operating Agreement signatures from the new co-owner.",
              "KYC verification and driving record check on the new co-owner.",
              "Updated certificates of insurance and updated LLC member register entry for the new co-owner.",
              "Registry update with the LLC's state registrar.",
              "Onboarding of the new member into the booking calendar with the other co-owners.",
            ],
          },
          {
            type: "p",
            text: "It's competitive with, usually below, comparable structures (jet card transfer fees run 5–10%). The fee is fixed and disclosed in the Operating Agreement and Management Services Agreement.",
          },
        ],
      },
      {
        slug: "gifting-and-inheritance",
        q: "Can I gift a share or pass it to my heirs?",
        summary:
          "Gifts to a verified RYDA member: yes, with a transfer of the membership interest. Inheritance: yes, your share passes to your estate per your will or trust, then to your heirs after they verify.",
        body: [
          { type: "h3", text: "Lifetime gifts" },
          {
            type: "p",
            text: "You can transfer a share to a family member as a gift, but the recipient has to clear RYDA's standard verification (KYC + clean driving record) before the transfer completes. The 3% transfer fee is waived for first-degree family transfers (spouse, children, parents, siblings).",
          },
          { type: "h3", text: "Inheritance and estate transfer" },
          {
            type: "p",
            text: "When a co-owner dies, the share is part of their estate and passes per their will or trust. The estate can either transfer the share to another verified member (transfer fee waived for estate transfers) or hand it to a named heir. Heirs must complete RYDA verification before the share transfers.",
          },
          { type: "h3", text: "If no heir wants it" },
          {
            type: "p",
            text: "The estate can list the share through RYDA for transfer to another verified member. Transfers can take 30–90 days depending on member demand. There's no guaranteed buyer.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Talk to your estate attorney about how to title the share. Many members hold shares through a revocable trust to simplify transfer at death, RYDA accepts trust ownership.",
          },
        ],
      },
      {
        slug: "whole-vs-fractional",
        q: "How does this compare to buying a car outright?",
        summary:
          "You give up exclusive use, but cut your one-time spend ~10×, eliminate operational overhead entirely, and avoid the carrying-cost math of regular ownership. Works for people who'd drive an exotic less than 50–80 days a year.",
        body: [
          { type: "h3", text: "Up-front cost" },
          {
            type: "p",
            text: "A solo Ferrari 296 GTB is $340,000 plus tax (~$365K all-in). A 1/10 share is roughly $34,000. Same vehicle, ten times less up-front cost. Either way, the car depreciates, co-ownership just lets you split the depreciation with the rest of the LLC's members.",
          },
          { type: "h3", text: "Annual carrying cost" },
          {
            type: "ul",
            items: [
              "Solo: $40-80K+/year, depending on the car (insurance, storage, maintenance, depreciation reserve, taxes/registration).",
              "Co-owned (Ferrari 296 example): ~$7,080/year per share, all-in. Covers your share of insurance, storage, scheduled maintenance, LLC reserves, and RYDA's service fee. Other vehicles vary, see the order panel on each listing.",
            ],
          },
          { type: "h3", text: "What you trade away" },
          {
            type: "p",
            text: "Three things: exclusive use of the vehicle (you share with 5–4 other co-owners), unilateral decision-making (modifications and sale require co-owner vote), and the 'always there' factor (the car isn't always physically yours).",
          },
          { type: "h3", text: "What you gain" },
          {
            type: "ul",
            items: [
              "Lower up-front cost and lower annual carry, more access for less commitment.",
              "Operational ease. RYDA handles every layer, insurance renewals, service appointments, storage, registration, claims.",
              "Variety. Some members hold shares in 2–3 different vehicles to vary their experience across the year.",
            ],
          },
          {
            type: "p",
            text: "Bottom line: if you'd drive a solo-owned exotic 60+ days a year and you love the operational responsibility, buy outright. If you'd drive 10–32 days a year and prefer to outsource the rest, share.",
          },
        ],
      },
      {
        slug: "llc-default",
        q: "What if a co-owner stops paying?",
        summary:
          "The Operating Agreement has remedies, typically a 30-day cure period, then forced sale of the delinquent share. RYDA's reserve covers operations during cure so other owners are unaffected.",
        body: [
          { type: "h3", text: "Cure period" },
          {
            type: "p",
            text: "If a co-owner misses a quarterly management fee or a special assessment, the LLC's Operating Agreement triggers a 30-day cure period. The delinquent member receives written notice and has 30 days to make the payment plus a small late fee.",
          },
          { type: "h3", text: "If they don't cure" },
          {
            type: "p",
            text: "The LLC can force transfer of the delinquent share to another verified member at the most recent reference value. Proceeds first cover the unpaid amount, then any LLC-level transaction costs, then the rest goes to the former member. The remaining co-owners aren't on the hook for the unpaid amount, the share itself secures the obligation.",
          },
          { type: "h3", text: "Why it doesn't disrupt operations" },
          {
            type: "p",
            text: "RYDA maintains a vehicle-level operating reserve at the LLC (built into the annual management fee) that covers ongoing operating costs during a delinquency-and-cure cycle. So while the legal process plays out, the vehicle stays insured, stored, and bookable for the other co-owners.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Forced sales are rare. RYDA underwrites every member upfront and the Operating Agreement caps the cumulative exposure of any single non-paying member.",
          },
        ],
      },
      {
        slug: "share-count-changes",
        q: "Can a vehicle's share count change after launch?",
        summary:
          "No, share count is fixed at LLC formation. New shares cannot be added later. Existing co-owners can buy each other out, but the total share count stays the same.",
        body: [
          {
            type: "p",
            text: "When a vehicle's LLC is formed, the share count is set permanently in the Operating Agreement (typically 6, sometimes 8 or 10 for higher-value vehicles). This is by design, letting the LLC add shares later would dilute existing co-owners' usage entitlement.",
          },
          { type: "h3", text: "Why it's fixed" },
          {
            type: "ul",
            items: [
              "Protects existing members from dilution.",
              "Provides predictable usage entitlement (10 shares × 32 days = 320 days/yr; the remaining ~45 days are reserved for service, downtime, and the rental pool).",
              "Keeps the co-owner group small enough to coordinate.",
              "Keeps the LLC's member-managed governance simple and stable.",
            ],
          },
          { type: "h3", text: "Buyouts within the same LLC" },
          {
            type: "p",
            text: "Existing co-owners can transfer between each other at any time. If one member transfers two shares to another member, the total is still 6, just held differently. This is how members consolidate more shares in a vehicle they love.",
          },
        ],
      },
    ],
  },

  // ── Bookings & usage ─────────────────────────────────────────────
  {
    slug: "bookings",
    icon: "◷",
    title: "Bookings & usage",
    blurb:
      "Reserving days, fair-use rules, peak-season caps, cancellations, no-shows.",
    articles: [
      {
        slug: "how-to-book",
        q: "How do I book my time on a vehicle?",
        summary:
          "Open the booking calendar in your dashboard, pick available dates, confirm. Preparation, handover and any delivery are the operator's — RYDA does not prepare, store or deliver vehicles.",
        body: [
          { type: "h3", text: "Where to book" },
          {
            type: "p",
            text: "Bookings happen in your member dashboard under My Cars → [Vehicle] → Calendar. The calendar shows your remaining days for the year, other co-owners' bookings, blackout dates, and the fair-use status for the period.",
          },
          { type: "h3", text: "Booking windows" },
          {
            type: "ul",
            items: [
              "Standard booking: up to 90 days in advance.",
              "Black tier members: up to 180 days in advance.",
              "Peak season (May–September in Miami): a separate weekly draft system applies during the first 30 days of the year. Beyond that, bookings are first-come-first-served.",
            ],
          },
          { type: "h3", text: "Preparation, handover and delivery" },
          {
            type: "p",
            text: "All three belong to the operator who runs the car. RYDA does not wash, fuel, photograph, store, or deliver any vehicle. If you want the car brought to you, say so in the note on your request — most Miami operators deliver and collect across the region, but the delivery window, the minimum rental length and the rate are theirs, and they confirm them when they reply.",
          },
        ],
      },
      {
        slug: "fair-use",
        q: "Fair-use rules during high season",
        summary:
          "Peak season caps consecutive bookings to 7 days per share. Off-season allows up to 14 consecutive days. No member can book two adjacent peak weekends.",
        body: [
          {
            type: "p",
            text: "Fair-use rules exist to prevent any one co-owner from monopolizing peak windows when 5–7 other members want the same days. They apply per share, if you hold two shares, you get double the budget.",
          },
          { type: "h3", text: "Peak season (Miami: May–Sep)" },
          {
            type: "ul",
            items: [
              "7 consecutive days max per share, per booking.",
              "Two peak weekends per share, max, and not adjacent.",
              "F1 Grand Prix weekend: separate lottery among all co-owners.",
            ],
          },
          { type: "h3", text: "Off-season (Oct–Apr)" },
          {
            type: "ul",
            items: [
              "14 consecutive days max per share, per booking.",
              "No weekend cap.",
              "Holidays (Thanksgiving, Christmas, NYE): lottery if multiple co-owners request.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Fair-use rules are formally defined in each LLC's Operating Agreement and can be amended by member vote (75% threshold).",
          },
        ],
      },
      {
        slug: "cancellations",
        q: "Cancellations and refunds",
        summary:
          "Cancellation and refund rights come from the operator's rental agreement, not from RYDA. The operator issues any refund — the charge sits on their Stripe account.",
        body: [
          {
            type: "p",
            text: "RYDA does not set cancellation terms and cannot cancel a rental on your behalf. The rental is a contract between you and the operator, and their rental agreement governs it: the notice period, whether the deposit comes back, and how much of the price does.",
          },
          { type: "h3", text: "Before you've paid" },
          {
            type: "p",
            text: "A request is not a booking. It does not reserve the car and does not hold your dates, so there is nothing to cancel. If your plans change before the operator has confirmed, tell them, or reply to the RYDA email about the request and we'll pass it on.",
          },
          { type: "h3", text: "After you've paid" },
          {
            type: "p",
            text: "The Stripe Checkout link is created on the operator's own Stripe account, so the money is theirs to refund. Ask them in writing, quoting the dates and the amount. RYDA holds the request, the dates, the confirmed price and the charge, and will provide those records and help where it reasonably can — but it cannot order a refund or release a deposit.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Read the operator's cancellation clause before you pay, not after. Terms differ between operators and between cars, and that agreement takes precedence on everything it covers.",
          },
        ],
      },
      {
        slug: "mileage",
        q: "Mileage limits and overages",
        summary:
          "The mileage allowance and the overage rate are the operator's, set in their rental agreement. Where an operator has given us a figure, it's on the listing.",
        body: [
          {
            type: "p",
            text: "RYDA does not set a mileage cap and does not bill anyone for miles. Every allowance you are held to on a rental comes from the operator's rental agreement for the specific car.",
          },
          { type: "h3", text: "What the listing shows" },
          {
            type: "p",
            text: "Where an operator has given RYDA a daily mileage figure, it appears on the listing. Where they haven't, the listing says the operator confirms it rather than showing a number nobody can stand behind.",
          },
          { type: "h3", text: "Overages" },
          {
            type: "p",
            text: "The rate above the allowance, and how it's collected — typically against the security deposit — is set in the operator's agreement. Ask for the number before you sign, especially if you're planning distance.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Photograph the odometer at handover and at return. It is the cheapest way to settle a mileage argument.",
          },
        ],
      },
      {
        slug: "passengers",
        q: "Bringing a passenger or co-driver",
        summary:
          "Passengers are rarely restricted. A second driver has to be added by the operator, on their agreement and their insurance — RYDA cannot add anyone to a policy it does not hold.",
        body: [
          { type: "h3", text: "Passengers" },
          {
            type: "p",
            text: "Riding along is not the same as driving, and operators generally don't restrict who sits in the passenger seat. If there is a limit, it will be written in the rental agreement.",
          },
          { type: "h3", text: "A second driver" },
          {
            type: "p",
            text: "Anyone who takes the wheel has to be named as an authorised driver on the operator's rental agreement and covered by the operator's own policy. RYDA does not hold that policy, cannot add a driver to it, and is not a party to the agreement.",
          },
          {
            type: "p",
            text: "Ask the operator when they confirm your dates. Expect them to want the second driver's licence, and expect their own eligibility bar — age, licence history, proof of insurance — to apply to that person too. Get the addition written onto the agreement rather than agreed over the phone.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Letting an unlisted driver take the wheel breaches the operator's rental agreement and can leave the car uninsured. What follows — the deductible, the damage bill, the deposit — is set in that agreement, and RYDA is not a party to it.",
          },
        ],
      },
      {
        slug: "out-of-state-travel",
        q: "Can I take the car out of state?",
        summary:
          "That's the operator's call, written into their rental agreement. Geographic limits, cross-border rules and any transport are theirs — RYDA holds no policy and arranges no transport.",
        body: [
          {
            type: "p",
            text: "Where a rented car may be driven is set by the operator's rental agreement and by the operator's own insurance. RYDA does not insure any vehicle on the platform, so it cannot tell you what your rental covers. Ask the operator before you book, not after you've crossed a state line.",
          },
          { type: "h3", text: "What to ask" },
          {
            type: "ul",
            items: [
              "Whether the agreement limits driving to Florida, or to a set radius.",
              "Whether there is a daily mileage allowance, and what a long trip does to it.",
              "Whether leaving the state needs notice, and in what form.",
              "Whether the Mexican or Canadian border is permitted at all.",
              "Who to call for a breakdown far from home, and who pays for the tow.",
            ],
          },
          { type: "h3", text: "What RYDA can't do" },
          {
            type: "p",
            text: "RYDA does not arrange enclosed transport, does not escort a drive, and cannot add a rider to a policy it does not hold. If a trip needs any of that, it is arranged with the operator directly.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Get the geographic limit in writing before you go. Driving outside the area the agreement allows is the kind of breach that voids the cover behind the rental, and the bill for that lands on you.",
          },
        ],
      },
      {
        slug: "weather-and-storms",
        q: "What if there's a hurricane during my booking?",
        summary:
          "The operator decides — they own the car and hold the agreement. RYDA does not store vehicles, cannot recall one, and cannot issue a refund.",
        body: [
          {
            type: "p",
            text: "RYDA does not own, store or garage any vehicle on the platform, so there is no RYDA facility to recall a car to and no RYDA policy covering a storm. A named storm during your rental is handled by the operator, under their rental agreement.",
          },
          { type: "h3", text: "What to do" },
          {
            type: "ul",
            items: [
              "Contact the operator as soon as a watch or warning is issued. They are the only party who can agree an early return, a change of dates, or a refund.",
              "Follow their agreement on returning the car early — including where, and by when.",
              "Tell RYDA too. We hold the request, the dates, the confirmed price and the charge, and we'll provide those records and help where we reasonably can.",
            ],
          },
          { type: "h3", text: "Weather damage" },
          {
            type: "p",
            text: "Hail, flood and wind damage run through the operator's own insurance and the damage terms in their agreement. RYDA is not the insurer and cannot tell you what is covered or what the deductible is — ask the operator before you sign.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Renting in hurricane season? Ask what the agreement says about named storms before you pay. Terms differ between operators and between cars.",
          },
        ],
      },
      {
        slug: "airport-and-valet",
        q: "Can I park it at an airport or hotel valet?",
        summary:
          "Parking restrictions come from the operator's rental agreement, not from RYDA. Ask before you book, and photograph the car at every handover.",
        body: [
          {
            type: "p",
            text: "RYDA holds no insurance policy on any car here, so there is no RYDA rule about where one may be left. Overnight parking, airport parking, valet and self-park are governed by the operator's rental agreement — and operators do restrict them.",
          },
          { type: "h3", text: "Ask the operator about" },
          {
            type: "ul",
            items: [
              "Overnight parking, and whether it has to be secured or indoors.",
              "Airport parking, and whether off-airport lots are excluded.",
              "Valet — some agreements treat handing the keys to a third party as an unauthorised driver.",
              "How long the car may be left unattended, and where.",
            ],
          },
          { type: "h3", text: "If something happens in valet" },
          {
            type: "p",
            text: "Photograph the car when you hand it over and again when you get it back. A venue may carry its own garage-keepers cover; beyond that it is between the operator and their insurer, under their agreement. Report the damage to the operator immediately either way.",
          },
        ],
      },
      {
        slug: "lost-keys",
        q: "What if I lose the key fob?",
        summary:
          "Tell the operator immediately — they own the car and hold any spare. RYDA has no keys, no courier, and no card on file to charge.",
        body: [
          { type: "h3", text: "Call the operator first" },
          {
            type: "p",
            text: "They own the car, they hold the spare if there is one, and they are the only party who can get you moving again. RYDA does not hold keys for any vehicle on the platform and cannot dispatch one.",
          },
          { type: "h3", text: "What it costs" },
          {
            type: "p",
            text: "Exotic key fobs are expensive and generally have to be ordered and programmed through the manufacturer's dealer, so a replacement costs time as well as money. Who pays, and how much, is set in the operator's rental agreement — typically taken against the security deposit if there is one.",
          },
          { type: "h3", text: "How you'll be charged" },
          {
            type: "p",
            text: "Not by RYDA. RYDA keeps no card on file. The only charge it ever creates is the one-off Stripe Checkout link for the rental itself, on the operator's own Stripe account. A lost-key charge, like a cleaning fee or a damage bill, is collected by the operator under their agreement.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Photograph the keys with the car at handover, and agree in writing what a replacement costs before you drive away.",
          },
        ],
      },
    ],
  },

  // ── Insurance & claims ───────────────────────────────────────────
  {
    slug: "insurance",
    icon: "⛨",
    title: "Insurance & claims",
    blurb:
      "Whose insurance the rental is on, who handles damage and claims, and what RYDA does not cover.",
    articles: [
      {
        slug: "coverage",
        q: "Who insures the car I rent?",
        summary:
          "The operator. The rental closes on their own agreement and their own policy. RYDA provides no insurance of any kind and does not verify any operator's policy.",
        body: [
          {
            type: "p",
            text: "RYDA is not an insurer and not an insurance broker. Every car listed here belongs to an independent Miami operator, and the rental closes on that operator's own rental agreement and their own policy — the same cover you would get renting from them directly.",
          },
          { type: "h3", text: "What RYDA does not do" },
          {
            type: "ul",
            items: [
              "RYDA does not provide insurance, coverage, waivers, or protection products of any kind.",
              "RYDA does not verify an operator's policy, its limits, or its exclusions.",
              "RYDA is not a party to your rental agreement and cannot answer for a policy it does not hold.",
            ],
          },
          { type: "h3", text: "What to ask the operator, before you sign" },
          {
            type: "ul",
            items: [
              "The liability limit that applies to the car you're renting.",
              "Whether damage to the car itself is covered, and at what deductible.",
              "What the agreement expects from your own insurance, if anything.",
              "Whether they can send you a certificate of insurance.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Eligibility to rent a particular car — minimum age, licence, proof of your own insurance, deposit — is the operator's to set as well, and it differs between operators and between cars.",
          },
        ],
      },
      {
        slug: "deductible",
        q: "What do I pay if the car is damaged?",
        summary:
          "Whatever the operator's rental agreement says. RYDA sets no deductible, holds no policy, and cannot decide who was at fault.",
        body: [
          {
            type: "p",
            text: "Damage responsibility, the deductible and the security deposit are all set in the operator's rental agreement. RYDA is not a party to that agreement and does not set, collect, or waive any of them.",
          },
          { type: "h3", text: "Where the money comes from" },
          {
            type: "p",
            text: "The operator collects it, not RYDA. RYDA keeps no card on file — the only charge it creates is the one-off Stripe Checkout link for the rental itself, on the operator's own Stripe account. A deposit, a damage charge or a deductible is arranged with the operator and sits outside that link.",
          },
          { type: "h3", text: "Before you sign" },
          {
            type: "ul",
            items: [
              "Ask for the deductible in dollars, for the car you are actually renting.",
              "Ask what the security deposit is, when it is taken, and when it comes back.",
              "Photograph the car at handover and at return, from every angle.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "If the operator asks you for a deposit directly, that is theirs to arrange and it sits outside the RYDA payment link — ask them to put the terms in writing.",
          },
        ],
      },
      {
        slug: "file-claim",
        q: "How do I file a claim after an accident?",
        summary:
          "Not with RYDA. People first, then the police report, then the operator — they hold the agreement, the insurance and the claim. Tell RYDA afterwards; we hold the booking records.",
        body: [
          { type: "h3", text: "1. People, then the report" },
          {
            type: "p",
            text: "Medical help first if anyone is hurt, then move out of traffic if it is safe to. Get a police report: the operator's insurer will want it, and so will you.",
          },
          { type: "h3", text: "2. Document the scene" },
          {
            type: "p",
            text: "Photograph the car, the other vehicle, the scene, the plates and every bit of visible damage. Take the other party's name, phone, licence and insurance details, and the police report number.",
          },
          { type: "h3", text: "3. Call the operator" },
          {
            type: "p",
            text: "They are the counterparty on your rental. They hold the rental agreement, the insurance and the deposit, and the claim is filed by them, with their own insurer. RYDA does not open claims, does not coordinate adjusters and does not appoint a repair shop.",
          },
          { type: "h3", text: "4. Then tell RYDA" },
          {
            type: "p",
            text: "Send us the booking and what happened. RYDA holds the request, the dates, the confirmed price and the charge, and will provide those records and help where it reasonably can — but it cannot decide a dispute it is not a party to.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Don't admit fault at the scene, and don't sign anything from the other party's insurer. Let the carriers work it out.",
          },
        ],
      },
      {
        slug: "roadside",
        q: "Is there roadside assistance or a replacement car?",
        summary:
          "Not from RYDA. There is no RYDA roadside number and no replacement-vehicle guarantee. Roadside cover, if the rental has any, comes from the operator's agreement.",
        body: [
          {
            type: "p",
            text: "RYDA does not run a 24/7 line, does not dispatch roadside assistance and does not deliver replacement vehicles. Anything of that kind on your rental exists because the operator provides it, under their own rental agreement.",
          },
          { type: "h3", text: "If the car stops" },
          {
            type: "ul",
            items: [
              "Get somewhere safe, then call the operator. They own the car and are the fastest route to a tow, a fix, or a swap.",
              "Check the rental agreement and the glovebox — some cars carry the manufacturer's own roadside programme.",
              "Tell RYDA afterwards. We hold the booking records and will help where we reasonably can, and a pattern of complaints is grounds for pausing an operator's account.",
            ],
          },
          { type: "h3", text: "A replacement car" },
          {
            type: "p",
            text: "Whether you get one, and how quickly, is the operator's decision under their agreement. RYDA cannot promise a swap on their behalf and holds no fleet to swap from.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Ask before you book if the trip depends on it. A breakdown is a bad moment to discover the agreement never promised a replacement.",
          },
        ],
      },
      {
        slug: "unauthorized-driver",
        q: "What if someone else drives the car?",
        summary:
          "Only drivers named on the operator's rental agreement are covered. Adding one is the operator's decision, not RYDA's, and an unlisted driver can void their insurance.",
        body: [
          {
            type: "p",
            text: "The operator's rental agreement names who is allowed to drive, and the operator's policy covers those people and nobody else. RYDA does not hold that policy, cannot add a driver to it, and is not a party to the agreement.",
          },
          { type: "h3", text: "If an unlisted driver crashes" },
          {
            type: "p",
            text: "The consequences are written into the operator's rental agreement, and they are usually severe: the cover behind the rental can fall away entirely, leaving the damage to the car and any third-party claim with you. Read that section before you hand anyone the keys.",
          },
          { type: "h3", text: "Adding a driver properly" },
          {
            type: "p",
            text: "Ask the operator when they confirm your dates. Expect them to want the second driver's licence and to apply their own eligibility bar — the same one that applied to you. Get the addition written onto the agreement, not agreed over the phone.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "The 'quick drive around the block' moment is the expensive one. On some agreements, handing the keys to a valet counts too — check before you do it.",
          },
        ],
      },
      {
        slug: "voids-coverage",
        q: "What can void the operator's coverage?",
        summary:
          "The operator's rental agreement lists it, and it is theirs to enforce. Track use, racing, off-roading and unauthorised drivers are the usual restrictions.",
        body: [
          {
            type: "p",
            text: "RYDA provides no coverage, so there is nothing on RYDA's side to void. What matters is the operator's own policy and the use restrictions written into their rental agreement — break one of those and the cover behind your rental can disappear.",
          },
          { type: "h3", text: "What operators typically restrict" },
          {
            type: "ul",
            items: [
              "Track use, racing and any timed or competitive event.",
              "Off-roading, and driving on surfaces the agreement excludes.",
              "Additional drivers who aren't named on the agreement.",
              "Driving under the influence, or any use that is illegal.",
              "Commercial use — paid passengers, delivery, paid shoots — without written permission.",
              "Driving outside the geographic area the agreement allows.",
            ],
          },
          {
            type: "p",
            text: "RYDA's Terms name track use, racing, off-roading and unauthorised additional drivers as restrictions the operator sets. The binding version is the agreement you actually sign, and it varies between operators and between cars.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "If you're not sure whether something is allowed, ask the operator in writing before you do it. RYDA cannot give you that answer — it is not the insurer and does not hold the policy.",
          },
        ],
      },
    ],
  },

  // ── Maintenance & care ───────────────────────────────────────────
  {
    slug: "maintenance",
    icon: "⚙",
    title: "Maintenance & care",
    blurb:
      "Who services and stores the cars, what condition to expect at handover, and how to report damage during a rental.",
    articles: [
      {
        slug: "process",
        q: "Who maintains and stores the cars?",
        summary:
          "The operator does. RYDA does not own, store, service, clean or inspect any vehicle on the platform.",
        body: [
          {
            type: "p",
            text: "Every car listed here is owned and run by an independent Miami operator. Servicing, tyres, storage, cleaning and condition are theirs, on their own schedule and at their own cost. RYDA does not touch any of it.",
          },
          { type: "h3", text: "RYDA does not inspect the cars" },
          {
            type: "p",
            text: "Nobody from RYDA puts a car on a lift before it is listed. There is no RYDA condition report and no RYDA service log. Condition is the operator's responsibility, and the handover is where you check it.",
          },
          { type: "h3", text: "What that means at handover" },
          {
            type: "ul",
            items: [
              "Walk the car before you drive it, and photograph anything already marked.",
              "Check tyres, lights and warning messages, and say something before you leave rather than after.",
              "Get the operator's confirmation of any pre-existing damage in writing.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "If a car turns up in a state it shouldn't, tell the operator and tell RYDA. A pattern of complaints is grounds for pausing an operator's account, and while it is paused no new payment link can be created for their cars.",
          },
        ],
      },
      {
        slug: "report-damage",
        q: "How do I report damage during a rental?",
        summary:
          "To the operator, immediately and in writing. RYDA is not a party to the rental and cannot assess, price, charge or waive damage.",
        body: [
          { type: "h3", text: "At handover" },
          {
            type: "p",
            text: "Photograph the car before you drive it — every panel, the wheels, the interior, the fuel or charge level, the odometer — and send the set to the operator so the baseline is agreed by both of you. RYDA does not take condition photos and holds no record of the car's state.",
          },
          { type: "h3", text: "During the rental" },
          {
            type: "p",
            text: "If you cause damage or find it, tell the operator straight away and put it in writing. Prompt disclosure is treated very differently from damage discovered at return — check what your agreement says about the difference.",
          },
          { type: "h3", text: "At return" },
          {
            type: "p",
            text: "Photograph the car again at handback, at the same level of detail. That set, against the one from handover, is what settles an argument about what happened during your rental.",
          },
          {
            type: "callout",
            tone: "info",
            text: "How damage is assessed and charged is the operator's, under their agreement and usually against the security deposit. RYDA holds the request, the dates, the confirmed price and the charge, and will provide those records — but it cannot decide the outcome.",
          },
        ],
      },
      {
        slug: "ev-charging",
        q: "How is fuel or charging handled?",
        summary:
          "The operator's fuel policy governs it, and it lives in their rental agreement. RYDA does not fuel, charge or prepare any vehicle.",
        body: [
          {
            type: "p",
            text: "The level the car reaches you at, the level it has to come back at, and what a shortfall costs are all set in the operator's rental agreement. RYDA does not fuel or charge any vehicle and does not set that policy.",
          },
          { type: "h3", text: "Confirm before you drive away" },
          {
            type: "ul",
            items: [
              "The level the car is handed over at — photographed, and agreed by both of you.",
              "The level it has to be returned at, and the charge if it isn't.",
              "For an EV or plug-in hybrid: whether a cable or adapter is in the car, and which connector it takes.",
            ],
          },
          { type: "h3", text: "Charging or fuelling on the road" },
          {
            type: "p",
            text: "You pay for it unless the operator's agreement says otherwise. Ask whether the car carries a charging account or an adapter rather than assuming it does — and note that not every interstate exit has premium fuel.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Photograph the gauge or the state of charge at handover and at return, with the odometer in the same frame. It settles the argument before it starts.",
          },
        ],
      },
    ],
  },

  // ── Account & billing ────────────────────────────────────────────
  {
    slug: "account",
    icon: "◉",
    title: "Account & billing",
    blurb:
      "How a rental is actually paid, what RYDA stores, taxes, KYC verification.",
    articles: [
      {
        slug: "payment-methods",
        q: "How do I pay, and does RYDA keep my card?",
        summary:
          "There is no card on file. No card at request; once the operator confirms, RYDA emails one Stripe Checkout link, created on the operator's own Stripe account.",
        body: [
          { type: "h3", text: "No card at request" },
          {
            type: "p",
            text: "A request carries your name, your contact details and your dates. It takes no card, it is not a booking, and it does not reserve the car. Nothing is charged until you and the operator have agreed the dates and the price.",
          },
          { type: "h3", text: "One link, once" },
          {
            type: "p",
            text: "After the operator confirms, RYDA emails you a Stripe Checkout link. Stripe collects the card on its own hosted page — card details are never entered on ryda.pro. The charge is created on the operator's own connected Stripe account: the rental price settles to them, and RYDA's referral commission is collected as a platform fee on that same charge. The link is good for 24 hours; if it lapses before you use it, reply to the email and we'll send a fresh one.",
          },
          { type: "h3", text: "What RYDA stores" },
          {
            type: "p",
            text: "Per booking: the amount, the currency, RYDA's commission, a Stripe session reference, and whether the link is pending, paid or expired. No card number, no expiry date, no bank account. There is nothing to add, remove or set as a default at /account/payments.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "RYDA never asks for card details over the phone, and never asks for a wire, a bank transfer or a payment app. A payment request that reaches you before the operator has confirmed, or by any route other than a Stripe Checkout link, did not come from RYDA — send it to us before you pay it.",
          },
        ],
      },
      {
        slug: "billing",
        q: "How am I billed, and where's my receipt?",
        summary:
          "One charge per rental, on the operator's Stripe account. RYDA runs no billing account for renters and issues no statements.",
        body: [
          {
            type: "p",
            text: "There is no RYDA invoice, no monthly statement and no recurring charge for renting a car. A rental is paid once, through a Stripe Checkout link RYDA emails after the operator confirms your dates and your price.",
          },
          { type: "h3", text: "What's on the charge" },
          {
            type: "p",
            text: "The rental price the operator confirmed. RYDA's referral commission is collected as a platform fee on that same charge, out of what the operator receives — it is never added to your side. Requesting through RYDA costs the same as going direct.",
          },
          { type: "h3", text: "Your receipt" },
          {
            type: "p",
            text: "Stripe's own receipt for the charge, plus the two emails RYDA sends you: the payment link with the total on it, and the confirmation once the payment goes through. Those are the records of the rental on your side.",
          },
          { type: "h3", text: "Everything beyond the rental price" },
          {
            type: "p",
            text: "A security deposit, a cleaning fee, a fuel shortfall, a damage charge or a mileage overage is collected by the operator, under their rental agreement and by their own method. None of it appears on the RYDA link, and RYDA cannot charge or refund it.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Refunds are the operator's too — the money sits on their Stripe account, not RYDA's. RYDA will provide the booking records it holds.",
          },
        ],
      },
      {
        slug: "taxes",
        q: "Tax treatment of co-ownership",
        summary:
          "Co-ownership is a personal-use luxury expense, not an income-producing investment. No K-1 in normal cases. Some members receive an informational K-1 if the LLC has incidental rental income.",
        body: [
          {
            type: "callout",
            tone: "warn",
            text: "RYDA does not provide tax advice. Always consult your CPA or tax professional for your specific situation. The information below is educational, not advisory.",
          },
          { type: "h3", text: "Default treatment: personal-use expense" },
          {
            type: "p",
            text: "RYDA co-ownership is structured as a personal-use luxury product. Cars are depreciating consumption goods, like a country-club membership or a jet card. Under IRS rules (Pub. 946 / IRC §280F), members generally cannot deduct depreciation on luxury vehicles used for personal access, because the asset is not in business or income-producing use.",
          },
          { type: "h3", text: "What you'll receive" },
          {
            type: "ul",
            items: [
              "Annual statement summarizing your contributions, fees paid, and usage for the year.",
              "Member directory entries for each LLC you co-own (LLC records).",
              "If applicable, a state sales/use tax statement on your buy-in (varies by state).",
              "If the LLC has incidental rental income (e.g., off-utilized days rented to non-members), an informational K-1 reflecting your pro-rata share. Most members will not have this.",
            ],
          },
          { type: "h3", text: "Sales and use tax" },
          {
            type: "p",
            text: "Vehicle purchases and some inter-member transfers may be subject to state sales/use tax. Florida is 6%; California is ~7.25%; New York varies by county. RYDA collects and remits where required. Your annual statement will reflect anything paid on your behalf.",
          },
          { type: "h3", text: "If you use the vehicle for actual business" },
          {
            type: "p",
            text: "Members who use a co-owned vehicle for genuine business purposes may have different treatment, including potential deductibility of operating costs allocable to business mileage. This requires recordkeeping that goes beyond what RYDA's normal reporting captures. Talk to your CPA before relying on it.",
          },
        ],
      },
      {
        slug: "kyc",
        q: "KYC verification, what we collect and why",
        summary:
          "Government ID and a selfie match, run through Stripe Identity. RYDA never sees the raw documents and keeps only the verification result.",
        body: [
          { type: "h3", text: "What we collect" },
          {
            type: "ul",
            items: [
              "Government-issued photo ID (US driver's license, passport, or state ID).",
              "Selfie image for biometric match against the ID photo.",
              "Name, date of birth and address, as read from the document.",
            ],
          },
          { type: "h3", text: "Why we collect it" },
          {
            type: "p",
            text: "To confirm the person behind a RYDA account is who they say they are. RYDA does not add anyone to an insurance policy and does not run a driving-record check — eligibility to rent a particular car, including licence and driving history, is set and checked by the operator, not by RYDA.",
          },
          { type: "h3", text: "Where it's stored" },
          {
            type: "p",
            text: "Documents are processed by Stripe Identity. RYDA never sees raw ID images. We retain only the verification result, ID type, name, address, and DOB, encrypted, in our member system.",
          },
          { type: "h3", text: "Sharing" },
          {
            type: "p",
            text: "We don't share KYC data with anyone except (a) state or federal regulators when legally required, and (b) the new co-owner's verification flow on a member-to-member share transfer (limited fields, with your consent). RYDA does not pass it to an insurance carrier, because RYDA does not place insurance on any vehicle.",
          },
        ],
      },
      {
        slug: "close",
        q: "Closing my account",
        summary:
          "If you hold no co-ownership shares: instant. If you hold shares: transfer them to other verified members first, then close. Settlement of any open obligations happens at closure.",
        body: [
          { type: "h3", text: "If you hold no shares" },
          {
            type: "p",
            text: "Email hello@ryda.pro or use the close-account flow in your dashboard. We deactivate the account, cancel any auto-renewals, and email a final account statement. Membership data is retained per our privacy policy retention schedule.",
          },
          { type: "h3", text: "If you hold one or more shares" },
          {
            type: "p",
            text: "You'll need to transfer your shares to other verified members before closing. The process:",
          },
          {
            type: "ul",
            items: [
              "Signal your intent to transfer through your dashboard. Typical resolution: 30–90 days depending on vehicle and price.",
              "If no member is interested at your price, you can lower it, hold and wait, or, in some cases, RYDA may help facilitate a transfer to a member on the waitlist.",
            ],
          },
          {
            type: "p",
            text: "Once shares are sold and proceeds settled, we close the account on request. Outstanding management fees, mileage overages, or deductibles are settled from sale proceeds.",
          },
        ],
      },
      {
        slug: "referral-program",
        q: "Is there a referral program?",
        summary:
          "Yes. Refer a member who completes membership: $500 credit. Refer a member who buys a share: $2,500 credit. Early-100 members get 2× referral credits.",
        body: [
          { type: "h3", text: "Tiers" },
          {
            type: "ul",
            items: [
              "$500 credit when your referral becomes a paid member (Blue or Black).",
              "$2,500 credit when your referral closes their first co-ownership share.",
              "Early-100 members earn 2× credits on every successful referral.",
            ],
          },
          { type: "h3", text: "How to refer" },
          {
            type: "p",
            text: "Account → Referral Program in your dashboard. Generate a unique link. Share it however you like, text, email, in person at a member event, social media (within RYDA's brand guidelines). When someone signs up through your link, the credit lands in your account at the qualifying milestone.",
          },
          { type: "h3", text: "What credits can be used for" },
          {
            type: "ul",
            items: [
              "Annual membership renewal.",
              "Mileage overage charges.",
              "Premium delivery upgrades.",
              "Cannot be applied directly to a co-ownership buy-in (referrals are credits against fees and incidentals, not discounts on the buy-in itself).",
            ],
          },
          {
            type: "p",
            text: "Credits don't expire as long as you remain an active member. Cap of $25,000 in unused credits per account.",
          },
        ],
      },
      {
        slug: "early-pricing",
        q: "What's the early-100 pricing lock?",
        summary:
          "First 100 members lock in $350 Blue / $1,000 Black for life. As long as your membership stays active, the price never increases.",
        body: [
          {
            type: "p",
            text: "When RYDA launched, the first 100 members were eligible for permanently locked membership pricing at a $150–500 annual discount. The lock applies to the membership fee only, co-ownership buy-in prices, management fees, and other charges are at standard rates.",
          },
          { type: "h3", text: "Locked rates" },
          {
            type: "ul",
            items: [
              "Early Blue: $350/year, locked. (Standard $500/year.)",
              "Early Black: $1,000/year, locked. (Standard $1,500/year.)",
              "10-year savings vs. standard pricing: $1,500 (Blue) or $5,000 (Black).",
            ],
          },
          { type: "h3", text: "Status terms" },
          {
            type: "ul",
            items: [
              "The lock applies as long as your membership remains active and continuous.",
              "If you cancel and re-enroll later, you re-enroll at standard pricing, early status is non-recoverable.",
              "Status is non-transferable. You can't sell or gift early-100 status to another member.",
              "Status carries through tier changes (e.g., upgrading from Blue to Black keeps your early lock).",
            ],
          },
          {
            type: "p",
            text: "All 100 early shares are allocated by sign-up order, with priority weighting for members in launch markets and members making early share commitments.",
          },
        ],
      },
    ],
  },

  // ── Legal & compliance ───────────────────────────────────────────
  {
    slug: "legal",
    icon: "§",
    title: "Legal & compliance",
    blurb:
      "Operating Agreement, member-managed LLC, co-ownership disclaimer, data privacy.",
    articles: [
      {
        slug: "operating-agreement",
        q: "The Operating Agreement, explained",
        summary:
          "Governs the LLC: decision-making, fair-use, default remedies, sale and replacement rules. We provide a 2-page summary alongside the full document.",
        body: [
          {
            type: "p",
            text: "The Operating Agreement is the LLC's governance document. It defines how decisions get made, what each member owes the others, and how disputes resolve. Each vehicle's LLC has its own Operating Agreement, but they share the same template.",
          },
          { type: "h3", text: "What it covers" },
          {
            type: "ul",
            items: [
              "Member rights and obligations (capital contributions, fair-use rules, voting).",
              "Decision thresholds (75% supermajority for material decisions like sale, modification, replacement).",
              "Default remedies (what happens if a member stops paying or repeatedly causes damage).",
              "Distribution waterfall (how proceeds flow on a sale or total loss).",
              "Exit terms (12-month minimum hold, member-to-member transfer process, no guaranteed buyer or price).",
              "Dispute resolution (mandatory mediation, then arbitration under AAA rules).",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "We always provide a 2-page plain-English summary alongside the full 30–40 page document. Read both before signing. Your accountant or attorney is welcome to review.",
          },
        ],
      },
      {
        slug: "member-managed-llc",
        q: "What is a member-managed LLC, and why does RYDA use it?",
        summary:
          "It's an LLC where the members (the co-owners) hold authority over material decisions, not an outside manager. This is what keeps RYDA a luxury access platform, not an investment product.",
        body: [
          { type: "h3", text: "Two types of LLC governance" },
          {
            type: "p",
            text: "LLCs come in two flavors: manager-managed and member-managed.",
          },
          {
            type: "ul",
            items: [
              "Manager-managed: a designated manager runs the LLC. Members are passive, like shareholders. This is what most fractional investment platforms use, which is what makes those products securities.",
              "Member-managed: the members themselves run the LLC, vote on material decisions, and hire service providers as needed. This is what RYDA uses.",
            ],
          },
          { type: "h3", text: "Why this matters for RYDA" },
          {
            type: "p",
            text: "Member-managed structure is a cornerstone of RYDA's non-investment positioning. The SEC's Howey test for what counts as a security asks whether members expect to profit from the efforts of others. In a member-managed LLC, you and your co-owners ARE the others, you hold authority. RYDA is hired to perform specific services, not to run the LLC. This is structurally similar to how a country club, condo association, or vacation-home co-ownership group operates, none of which are securities.",
          },
          { type: "h3", text: "What you actually decide as a member" },
          {
            type: "ul",
            items: [
              "Whether to sell the vehicle (75% supermajority).",
              "Whether to perform modifications (75% supermajority).",
              "Whether to replace the vehicle on a total loss (75% supermajority).",
              "Whether to renew or terminate the management services agreement with RYDA.",
              "Day-to-day operations are delegated to RYDA, but you can revoke that delegation by member vote.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "This is fundamental to the structure, not a marketing angle. If RYDA were the manager of the LLC making the operational and financial decisions on behalf of passive members, the arrangement would be a security and require Reg D / Reg A registration. Member governance is what keeps the structure consumption-first.",
          },
        ],
      },
      {
        slug: "securities",
        q: "Are RYDA co-ownership stakes securities?",
        summary:
          "No. They are LLC membership interests in a member-managed LLC where you actually co-own and use the vehicle. Not registered securities. Not offered for investment purposes.",
        body: [
          {
            type: "p",
            text: "No. RYDA is a luxury access platform, not an investment platform. Each car is held in a member-managed LLC that you and your co-owners run together. RYDA provides operations under a separate management services agreement. The arrangement is consumption-first, real ownership of a real car, with real usage rights, not a passive investment product.",
          },
          { type: "h3", text: "Why this isn't a security" },
          {
            type: "p",
            text: "Under the SEC's Howey test, an investment contract requires (1) investment of money, (2) in a common enterprise, (3) with expectation of profit, (4) derived from the efforts of others. RYDA's structure breaks the third and fourth prongs:",
          },
          {
            type: "ul",
            items: [
              "Cars depreciate. Co-owners aren't buying with appreciation expectation, the asset is a depreciating consumption good, like a jet card or a country-club membership.",
              "The LLC is member-managed. You and your co-owners hold authority over material decisions (sale, modifications, replacement). RYDA is a hired service provider, not the LLC's decision-maker.",
              "No income distribution. Members get usage; they don't earn yield from the LLC's operations.",
              "Resale is member-to-member transfer of an LLC share, not a public marketplace trade.",
            ],
          },
          { type: "h3", text: "What this means in practice" },
          {
            type: "ul",
            items: [
              "No accredited-investor verification required.",
              "No SEC filings, no Form D, no Reg D 506(c) restrictions.",
              "Open to anyone 28+ who clears KYC and the standard membership requirements.",
              "12-month minimum hold still applies (Operating Agreement), but this is a co-ownership stability rule, not a securities lock-up.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "RYDA is not a broker-dealer, investment adviser, or fund manager. Co-ownership stakes are not offered for investment purposes. If you're considering this primarily for financial return, this is the wrong product, buy a Ferrari outright or look at a registered fund instead.",
          },
        ],
      },
      {
        slug: "privacy",
        q: "Data privacy & member information",
        summary:
          "We collect what's necessary, store it securely, and don't sell to third parties. Full policy at /legal/privacy.",
        body: [
          { type: "h3", text: "What we collect" },
          {
            type: "ul",
            items: [
              "Identity (KYC: name, DOB, ID, address, last-4 SSN).",
              "Driving record (for insurance underwriting).",
              "Accreditation evidence (CPA/attorney letter or equivalent).",
              "Booking and usage history (telemetry from vehicle systems during your bookings).",
              "Payment information (encrypted, processed by Stripe, RYDA doesn't store card numbers).",
            ],
          },
          { type: "h3", text: "Who we share with" },
          {
            type: "ul",
            items: [
              "Insurance carriers (when adding you to a policy).",
              "Federal/state regulators (when legally required).",
              "Other co-owners on your specific LLC (limited: your name, contact, share count, for booking calendar coordination).",
              "Buyer KYC systems on member-to-member share transfers (limited fields, with your consent).",
            ],
          },
          { type: "h3", text: "Who we don't share with" },
          {
            type: "p",
            text: "We don't sell or rent member data. We don't share with advertising networks. We don't share with other RYDA LLCs you're not a member of. The full policy is at /legal/privacy.",
          },
        ],
      },
      {
        slug: "llc-dissolution",
        q: "What if the LLC has to wind down?",
        summary:
          "Triggered by total loss, 75% co-owner vote, or insolvency. Vehicle is sold, debts paid, remaining proceeds distributed pro-rata. RYDA handles all paperwork.",
        body: [
          { type: "h3", text: "When dissolution happens" },
          {
            type: "ul",
            items: [
              "Total loss: vehicle is destroyed and the group doesn't elect to roll proceeds into a replacement.",
              "Voluntary: a 75% co-owner vote elects to wind down (e.g., the group decides to sell the car and end the LLC).",
              "Forced: the LLC becomes insolvent, or the members determine continued operation is no longer viable.",
            ],
          },
          { type: "h3", text: "Sequence of events" },
          {
            type: "p",
            text: "Per the Operating Agreement and the Management Services Agreement, RYDA performs the wind-down operations: marshalling assets (insurance proceeds or sale proceeds), paying outstanding liabilities (carrier balances, vendor invoices, taxes), and distributing the remainder pro-rata to co-owners according to their shares held. The dissolution decision itself is a member vote; RYDA executes it. Distribution happens within 60 days of the decision.",
          },
          { type: "h3", text: "Tax implications" },
          {
            type: "p",
            text: "The dissolution generates a final K-1 for the year, including any gain or loss on the disposition. Co-owners report it on their personal tax returns. As always, talk to your CPA, RYDA does not provide tax advice.",
          },
        ],
      },
      {
        slug: "dispute-resolution",
        q: "How do disagreements between co-owners get resolved?",
        summary:
          "Most disagreements never escalate, RYDA Operations enforces the Operating Agreement consistently. For ones that do: mandatory mediation first, then arbitration under AAA rules.",
        body: [
          { type: "h3", text: "Day-to-day governance" },
          {
            type: "p",
            text: "RYDA, as the LLC's hired service provider, performs most operational decisions (scheduling, service, condition issues) by applying the Operating Agreement consistently. The LLC remains member-managed, co-owners hold authority over material decisions, but day-to-day operations are delegated to RYDA via the Management Services Agreement. RYDA's authority is bounded by what the Operating Agreement and MSA explicitly delegate.",
          },
          { type: "h3", text: "When co-owners disagree" },
          {
            type: "p",
            text: "Material issues, sale, replacement, modification, or expulsion of a delinquent member, require a vote per the OA's threshold (typically 75%). If a vote fails to reach threshold, the status quo continues until a new vote is called.",
          },
          { type: "h3", text: "Formal disputes" },
          {
            type: "p",
            text: "If a member believes the LLC, RYDA, or another member has materially breached the Operating Agreement, the OA requires:",
          },
          {
            type: "ul",
            items: [
              "Written notice with 30 days for cure.",
              "Mandatory mediation (60 days) with a neutral mediator.",
              "If mediation fails: binding arbitration in under AAA rules under AAA rules.",
              "Litigation only as a last resort, with a forum-selection clause.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Disputes are rare. The Operating Agreement is well-drafted, RYDA enforces consistently, and the small-group nature of co-ownership encourages co-owners to talk things out before formal escalation.",
          },
        ],
      },
    ],
  },

  // ── Vehicle use & etiquette ──────────────────────────────────────
  {
    slug: "vehicle-use",
    icon: "★",
    title: "Vehicle use & etiquette",
    blurb:
      "What you can and can't do behind the wheel. Aggressive driving, smoking, pets, road trips, car shows, kids in the cabin.",
    articles: [
      {
        slug: "aggressive-driving",
        q: "Can I track / drift / launch the car?",
        summary:
          "Track use, racing and timed events are excluded by most rental agreements — and it is the operator's agreement that decides, not RYDA.",
        body: [
          {
            type: "p",
            text: "RYDA owns no cars and provides no insurance, so it sets no rules about how one is driven. What binds you is the operator's rental agreement and the policy behind it.",
          },
          { type: "h3", text: "What agreements typically exclude" },
          {
            type: "ul",
            items: [
              "Track days, sanctioned or otherwise, and any timed or competitive event.",
              "Drag racing, drift events, gymkhana and autocross.",
              "Street racing and sustained high-RPM running on public roads.",
              "Off-roading, and any surface the agreement excludes.",
              "Disabling traction control, ABS or stability systems.",
            ],
          },
          { type: "h3", text: "What it costs to get this wrong" },
          {
            type: "p",
            text: "An excluded use is the classic way to lose the cover behind a rental. If the car is damaged while you were doing something the agreement prohibits, the repair bill can land on you in full, on top of whatever that agreement says about breach.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Spirited driving on a public road within the limit is a different thing from a timed event on a closed one. If you want the second, ask the operator in writing first.",
          },
        ],
      },
      {
        slug: "smoking-pets-food",
        q: "Smoking, pets, food, what's allowed?",
        summary:
          "The operator's rental agreement sets it, and the cleaning charges with it. Assume no smoking; ask about pets before you book.",
        body: [
          {
            type: "p",
            text: "RYDA does not clean, prepare or inspect any car here, and it does not set, collect or waive a cleaning charge. Every rule below comes from the operator's rental agreement, so read that — it is what you will actually be held to.",
          },
          { type: "h3", text: "Smoking and vaping" },
          {
            type: "p",
            text: "Assume it is prohibited unless the agreement says otherwise. Smoke odour in an exotic interior is expensive and slow to remove, and rental agreements price it accordingly. The charge, and how it is collected, is the operator's.",
          },
          { type: "h3", text: "Pets" },
          {
            type: "p",
            text: "Ask before you book rather than at handover. Whether an animal is allowed, and in what, is the operator's call, and it varies between operators and between cars.",
          },
          { type: "h3", text: "Food and drink" },
          {
            type: "p",
            text: "Usually tolerated, rarely welcomed — exotic interiors are typically Alcantara or hand-stitched leather, and neither forgives a spill. Cleaning beyond normal use is chargeable under most agreements, generally against the security deposit.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Coffee in the cup holder: fine. Coffee from a paper cup with a flimsy lid going through a corner: an expensive way to find out what the agreement's cleaning clause says.",
          },
        ],
      },
      {
        slug: "road-trips",
        q: "Can I take the car on a road trip?",
        summary:
          "Ask the operator first. Distance runs into their mileage allowance and their geographic limits, both set in the rental agreement.",
        body: [
          {
            type: "p",
            text: "Nothing about a long trip is RYDA's to approve. The mileage allowance, the rate above it, and the area the car may be driven in all come from the operator's rental agreement — and the insurance behind the rental is theirs too.",
          },
          { type: "h3", text: "Settle these before you go" },
          {
            type: "ul",
            items: [
              "The daily mileage allowance, and the per-mile rate above it.",
              "Whether the agreement limits driving to Florida, or to a set radius.",
              "Whether the operator wants notice of a long trip, and in what form.",
              "Who to call for a breakdown far from home, and who pays for the tow.",
            ],
          },
          { type: "h3", text: "Practical" },
          {
            type: "ul",
            items: [
              "Premium fuel is not on every interstate exit. Plan the stops.",
              "Hotels with secured indoor parking beat hoping for a good kerb — and some agreements require secured parking anyway.",
              "Bring a USB-C cable. Modern exotic infotainment is iPhone-default but cables are car-specific.",
              "Photograph the car and the odometer at the start and the end of the trip.",
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "Driving outside the area the agreement permits is a breach, and a breach is how the cover behind the rental disappears. Get the limit in writing.",
          },
        ],
      },
      {
        slug: "car-shows-photoshoots",
        q: "Can I take the car to a car show or photoshoot?",
        summary:
          "Personal photos, generally fine. Anything paid or commercial needs the operator's written permission — commercial use is excluded by most rental agreements.",
        body: [
          { type: "h3", text: "Casual meets and personal photos" },
          {
            type: "p",
            text: "Taking the car to a local meet, a coffee-and-cars Sunday, or photographing it for yourself is not usually restricted. If in doubt, the operator's rental agreement will say.",
          },
          { type: "h3", text: "Paid or commercial work" },
          {
            type: "p",
            text: "Brand shoots, paid social posts, music videos and anything you're compensated for count as commercial use, and commercial use is excluded by most rental agreements unless it has been agreed in writing. Ask the operator, get the permission onto the agreement, and expect them to price it.",
          },
          { type: "h3", text: "What RYDA can't do" },
          {
            type: "p",
            text: "RYDA cannot approve a shoot, add or quote an insurance rider, arrange a prep, or organise transport. It does not own the car, insure it, or hold the agreement — every one of those is the operator's.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Shooting commercially without written permission is the kind of breach that voids the cover behind the rental. If the car is damaged that day, the bill is yours.",
          },
        ],
      },
      {
        slug: "kids-and-baby-seats",
        q: "Can I install a child seat?",
        summary:
          "Usually yes, if the car has anchors and the operator agrees. RYDA does not fit seats, prepare vehicles, or deliver them.",
        body: [
          { type: "h3", text: "Whether the car takes one" },
          {
            type: "p",
            text: "Most modern exotics with rear seats carry ISOFIX/LATCH child-seat anchors; many two-seat configurations cannot take a child seat safely at all, because the airbag arrangement isn't designed for it and there is no rear seat to move to. Ask the operator about the specific car before you book.",
          },
          { type: "h3", text: "Ask the operator first" },
          {
            type: "p",
            text: "Fitting a seat is a change to their car. Confirm it is allowed, and confirm who fits it. RYDA does not fit child seats, does not prepare vehicles and does not deliver them.",
          },
          { type: "h3", text: "If you fit it yourself" },
          {
            type: "ul",
            items: [
              "Put a protector underneath. Buckles and anchor points mark leather and Alcantara.",
              "Don't over-tighten the anchors — exotic interior trim deforms.",
              "Take the seat out before you hand the car back, and photograph the seat area.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Damage from a badly fitted seat is damage under the operator's agreement, chargeable like any other. Photograph the seat area at handover and at return.",
          },
        ],
      },
    ],
  },
];

export function getCategory(slug: string) {
  return HELP.find((c) => c.slug === slug);
}

export function getArticle(categorySlug: string, articleSlug: string) {
  const cat = getCategory(categorySlug);
  if (!cat) return null;
  const article = cat.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return { category: cat, article };
}

// ── Search keywords ────────────────────────────────────────────────
// Synonyms and common phrasings keyed by `${categorySlug}/${articleSlug}`.
// These widen the search net so e.g. someone typing "totaled" finds the
// "What if the car is totaled?" article even if they don't use that exact
// phrase. Append to these when you notice common queries that miss.

const ARTICLE_KEYWORDS: Record<string, string[]> = {
  // Getting started
  "getting-started/what-is-ryda": ["overview", "introduction", "explain", "platform", "model", "company", "what is", "tell me about", "summary", "elevator pitch"],
  "getting-started/vs-timeshare": ["timeshare", "different", "compare", "club", "points", "ownership", "vs timeshare", "is this a timeshare"],
  "getting-started/membership-tiers": ["pricing", "cost", "how much", "tier", "core", "blue", "black", "free", "subscription", "annual fee", "membership cost", "monthly", "yearly", "expensive", "cheap"],
  "getting-started/accreditation": ["accredited", "qualify", "investor", "income requirement", "net worth", "sec", "wealthy", "rich", "qualified", "income", "$200k", "$1m", "net worth"],
  "getting-started/markets": ["where", "miami", "los angeles", "la", "new york", "ny", "city", "location", "available", "operating cities", "states", "regions"],
  "getting-started/rental-vs-ownership": ["rent or buy", "rental vs ownership", "should i rent", "should i buy", "test drive first", "try it out", "before commit", "compare rental"],
  "getting-started/early-member-benefits": ["early", "first 100", "early member", "early member", "what do founders get", "lifetime pricing", "locked rate", "perks"],
  "getting-started/share-financing": ["finance", "loan", "borrow", "financing", "credit", "payment plan", "installments", "monthly payment", "afford"],

  // Shares
  "shares/how-to-buy": ["buy", "purchase", "process", "steps", "onboard", "get started buying", "how do i invest", "buying a share", "first share", "step by step"],
  "shares/documents": ["paperwork", "operating agreement", "subscription", "sign", "contract", "legal docs", "k-1", "kyc docs", "what do i sign", "agreements", "forms"],
  "shares/entitlement": ["what do i get", "rights", "days per year", "miles", "voting", "ownership rights", "what does a share include", "benefits", "perks", "entitled to"],
  "shares/selling": ["sell", "exit", "liquidate", "minimum hold", "lockup", "12 month", "resell", "transfer", "get out", "cash out"],
  "shares/pricing": ["price", "valuation", "worth", "value", "appraisal", "market price", "list price", "fair market", "how priced", "share price"],
  "shares/transfer-fee": ["fee", "commission", "3%", "transfer cost", "selling fee", "platform fee", "what's the fee", "selling cost"],
  "shares/gifting-and-inheritance": ["gift", "give", "transfer to family", "spouse", "inheritance", "heir", "inherit", "estate", "trust", "death", "die", "will", "probate", "pass to children"],
  "shares/whole-vs-fractional": ["versus buying outright", "whole car", "buy outright", "compare to buying", "vs buying", "outright", "solo ownership", "alone"],
  "shares/llc-default": ["default", "stops paying", "doesn't pay", "miss payment", "delinquent", "fail to pay", "what if someone doesn't pay", "deadbeat"],
  "shares/share-count-changes": ["share count", "number of shares", "more shares", "dilution", "issue shares", "add shares", "change shares"],

  // Bookings
  "bookings/how-to-book": ["book", "reserve", "schedule", "calendar", "availability", "drive", "use the car", "make a booking", "reservation"],
  "bookings/fair-use": ["fair use", "peak", "high season", "summer", "consecutive days", "limit", "weekly cap", "cap", "monopolize", "hog", "block out", "f1", "art basel"],
  "bookings/cancellations": ["cancel", "reschedule", "refund", "no show", "cancellation fee", "change date", "back out", "withdraw"],
  "bookings/mileage": ["miles", "mileage", "overage", "kilometers", "limit", "annual miles", "$4 per mile", "exceed", "go over", "extra miles"],
  "bookings/passengers": ["passenger", "co-driver", "secondary driver", "spouse", "partner", "friend", "additional driver", "guests", "wife", "husband", "kids ride"],
  "bookings/out-of-state-travel": ["out of state", "another state", "state line", "border", "mexico", "canada", "long distance", "across country", "interstate", "transit"],
  "bookings/weather-and-storms": ["weather", "rain", "storm", "hurricane", "tornado", "snow", "hail", "ice", "tropical storm", "evacuation", "evacuate", "noaa"],
  "bookings/airport-and-valet": ["airport", "valet", "park at airport", "hotel", "parking lot", "leave the car", "overnight parking", "secured parking"],
  "bookings/lost-keys": ["lost key", "lost fob", "key fob", "missing key", "can't find key", "replacement key", "spare key", "locked out"],

  // Insurance
  "insurance/coverage": ["insurance", "covered", "policy", "liability", "comprehensive", "collision", "what's covered", "limits", "policy limits", "who insures", "certificate of insurance"],
  "insurance/deductible": ["deductible", "out of pocket", "i pay", "fault", "at-fault", "accident cost", "what do i pay", "if i crash"],
  "insurance/file-claim": ["claim", "accident", "crash", "collision", "what to do", "file a claim", "got in an accident", "rear ended", "hit by", "fender bender"],
  "insurance/roadside": ["roadside", "tow", "breakdown", "stuck", "flat tire", "battery", "lockout", "fuel", "won't start", "stranded", "replacement vehicle", "swap", "totaled", "write off", "total loss"],
  "insurance/unauthorized-driver": ["my friend", "let someone drive", "buddy drive", "girlfriend", "boyfriend", "uncle", "valet drive", "anyone else drive", "additional driver", "second driver"],
  "insurance/voids-coverage": ["void coverage", "no coverage", "won't be covered", "what voids", "dui", "drinking", "intoxicated", "impaired", "drugs", "racing"],

  // Maintenance
  "maintenance/process": ["maintenance", "service", "repair", "upkeep", "how is it maintained", "who fixes", "service interval", "storage", "stored", "garage", "inspection", "condition report", "detailing", "clean", "wash", "warranty"],
  "maintenance/report-damage": ["damage", "scratch", "dent", "scuff", "report", "i scratched", "i hit something", "curbed wheel", "rim damage", "paint chip"],
  "maintenance/ev-charging": ["ev", "electric", "charge", "charging", "plug in", "tesla", "supercharger", "battery", "level 2", "hybrid", "phev", "fuel", "gas", "petrol", "fuel policy", "full tank"],

  // Account
  "account/payment-methods": ["pay", "payment", "card", "ach", "bank", "credit card", "wire", "billing method", "amex", "visa", "mastercard", "stripe"],
  "account/billing": ["bill", "invoice", "charged", "statement", "billing cycle", "when am i charged", "monthly", "quarterly", "annual", "receipt", "auto pay"],
  "account/taxes": ["tax", "k-1", "k1", "1099", "depreciation", "deduction", "irs", "cpa", "tax treatment", "income tax", "tax return", "schedule e"],
  "account/kyc": ["kyc", "id verification", "identity", "verify me", "documents required", "passport", "license", "selfie", "persona", "background check"],
  "account/close": ["cancel account", "leave", "quit", "close account", "deactivate", "delete account", "unsubscribe", "i'm done", "not interested"],
  "account/referral-program": ["referral", "refer a friend", "credit", "rewards", "bonus", "earn", "invite code", "promo code", "incentive", "bring a friend"],
  "account/early-pricing": ["early price", "early-member pricing", "locked pricing", "lifetime price", "permanently locked", "founder rate"],

  // Legal
  "legal/operating-agreement": ["operating agreement", "oa", "llc agreement", "governance", "voting", "decision rules", "bylaws"],
  "legal/member-managed-llc": ["member managed", "member-managed", "llc structure", "who manages", "governance", "manager", "decision making", "control", "vote", "voting"],
  "legal/securities": ["securities", "regulated", "stocks", "is this regulated", "sec", "registered", "broker dealer", "investment", "investments", "is this an investment"],
  "legal/privacy": ["privacy", "data", "personal information", "what do you collect", "share my data", "third parties", "gdpr", "ccpa"],
  "legal/llc-dissolution": ["dissolve", "wind down", "shut down", "close llc", "dissolution", "exit", "wind up", "end of life"],
  "legal/dispute-resolution": ["dispute", "disagree", "argument", "fight", "lawsuit", "sue", "arbitration", "mediation", "conflict", "co-owner conflict"],

  // Vehicle use & etiquette
  "vehicle-use/aggressive-driving": ["drift", "drag race", "burnout", "launch", "launch control", "redline", "aggressive", "spirited", "drive fast", "speed", "race"],
  "vehicle-use/smoking-pets-food": ["smoke", "smoking", "vape", "vaping", "weed", "marijuana", "cigarette", "cigar", "pet", "dog", "cat", "food", "drink", "eat"],
  "vehicle-use/road-trips": ["road trip", "long drive", "drive cross country", "weekend trip", "long distance drive", "vacation drive", "tour"],
  "vehicle-use/car-shows-photoshoots": ["car show", "show car", "exhibition", "photoshoot", "photo shoot", "instagram", "social media", "youtube", "video", "filming", "music video", "brand deal"],
  "vehicle-use/kids-and-baby-seats": ["kid", "child", "baby", "infant", "toddler", "child seat", "car seat", "isofix", "latch", "family", "stroller"],
};

// ── Search ─────────────────────────────────────────────────────────

export type SearchResult = {
  category: HelpCategory;
  article: HelpArticle;
  score: number;
};

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "to", "of", "in", "on", "at", "for", "with",
  "and", "or", "but", "if", "then", "than", "as", "by", "from",
  "i", "me", "my", "you", "your", "we", "our", "it", "its",
  "this", "that", "these", "those", "what", "how", "why", "when", "where",
  "can", "should", "would", "could", "will", "shall", "may", "might",
  "ryda", // every article is about RYDA, no signal
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'$%\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function blockToText(b: HelpBlock): string {
  switch (b.type) {
    case "p":
    case "h3":
    case "callout":
      return b.text;
    case "ul":
      return b.items.join(" ");
  }
}

// Extract a 2–3 sentence conversational answer from an article. Uses the
// article's own summary first (always crafted as a one-line answer), then
// the first body paragraph for additional context. Skips lists, h3s, and
// callouts because they don't read as conversational answers.
export function extractAnswer(article: HelpArticle): string {
  const summary = article.summary.trim();
  const firstParagraph = article.body.find((b) => b.type === "p");
  if (firstParagraph && firstParagraph.type === "p") {
    const para = firstParagraph.text.trim();
    // Don't repeat content if the summary already covers it
    if (summary.length > 80 && para.startsWith(summary.slice(0, 40))) {
      return summary;
    }
    return `${summary}\n\n${para}`;
  }
  return summary;
}

export function searchHelp(query: string, limit = 4): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const category of HELP) {
    for (const article of category.articles) {
      const key = `${category.slug}/${article.slug}`;
      const keywords = ARTICLE_KEYWORDS[key] ?? [];

      const fields = {
        q: article.q.toLowerCase(),
        keywords: keywords.join(" ").toLowerCase(),
        summary: article.summary.toLowerCase(),
        body: article.body.map(blockToText).join(" ").toLowerCase(),
        category: category.title.toLowerCase(),
      };

      let score = 0;
      let exactPhraseHit = false;

      // Exact-phrase match in question or keywords is high signal
      const phrase = query.toLowerCase().trim();
      if (phrase.length > 4 && (fields.q.includes(phrase) || fields.keywords.includes(phrase))) {
        score += 30;
        exactPhraseHit = true;
      }

      for (const token of tokens) {
        if (fields.q.includes(token)) score += 10;
        if (fields.keywords.includes(token)) score += 8;
        if (fields.summary.includes(token)) score += 4;
        if (fields.body.includes(token)) score += 1;
        if (fields.category.includes(token)) score += 3;
      }

      // Penalize matches where only one of many tokens hit (low recall)
      if (!exactPhraseHit && tokens.length >= 3) {
        const hitCount = tokens.filter(
          (t) =>
            fields.q.includes(t) ||
            fields.keywords.includes(t) ||
            fields.summary.includes(t),
        ).length;
        if (hitCount === 1) score = Math.floor(score / 2);
      }

      if (score > 0) {
        results.push({ category, article, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
