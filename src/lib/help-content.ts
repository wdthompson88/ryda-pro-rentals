// Help center content. Single source of truth for /help, /help/[category],
// and /help/[category]/[slug]. Articles render from `body` blocks. Keep this
// file pruned and accurate — these pages are public-facing.

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
          "Member-managed supercar co-ownership. Each vehicle is held in a single-purpose Delaware LLC; up to 10 verified members co-own and manage it together.",
        body: [
          {
            type: "p",
            text: "RYDA is a US member-managed supercar co-ownership platform. Each vehicle in the fleet is held in a single-purpose Delaware LLC with 10 shares. Each share entitles its holder to ~30 days and ~3,000 miles per year (100 mi/day allowance). Members can hold one share or several — usage and cost scale linearly. A 5-share holder gets ~150 days; a 10-share holder is essentially the solo owner with concierge ops.",
          },
          {
            type: "p",
            text: "RYDA, as the LLC's hired service provider, handles every operational layer: acquisition support, storage, insurance, scheduling, maintenance, and member services. RYDA also facilitates the LLC paperwork when a member transfers their share to another verified member after the 12-month minimum hold.",
          },
          {
            type: "p",
            text: "It's not a timeshare, not a rental marketplace, not a fund, not an investment product. It's real member-managed co-ownership of a real car, with RYDA as your hired operations partner.",
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
            text: "A RYDA share is a registered LLC membership interest in a Delaware entity that owns a specific vehicle. You're a partial owner of the actual asset. Three things follow from that:",
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
          "Core is free and lets you browse the fleet. Blue ($500/yr) unlocks co-ownership and rentals. Black ($1,500/yr) adds priority and concierge perks.",
        body: [
          { type: "h3", text: "Core — Free" },
          {
            type: "p",
            text: "Free, no commitment. You can browse the fleet, see vehicle data, and read all marketing materials. You cannot claim a co-ownership share, book vehicles, or transfer between members on Core.",
          },
          { type: "h3", text: "Blue — $500/year ($350 founding)" },
          {
            type: "p",
            text: "The standard tier for active co-owners. Includes co-ownership shares, member-to-member transfers, member event invitations, and standard concierge services. Founding-100 members lock in $350/year for life.",
          },
          { type: "h3", text: "Black — $1,500/year ($1,000 founding)" },
          {
            type: "p",
            text: "For high-utilization members. Adds priority booking during peak season, included white-glove delivery, complimentary track-day rider on eligible vehicles, dedicated concierge contact, and first-look access on new fleet additions. Founding-100 lock in $1,000/year for life.",
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
            text: "No accredited-investor status required. RYDA does not offer investments — co-ownership stakes are not registered securities and are not offered for investment purposes. They're a way to share the cost and use of a real car with a small group of other verified members.",
          },
          { type: "h3", text: "What you do need" },
          {
            type: "ul",
            items: [
              "Be 28 years or older.",
              "Hold a valid US driver's license with a clean recent driving record.",
              "Pass standard KYC (government ID + selfie match through Persona).",
              "Be willing to be added to the LLC's insurance policy.",
            ],
          },
          { type: "h3", text: "Why the structure works without accreditation" },
          {
            type: "p",
            text: "Each car is held in a Delaware LLC that you and the other verified members manage together — 5 to 10 co-owners total. RYDA operates the car under a separate management services agreement — but the LLC itself is yours. You're not buying a passive investment product; you're buying the right to use a car you and your co-owners actually own. Because the structure is consumption-first (real ownership, real usage rights, no profit expectation), it falls outside SEC investment-contract classification.",
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
            text: "RYDA operates physical fleets in selected metros, but membership is available anywhere in the US.",
          },
          {
            type: "ul",
            items: [
              "Miami — launching Q3 2026. First market because of high HNW density, year-round driving weather, F1 Grand Prix and Art Basel anchors, and no state income tax.",
              "Los Angeles — 2027. Second market, focused on the Westside and South Bay.",
              "New York — 2027. Third market, vehicles based in Westchester / Tri-state with weekend transit to NYC.",
            ],
          },
          {
            type: "p",
            text: "If you live outside an active market, you can still join (the membership is national) and use vehicles when you travel to one of the operating cities. Members can also join early to lock in founding-100 pricing.",
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
            text: "On a co-owned Ferrari 296 GTB at $34K per share (1 of 10) with ~30 days entitlement, the effective daily ops cost works out to about $236/day. The rental rate on the same vehicle is $2,400/day. If you'll drive 15+ days a year, co-ownership pays for itself.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Many members rent first, then convert that experience into a co-ownership share on the same vehicle. We credit a portion of recent rental payments toward the buy-in, capped at 30 days.",
          },
        ],
      },
      {
        slug: "founding-member-benefits",
        q: "What do founding-100 members get?",
        summary:
          "Locked-for-life membership pricing ($350 Blue / $1,000 Black), founding-100 badge, priority on first vehicle launches, member-event access, and faster onboarding for additional shares.",
        body: [
          { type: "h3", text: "Pricing locked for life" },
          {
            type: "p",
            text: "The first 100 members lock in $350/year for Blue tier or $1,000/year for Black tier — for as long as they hold continuous membership. Standard pricing is $500 and $1,500 respectively, so over a 10-year horizon a Black founding member saves $5,000.",
          },
          { type: "h3", text: "Priority on launch fleet" },
          {
            type: "p",
            text: "Founding-100 members get first-look on every new vehicle that joins the fleet. They see the listing 7 days before it goes public, with priority on share allocation. Particularly valuable for limited-production vehicles where shares move quickly.",
          },
          { type: "h3", text: "Other founding benefits" },
          {
            type: "ul",
            items: [
              "Founding-100 badge on member directory and event invitations.",
              "Reduced KYC friction (single identity verification carries across multiple co-ownership shares).",
              "Invitation to RYDA's annual founding-member dinner.",
              "Direct line to RYDA founders for product feedback during the launch year.",
            ],
          },
          {
            type: "p",
            text: "Founding-100 status is non-transferable. If you cancel and re-enroll, you re-enroll at standard pricing.",
          },
        ],
      },
      {
        slug: "share-financing",
        q: "Can I finance my co-ownership buy-in?",
        summary:
          "Yes — through your own personal credit (Marcus, LightStream, SoFi) or a securities-backed line of credit if you have a brokerage account. RYDA itself doesn't lend.",
        body: [
          {
            type: "p",
            text: "RYDA does not finance buy-ins directly. Members usually use one of three personal-credit paths:",
          },
          { type: "h3", text: "Personal unsecured loan" },
          {
            type: "p",
            text: "Many members use unsecured personal loans (Marcus, LightStream, SoFi) to fund a buy-in. Rates are typically 7–14% APR for high-credit borrowers. The LLC share isn't pledged — the loan is just personal credit on your name.",
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
            text: "Cars depreciate. Co-ownership is a luxury access expense, not an investment that's expected to appreciate. Don't borrow more than you'd be comfortable spending — your buy-in funds a depreciating consumption product, like a country-club membership or a jet card.",
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
            text: "Browse the fleet at /markets, pick a vehicle and the number of shares you want. Each vehicle is held in a separate Delaware LLC. RYDA's default share count is 10 per vehicle.",
          },
          { type: "h3", text: "2. Identity verification (KYC)" },
          {
            type: "p",
            text: "We verify identity through Persona or an equivalent third-party. Government ID upload, selfie match, and a clean recent driving record check. Typically takes 5–10 minutes. Required to be added to the LLC's insurance policy.",
          },
          { type: "h3", text: "3. Documents" },
          {
            type: "p",
            text: "Two documents to sign electronically. The LLC Operating Agreement (governs how you and your co-owners run the LLC together — voting, fair-use, transfers, dissolution) and the Management Services Agreement (the contract between the LLC and RYDA covering operations, insurance, storage, scheduling, maintenance). Both are sent via secure e-signature.",
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
            text: "The Operating Agreement governs the LLC. The LLC is member-managed — meaning you and your co-owners hold authority over material decisions. Covers: voting thresholds (typically 75% supermajority for sale, replacement, modifications), fair-use rules during peak and off-season, what happens if a co-owner stops paying, how the vehicle gets sold or replaced, transfer mechanics, and dispute resolution. Standard length: 30–40 pages. We provide a 2-page plain-English summary alongside the full document.",
          },
          { type: "h3", text: "Management Services Agreement (MSA)" },
          {
            type: "p",
            text: "The MSA is between the LLC and RYDA. It defines the services RYDA provides — storage, insurance procurement, scheduling, maintenance, concierge, member services — and the all-in annual management fee charged to the LLC (~7–9% of vehicle value, covering RYDA's service component plus pass-through costs). RYDA is a service provider engaged by the LLC's members, not a manager of the LLC itself. The MSA can be renewed or terminated by member vote per the Operating Agreement.",
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
          "~30 days and up to ~3,000 miles per share per year (100 mi/day allowance; members can hold 1–10 shares), voting rights on material LLC decisions, and pro-rata participation in the LLC's assets at dissolution.",
        body: [
          { type: "h3", text: "Usage" },
          {
            type: "p",
            text: "Each share entitles you to ~30 days and up to ~3,000 miles of vehicle usage per year (100 mi/day allowance), with the exact entitlement set per vehicle when the LLC is formed. Members can hold one share or several — usage scales linearly (5 shares ≈ 150 days; 10 shares ≈ 300 days, with the rest reserved for service and rental pool). Days are booked on a shared calendar with the other co-owners. Fair-use rules cap consecutive days during peak season.",
          },
          { type: "h3", text: "Membership" },
          {
            type: "p",
            text: "You hold a registered LLC membership interest. The LLC is member-managed — you and your co-owners run it together. If the LLC eventually winds down (e.g., the group decides to sell the car and dissolve), the LLC's remaining assets are distributed pro-rata to members per the Operating Agreement.",
          },
          { type: "h3", text: "Voting" },
          {
            type: "p",
            text: "Material decisions — selling the vehicle, performing modifications, replacing the vehicle — require a vote per the Operating Agreement (typically a 75% supermajority by member interest). Routine maintenance, scheduling, and operations are delegated to RYDA via the Management Services Agreement.",
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
          "After a 12-month minimum hold, yes — directly to another verified RYDA member. RYDA facilitates the LLC paperwork. 3% transfer fee.",
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
            text: "Once the hold period clears, signal your intent to transfer through your dashboard. RYDA helps you negotiate directly with another interested verified member — there's no public marketplace, no order book, and no auction. You and the new co-owner agree on a price; RYDA handles the LLC paperwork to update the member register and Operating Agreement.",
          },
          { type: "h3", text: "How pricing usually works" },
          {
            type: "p",
            text: "Members typically reference a quarterly condition report and comparable-cost context for the vehicle (auction comparables, current retail offers) as a starting point and negotiate from there. This is not an exit price, a published bid, or a guaranteed transfer value — it's plain market context to help two co-owners agree on a number.",
          },
          {
            type: "p",
            text: "RYDA charges a 3% transfer fee on the agreed price, deducted at settlement. Settlement is typically 1–3 business days once both parties have signed updated documents.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Co-ownership shares are illiquid by design. Cars depreciate, transfer requires another verified member to want your share, and timing isn't guaranteed. Don't claim a share expecting on-demand exit — claim it because you want to drive the car.",
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
            text: "These are reference numbers only — not exit prices, not published bids, not guaranteed transfer values. Co-owners negotiating a transfer can use them as a starting point or ignore them. There is no automatic matching engine — the transfer happens at whatever price the two members agree to.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Cars depreciate. Reference numbers typically decline over time. Don't claim a share expecting it to hold or grow in value — claim it for the use you'll get from the car.",
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
              "Registry update with Delaware Division of Corporations.",
              "Onboarding of the new member into the booking calendar with the other co-owners.",
            ],
          },
          {
            type: "p",
            text: "It's competitive with — usually below — comparable structures (jet card transfer fees run 5–10%). The fee is fixed and disclosed in the Operating Agreement and Management Services Agreement.",
          },
        ],
      },
      {
        slug: "gifting-and-inheritance",
        q: "Can I gift a share or pass it to my heirs?",
        summary:
          "Gifts to a verified RYDA member: yes, with a transfer of the membership interest. Inheritance: yes — your share passes to your estate per your will or trust, then to your heirs after they verify.",
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
            text: "Talk to your estate attorney about how to title the share. Many members hold shares through a revocable trust to simplify transfer at death — RYDA accepts trust ownership.",
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
            text: "A solo Ferrari 296 GTB is $340,000 plus tax (~$365K all-in). A 1/10 share is roughly $34,000. Same vehicle, ten times less up-front cost. Either way, the car depreciates — co-ownership just lets you split the depreciation with the rest of the LLC's members.",
          },
          { type: "h3", text: "Annual carrying cost" },
          {
            type: "ul",
            items: [
              "Solo: $40-80K+/year, depending on the car (insurance, storage, maintenance, depreciation reserve, taxes/registration).",
              "Co-owned (Ferrari 296 example): ~$7,080/year per share, all-in. Covers your share of insurance, storage, scheduled maintenance, LLC reserves, and RYDA's service fee. Other vehicles vary — see the order panel on each listing.",
            ],
          },
          { type: "h3", text: "What you trade away" },
          {
            type: "p",
            text: "Three things: exclusive use of the vehicle (you share with 5–9 other co-owners), unilateral decision-making (modifications and sale require co-owner vote), and the 'always there' factor (the car isn't always physically yours).",
          },
          { type: "h3", text: "What you gain" },
          {
            type: "ul",
            items: [
              "Lower up-front cost and lower annual carry — more access for less commitment.",
              "Operational ease. RYDA handles every layer — insurance renewals, service appointments, storage, registration, claims.",
              "Variety. Some members hold shares in 2–3 different vehicles to vary their experience across the year.",
            ],
          },
          {
            type: "p",
            text: "Bottom line: if you'd drive a solo-owned exotic 60+ days a year and you love the operational responsibility, buy outright. If you'd drive 10–30 days a year and prefer to outsource the rest, share.",
          },
        ],
      },
      {
        slug: "llc-default",
        q: "What if a co-owner stops paying?",
        summary:
          "The Operating Agreement has remedies — typically a 30-day cure period, then forced sale of the delinquent share. RYDA's reserve covers operations during cure so other owners are unaffected.",
        body: [
          { type: "h3", text: "Cure period" },
          {
            type: "p",
            text: "If a co-owner misses a quarterly management fee or a special assessment, the LLC's Operating Agreement triggers a 30-day cure period. The delinquent member receives written notice and has 30 days to make the payment plus a small late fee.",
          },
          { type: "h3", text: "If they don't cure" },
          {
            type: "p",
            text: "The LLC can force transfer of the delinquent share to another verified member at the most recent reference value. Proceeds first cover the unpaid amount, then any LLC-level transaction costs, then the rest goes to the former member. The remaining co-owners aren't on the hook for the unpaid amount — the share itself secures the obligation.",
          },
          { type: "h3", text: "Why it doesn't disrupt operations" },
          {
            type: "p",
            text: "RYDA maintains a vehicle-level operating reserve at the LLC (built into the annual management fee) that covers ongoing operating costs during a delinquency-and-cure cycle. So while the legal process plays out, the vehicle stays insured, stored, and bookable for the other co-owners.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Forced sales are rare. Across comparable Swiss platforms (Supercar Sharing AG), default rates over 10+ years have been under 1%.",
          },
        ],
      },
      {
        slug: "share-count-changes",
        q: "Can a vehicle's share count change after launch?",
        summary:
          "No — share count is fixed at LLC formation. New shares cannot be added later. Existing co-owners can buy each other out, but the total share count stays the same.",
        body: [
          {
            type: "p",
            text: "When a vehicle's LLC is formed, the share count is set permanently in the Operating Agreement (typically 6, sometimes 8 or 10 for higher-value vehicles). This is by design — letting the LLC add shares later would dilute existing co-owners' usage entitlement.",
          },
          { type: "h3", text: "Why it's fixed" },
          {
            type: "ul",
            items: [
              "Protects existing members from dilution.",
              "Provides predictable usage entitlement (10 shares × 30 days = 300 days/yr; the remaining ~65 days are reserved for service, downtime, and the rental pool).",
              "Keeps the co-owner group small enough to coordinate.",
              "Keeps the LLC's member-managed governance simple and stable.",
            ],
          },
          { type: "h3", text: "Buyouts within the same LLC" },
          {
            type: "p",
            text: "Existing co-owners can transfer between each other at any time. If one member transfers two shares to another member, the total is still 6 — just held differently. This is how members consolidate more shares in a vehicle they love.",
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
      "Reserving days, fair-use rules, peak-season caps, cancellations, no-shows, track days.",
    articles: [
      {
        slug: "how-to-book",
        q: "How do I book my time on a vehicle?",
        summary:
          "Open the booking calendar in your dashboard, pick available dates, confirm. Vehicle is prepared and delivered or available for pickup at the assigned facility.",
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
          { type: "h3", text: "After you confirm" },
          {
            type: "p",
            text: "RYDA prepares the vehicle 24 hours before your booking starts: wash, fuel, condition photos, cabin reset. You can opt for white-glove delivery to a Miami address or pickup at the storage facility. Black tier includes delivery.",
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
            text: "Fair-use rules exist to prevent any one co-owner from monopolizing peak windows when 5–7 other members want the same days. They apply per share — if you hold two shares, you get double the budget.",
          },
          { type: "h3", text: "Peak season (Miami: May–Sep)" },
          {
            type: "ul",
            items: [
              "7 consecutive days max per share, per booking.",
              "Two peak weekends per share, max — and not adjacent.",
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
        q: "Cancellations and rebooking",
        summary:
          "Free cancellation up to 72 hours before. Within 72 hours: forfeits a half-day from your annual budget. Within 24 hours: forfeits the booked period.",
        body: [
          { type: "h3", text: "More than 72 hours out" },
          {
            type: "p",
            text: "Free cancellation. The days return to your annual usage budget and the calendar opens up for other co-owners.",
          },
          { type: "h3", text: "24–72 hours" },
          {
            type: "p",
            text: "A half-day is deducted from your annual budget as a cancellation fee. This compensates the operations team for prep work already started.",
          },
          { type: "h3", text: "Less than 24 hours / no-show" },
          {
            type: "p",
            text: "The full booked period is deducted from your budget. You can rebook the same days if they're still available, but they count against your budget twice.",
          },
          { type: "h3", text: "Force majeure" },
          {
            type: "p",
            text: "Hurricanes, family emergencies, etc. RYDA Concierge waives fees on case-by-case basis. Just call us — we're not trying to penalize people for legitimate emergencies.",
          },
        ],
      },
      {
        slug: "track-day",
        q: "Booking a track day",
        summary:
          "Track-eligible vehicles can be booked with a track-day rider on the insurance. Some hypercars are not eligible by manufacturer warranty.",
        body: [
          { type: "h3", text: "Eligibility" },
          {
            type: "p",
            text: "Each vehicle has a 'track-eligible' flag in its listing. Most modern Ferraris, Porsches, and Lambos qualify. Hybrid hypercars (LaFerrari-class, Aston Valhalla, McLaren P1) are typically not eligible because manufacturers void warranty on track use.",
          },
          { type: "h3", text: "How to book" },
          {
            type: "p",
            text: "When you book a track-eligible vehicle, select 'Track day rider' in the booking flow. You'll need to specify which sanctioned event (HPDE / club track day / manufacturer event) and provide the track waiver.",
          },
          { type: "h3", text: "What's covered" },
          {
            type: "ul",
            items: [
              "Vehicle insurance covers on-track incidents during the rider window.",
              "Mileage cap is removed — track miles don't count against the booking budget.",
              "RYDA arranges helmet drop and post-track inspection.",
              "Trailering to/from the track is available at member cost.",
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "Track-day rider is per-event. Showing up to a sanctioned event without booking the rider voids coverage and is grounds for membership review.",
          },
        ],
      },
      {
        slug: "mileage",
        q: "Mileage limits and overages",
        summary:
          "Standard share = 3,000 miles/year (100 mi/day × 30 days). Overages billed at $4/mile. Track miles excluded under the track-day rider.",
        body: [
          {
            type: "p",
            text: "Each share gets ~3,000 miles per year (100 mi/day × ~30 days). Tracking is automatic from vehicle telemetry — you'll see real-time mileage status in your dashboard.",
          },
          { type: "h3", text: "Why a cap exists" },
          {
            type: "p",
            text: "Miles drive depreciation. We cap usage to keep the vehicle's resale value protected for all co-owners. A 30K-mile Ferrari is worth materially less than a 5K-mile one.",
          },
          { type: "h3", text: "Overages" },
          {
            type: "p",
            text: "Going over your annual mileage budget is allowed but billed at $4/mile, charged at the next calendar quarter. The overage fee accrues to the LLC's reserves and offsets future depreciation.",
          },
          { type: "h3", text: "Track miles" },
          {
            type: "p",
            text: "Miles driven on a sanctioned track during a track-day rider booking don't count against your annual budget. They're tracked separately and don't trigger overages.",
          },
        ],
      },
      {
        slug: "passengers",
        q: "Bringing a passenger or co-driver",
        summary:
          "Passengers are fine. A co-driver (someone else behind the wheel) requires pre-verification and a household-secondary-driver add-on.",
        body: [
          { type: "h3", text: "Passengers" },
          {
            type: "p",
            text: "Bring whoever you want as a passenger. No verification required, no extra fee.",
          },
          { type: "h3", text: "Co-drivers" },
          {
            type: "p",
            text: "Anyone driving the vehicle must be on the insurance policy. We can add a household secondary driver (spouse, partner, adult child) to any membership for a small annual fee. The secondary driver clears the same identity and driving record check as the primary member.",
          },
          {
            type: "p",
            text: "Co-drivers outside your household (friend, business associate) can't be added. The vehicle is not for ride-share or commercial passenger use.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Letting someone uninsured drive the vehicle voids coverage and is grounds for membership review.",
          },
        ],
      },
      {
        slug: "out-of-state-travel",
        q: "Can I take the car out of state?",
        summary:
          "Within the contiguous US, with notice. Inter-market transit between RYDA cities is built-in. Outside the operating market, advance approval and an extended-trip rider apply.",
        body: [
          { type: "h3", text: "Day trips and same-state travel" },
          {
            type: "p",
            text: "Day trips and overnight travel within the home state of the vehicle are unrestricted — drive to the Keys from Miami, drive Pacific Coast Highway out of LA, take a vehicle from NYC up to the Hamptons. No special permission needed.",
          },
          { type: "h3", text: "Inter-market transit" },
          {
            type: "p",
            text: "Members in good standing can request inter-market transit with 14+ days notice — say, taking a Miami-based Ferrari to LA for a week. RYDA arranges enclosed transport (member-paid) or escorts a road-trip drive. Insurance follows the vehicle automatically.",
          },
          { type: "h3", text: "Long-distance road trips" },
          {
            type: "p",
            text: "Trips of 500+ miles or 5+ days outside the home market require an extended-trip rider on the insurance and a route filing with RYDA Operations. We don't restrict the trip — we just document it for coverage. Approval typically takes 2–3 days.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Mexican and Canadian border crossings are not permitted on insurance. Period. If you want to cross either border, contact us — we may be able to arrange specific vehicle and rider combinations, but it's a separate process.",
          },
        ],
      },
      {
        slug: "weather-and-storms",
        q: "What if there's a hurricane during my booking?",
        summary:
          "If a NOAA-named storm tracks toward the operating market, RYDA recalls vehicles to indoor storage and issues full refunds for affected bookings. Members are not charged.",
        body: [
          { type: "h3", text: "Hurricane protocol" },
          {
            type: "p",
            text: "Once NOAA issues a hurricane watch or warning for the operating market, RYDA Operations recalls all currently-booked vehicles to climate-controlled indoor storage. Pickup arrangements happen through Concierge — typically a transport driver picks up the vehicle from your location.",
          },
          { type: "h3", text: "Refunds and rebooking" },
          {
            type: "ul",
            items: [
              "Bookings during the storm window get full refund: days return to your annual budget, and you're not charged for any prep or delivery.",
              "Rebooking priority post-storm: members affected by the recall get first-look on the rebooked dates within the same season.",
              "If your home is in the storm path and you need to evacuate, the vehicle still has to be returned. We coordinate.",
            ],
          },
          { type: "h3", text: "Other weather" },
          {
            type: "p",
            text: "Standard rain, snow, hail are at member discretion — drive carefully or return early if conditions deteriorate. Hail damage during a booking is comprehensive coverage (low deductible). Salt-belt winter driving is allowed but creates extra detail and inspection cost on return.",
          },
        ],
      },
      {
        slug: "airport-and-valet",
        q: "Can I park it at an airport or hotel valet?",
        summary:
          "Indoor airport parking is fine. Hotel valet is fine for nice hotels. Off-airport surface lots and standard hotel self-park are not allowed under the policy.",
        body: [
          { type: "h3", text: "Airports" },
          {
            type: "p",
            text: "Indoor (covered, secured) airport parking is allowed. Most major airports offer it — MIA Premium Parking, LAX Premier, JFK Premium Parking. Off-airport surface lots are not permitted because they lack security and weather protection.",
          },
          { type: "h3", text: "Hotels and restaurants" },
          {
            type: "ul",
            items: [
              "Hotel valet at four- or five-star hotels: yes, fine.",
              "Restaurant valet at established venues: yes, fine.",
              "Hotel self-park garages: depends on the facility. Indoor and secured = yes; outdoor = no.",
              "Street parking: short-term only, monitored, in safe areas. Overnight street parking is not allowed under the policy.",
            ],
          },
          { type: "h3", text: "What if something happens to it in valet" },
          {
            type: "p",
            text: "Valet damage is covered by the venue's garage-keepers liability first, then by the RYDA insurance policy as backup. Photograph the vehicle's condition both at handover to valet and at retrieval — it makes any claim 10× easier.",
          },
        ],
      },
      {
        slug: "lost-keys",
        q: "What if I lose the key fob?",
        summary:
          "Call Concierge immediately. Replacement keys for exotics range $1,500–$8,000 and require dealer programming. The lost-key fee comes out of the responsible member.",
        body: [
          { type: "h3", text: "Immediately" },
          {
            type: "p",
            text: "Call RYDA Concierge as soon as you realize the key is missing. We'll dispatch a spare via secured courier so you can complete or end your booking. If the vehicle is in a public location, we'll arrange retrieval first.",
          },
          { type: "h3", text: "Replacement cost" },
          {
            type: "p",
            text: "Exotic key fobs are expensive and have to be programmed by the manufacturer dealer:",
          },
          {
            type: "ul",
            items: [
              "Ferrari: $2,500–$4,000 per fob plus dealer programming.",
              "Lamborghini: $1,500–$3,000.",
              "McLaren: $2,000–$4,000.",
              "Rolls-Royce: $3,000–$8,000 depending on model and trim.",
              "Aston Martin: $1,500–$3,500.",
            ],
          },
          { type: "h3", text: "Who pays" },
          {
            type: "p",
            text: "The member responsible for the loss covers the replacement cost. We charge it via your default payment method. If you find the key after we've ordered the replacement, you keep the spare set — most members appreciate having one for future bookings.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Trick that helps: most fobs have a tile/airtag-style tracker compatibility. We'll happily attach an AirTag or Tile to any fob you're using on a long booking.",
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
    blurb: "What's covered, deductibles, how to file a claim, replacement vehicles.",
    articles: [
      {
        slug: "coverage",
        q: "What does the insurance cover?",
        summary:
          "$1M third-party liability, agreed-value physical damage, $500K UM/UIM, roadside, replacement vehicle. Track-day rider is optional.",
        body: [
          { type: "h3", text: "Liability" },
          {
            type: "p",
            text: "$1M per occurrence in third-party liability coverage. Covers bodily injury and property damage you cause to others. Higher limits available on request through your dashboard.",
          },
          { type: "h3", text: "Physical damage" },
          {
            type: "p",
            text: "Agreed-value comprehensive and collision coverage. The full retail value of the vehicle is agreed at policy inception and paid in the event of a total loss — no depreciation arguments. Includes theft, fire, weather, vandalism, and collision.",
          },
          { type: "h3", text: "Uninsured / underinsured motorist" },
          {
            type: "p",
            text: "$500K UM/UIM. If someone hits you and they don't have adequate coverage, you're not stuck with the bill.",
          },
          { type: "h3", text: "Roadside + replacement" },
          {
            type: "p",
            text: "If a vehicle breaks down or is in an accident during your booking, RYDA dispatches a replacement vehicle of similar tier within 4 hours.",
          },
          { type: "h3", text: "Track-day rider" },
          {
            type: "p",
            text: "Optional add-on for sanctioned track events on track-eligible vehicles. Required for any on-track use; covers the sanctioned event window.",
          },
        ],
      },
      {
        slug: "deductible",
        q: "What's my deductible if I'm at fault?",
        summary:
          "$2,500 standard deductible for at-fault collisions. $5,000 for at-fault losses involving willful misuse. Not-at-fault: zero.",
        body: [
          {
            type: "p",
            text: "Deductibles depend on circumstance:",
          },
          {
            type: "ul",
            items: [
              "Not-at-fault collision: $0. Other party's insurance handles repair through subrogation.",
              "At-fault collision (no willful misuse): $2,500. Your responsibility, deducted via the on-file payment method.",
              "At-fault collision involving willful misuse (street racing, unauthorized track use, driving while uninsured by violating rules): $5,000 plus possible membership review.",
              "Comprehensive (theft, weather, vandalism not your fault): $1,000.",
            ],
          },
          { type: "h3", text: "If a co-owner objects" },
          {
            type: "p",
            text: "Repeated at-fault incidents can be grounds for membership review under the Operating Agreement. The other co-owners on the same LLC can vote to require sale of the at-fault member's share at fair-market price.",
          },
        ],
      },
      {
        slug: "file-claim",
        q: "How to file a claim — step by step",
        summary:
          "Call RYDA Concierge first (one number, 24/7). Photograph everything. Don't admit fault. We file with the carrier within 24 hours and manage the adjuster.",
        body: [
          { type: "h3", text: "Step 1 — Get safe and call us" },
          {
            type: "p",
            text: "First priority: medical help if anyone's hurt. Second: move the vehicle out of traffic if it's safe. Third: call the RYDA Concierge line (in your dashboard, on your insurance card, in this help center). One number, 24/7, real human.",
          },
          { type: "h3", text: "Step 2 — Document" },
          {
            type: "p",
            text: "Photograph the vehicle, the other vehicle if applicable, the scene, license plates, and any visible damage. Get the other party's name, phone, license, and insurance info. If police respond, get the report number.",
          },
          { type: "h3", text: "Step 3 — We file" },
          {
            type: "p",
            text: "RYDA opens the claim with the insurance carrier within 24 hours. We coordinate the adjuster, repair shop, and rental coverage. You don't have to talk to anyone unless we ask you to.",
          },
          { type: "h3", text: "Step 4 — Resolution" },
          {
            type: "p",
            text: "For at-fault collisions, your deductible is charged. For not-at-fault, no deductible. Repair takes whatever it takes — exotic parts have lead times.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Don't admit fault at the scene. Don't sign anything from the other party's insurance. Let the carriers and adjusters work it out — that's what insurance is for.",
          },
        ],
      },
      {
        slug: "roadside",
        q: "Roadside assistance & replacement vehicle",
        summary:
          "24/7 dispatch from the RYDA Concierge line. Replacement vehicle of similar tier within 4 hours, anywhere in the operating market.",
        body: [
          { type: "h3", text: "What roadside covers" },
          {
            type: "ul",
            items: [
              "Flat tire, dead battery, lockout, fuel delivery.",
              "Towing to the nearest authorized service facility (no out-of-pocket cost).",
              "On-the-road mechanical breakdown.",
              "Accident dispatch and police coordination.",
            ],
          },
          { type: "h3", text: "Replacement vehicle" },
          {
            type: "p",
            text: "If the vehicle is out of service for any reason during your booking — accident, mechanical breakdown, recall — RYDA delivers a replacement of similar tier within 4 hours. No paperwork, no stranding, no phone tree.",
          },
          { type: "h3", text: "Out-of-market" },
          {
            type: "p",
            text: "If the vehicle is on inter-market transit and breaks down outside the operating market, replacement may take longer (6–12 hours). RYDA covers your reasonable hotel and meal expenses if you're stranded.",
          },
        ],
      },
      {
        slug: "total-loss",
        q: "What if the car is totaled?",
        summary:
          "Insurance pays the agreed value to the LLC. Distributions go pro-rata to co-owners. The group can elect to roll proceeds into a replacement vehicle.",
        body: [
          { type: "h3", text: "Insurance proceeds" },
          {
            type: "p",
            text: "Vehicles are insured at agreed value, set at policy inception and re-evaluated annually. If the vehicle is totaled, the carrier pays the agreed value to the LLC's account.",
          },
          { type: "h3", text: "Distribution" },
          {
            type: "p",
            text: "Proceeds are distributed pro-rata to co-owners after deducting any outstanding LLC obligations (unpaid management fees, ongoing reserve obligations).",
          },
          { type: "h3", text: "Replacement option" },
          {
            type: "p",
            text: "Most groups elect to roll proceeds into a replacement vehicle of similar specification rather than wind down the LLC. The replacement option requires a 75% co-owner vote and is documented in the Operating Agreement.",
          },
          {
            type: "callout",
            tone: "info",
            text: "If the group can't reach 75% on a replacement, the LLC winds down and proceeds are distributed. Members can then buy into a different LLC if they want to remain in the platform.",
          },
        ],
      },
      {
        slug: "unauthorized-driver",
        q: "What if my friend drives the car?",
        summary:
          "Don't. Letting an unauthorized driver behind the wheel voids the insurance policy entirely. The financial liability is yours. It's also grounds for membership review.",
        body: [
          {
            type: "p",
            text: "The insurance policy specifies who is covered to drive each vehicle: the verified primary co-owner, plus any verified secondary household driver added to the policy. Anyone else is uninsured — including your friend, your business partner, your significant other unless they're added.",
          },
          { type: "h3", text: "If an unauthorized driver gets in an accident" },
          {
            type: "ul",
            items: [
              "The insurance policy doesn't pay. Period.",
              "All third-party damages (other vehicles, property, injuries) are personally yours.",
              "Vehicle damage is yours to pay for at full repair cost.",
              "RYDA may review your membership and request you list your share for sale.",
            ],
          },
          { type: "h3", text: "How to add an authorized driver legitimately" },
          {
            type: "p",
            text: "Adding a household secondary driver (spouse, partner, adult child living with you) is a $250/year add-on. The secondary driver clears the same identity and driving record check as the primary. Once added, they can drive on the same coverage. Non-household drivers cannot be added.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "We mean it. The 'just for a quick drive around the block' moment is when one accident wipes out years of saved cost. If your buddy wants to drive, get them a RYDA rental booking — that takes 5 minutes, costs a daily rate, and is fully insured.",
          },
        ],
      },
      {
        slug: "passenger-injury",
        q: "What if a passenger gets hurt?",
        summary:
          "Passenger medical and bodily injury are covered by the $1M liability policy. Your personal auto medical-payments coverage (PIP/Medpay) may also apply.",
        body: [
          {
            type: "p",
            text: "Passenger injuries are a real risk in any vehicle, especially exotics where an at-fault crash can produce significant injury claims.",
          },
          { type: "h3", text: "What the RYDA policy covers" },
          {
            type: "ul",
            items: [
              "Passenger bodily injury caused by the vehicle owner's negligence: covered under the $1M third-party liability.",
              "Passenger medical bills if at-fault: covered up to policy limits, claims filed by RYDA on behalf of the LLC.",
              "Passenger UM/UIM if not at-fault and the other party is uninsured: covered up to $500K per the UM policy.",
            ],
          },
          { type: "h3", text: "What it doesn't cover" },
          {
            type: "ul",
            items: [
              "Injuries caused by your own willful misuse (street racing, intoxication, etc.).",
              "Pre-existing conditions of the passenger.",
            ],
          },
          { type: "h3", text: "Practical advice" },
          {
            type: "p",
            text: "If a passenger is hurt during a booking, call 911 first, then RYDA Concierge. Don't move them unless safety requires it. Don't admit fault. Document everything as you would any accident scene — the insurance carrier handles the rest.",
          },
        ],
      },
      {
        slug: "voids-coverage",
        q: "What voids my insurance coverage?",
        summary:
          "DUI, racing on public roads, unauthorized drivers, off-track motorsport, commercial use, intentional damage, fraud — anything outside the policy's stated use voids coverage.",
        body: [
          {
            type: "p",
            text: "The insurance is built on the assumption that the vehicle is being used for legitimate personal driving by a verified, sober, licensed driver. Step outside that frame and coverage stops.",
          },
          { type: "h3", text: "What automatically voids coverage" },
          {
            type: "ul",
            items: [
              "Driving under the influence of alcohol or drugs (any state's legal limit).",
              "Street racing, drag racing, or aggressive contests on public roads.",
              "Letting an unauthorized driver behind the wheel.",
              "Off-track motorsport (drift events, autocross without proper rider, hill climbs).",
              "Commercial use: ride-share, paid passenger transport, delivery, photoshoot for compensation without prior approval.",
              "Driving outside the geographic area defined in the policy (Mexico, Canada, etc.).",
              "Intentional damage to the vehicle or third-party property.",
              "Failing to obtain medical attention when required at an accident scene (some carriers).",
              "Fraudulent claims or misrepresentation of facts.",
            ],
          },
          { type: "h3", text: "Track days are different" },
          {
            type: "p",
            text: "Sanctioned track days WITH the track-day rider are explicitly covered. Track days without the rider void coverage for that booking. The rider has to be booked in advance — you can't add it the morning of an event.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "If you're not sure whether something voids coverage, ask Concierge first. The cost of a 5-minute conversation is much lower than a denied claim.",
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
      "Service schedule, inspections, who pays for what, reporting damage, condition reports.",
    articles: [
      {
        slug: "process",
        q: "How is maintenance handled?",
        summary:
          "RYDA handles 100% of routine and unscheduled maintenance through approved authorized facilities. Co-owners are not on call for any of it.",
        body: [
          { type: "h3", text: "Routine service" },
          {
            type: "p",
            text: "Manufacturer-recommended service intervals (oil, fluids, brakes, tires) are scheduled by RYDA Operations. The vehicle is taken to an authorized facility (Ferrari of Miami, McLaren of Beverly Hills, etc.) and returned to storage. Members are notified when their vehicle is in service so bookings aren't affected.",
          },
          { type: "h3", text: "Unscheduled work" },
          {
            type: "p",
            text: "Mechanical issues, recall work, or damage repair is handled the same way. Co-owners are notified of any work taking the vehicle out of service for more than 7 days.",
          },
          { type: "h3", text: "Reporting and visibility" },
          {
            type: "p",
            text: "Every service appointment is logged with photos, mileage, and an itemized invoice in the vehicle's service log, accessible to all co-owners through the dashboard.",
          },
        ],
      },
      {
        slug: "who-pays",
        q: "Who pays for routine service?",
        summary:
          "Routine maintenance is paid from the LLC's annual reserve, funded by the all-in annual management fee. No surprise bills.",
        body: [
          {
            type: "p",
            text: "Routine maintenance is fully covered by the annual all-in management fee (charged to the LLC, not directly to members). The fee is set high enough to cover:",
          },
          {
            type: "ul",
            items: [
              "Manufacturer-scheduled service.",
              "Tire replacement at recommended intervals.",
              "Brakes, fluids, filters, batteries.",
              "Detailing, condition reports, photography.",
              "Storage and insurance premiums.",
              "A reserve buffer for unscheduled minor repairs.",
            ],
          },
          { type: "h3", text: "What's not covered" },
          {
            type: "ul",
            items: [
              "Damage from at-fault collisions (covered by insurance, deductible from the at-fault member).",
              "Damage from member misuse (e.g., curbed wheels, cabin damage, off-road use).",
              "Modifications requested by members (charged separately, requires co-owner approval).",
              "Mileage overages (billed at $4/mile per the Operating Agreement).",
            ],
          },
          {
            type: "p",
            text: "The fee rate is reviewed annually and may adjust if maintenance costs trend differently than projected. Any adjustment is a documented LLC decision with member notice.",
          },
        ],
      },
      {
        slug: "report-damage",
        q: "How do I report new damage?",
        summary:
          "Through the booking-return flow in the app, or by calling Concierge. Pre- and post-booking photo documentation makes attribution straightforward.",
        body: [
          { type: "h3", text: "At handover" },
          {
            type: "p",
            text: "Every booking starts with a fresh condition photo set, taken by Operations and shared with you in the app. You confirm the baseline before driving away (any pre-existing damage is logged on the LLC's record, not yours).",
          },
          { type: "h3", text: "During the booking" },
          {
            type: "p",
            text: "If you notice or cause damage, report it through the app or call Concierge. Faster reporting almost always resolves better — undisclosed damage discovered at return is worse than disclosed damage during the booking.",
          },
          { type: "h3", text: "At return" },
          {
            type: "p",
            text: "Post-booking inspection is automatic and photo-documented. Any new damage is compared to your handover photo set and either attributed to your booking or to operations-related causes.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Honest, prompt reporting is non-punitive. We don't charge members for normal wear, weather damage, or attribution-unclear incidents. We do enforce hard on willful misuse or undisclosed damage.",
          },
        ],
      },
      {
        slug: "inspections",
        q: "Inspection reports and condition documentation",
        summary:
          "Pre-purchase inspection at acquisition, condition photos before/after every booking, and an annual full inspection at the manufacturer dealer.",
        body: [
          { type: "h3", text: "Pre-purchase inspection (PPI)" },
          {
            type: "p",
            text: "Before any vehicle enters the RYDA fleet, we commission an independent multi-point pre-purchase inspection by a qualified specialist (typically the manufacturer's authorized facility). The report is included in the LLC's permanent record and shared with all founding co-owners.",
          },
          { type: "h3", text: "Per-booking condition photos" },
          {
            type: "p",
            text: "Operations takes a 12-photo condition set before and after every member booking. Members get the photo set in their app at handover and can flag discrepancies before driving.",
          },
          { type: "h3", text: "Annual inspection" },
          {
            type: "p",
            text: "Once a year, the vehicle goes to the authorized manufacturer dealer for a full multi-point inspection. The report becomes part of the LLC's record and supports annual valuation and insurance renewal.",
          },
        ],
      },
      {
        slug: "detailing",
        q: "Detailing and pre-booking preparation",
        summary:
          "Every booking starts with a clean, fueled, prepped vehicle. Detailing is handled by RYDA Operations as part of the management fee.",
        body: [
          { type: "h3", text: "Standard prep, every booking" },
          {
            type: "ul",
            items: [
              "Exterior wash + spot detail.",
              "Interior vacuum, wipe-down, glass cleaning.",
              "Fueled to full (gas vehicles) or charged (EVs).",
              "Tire pressure check, fluid level check.",
              "Cabin reset (radio off, climate neutral, mirrors zeroed).",
              "Condition photo set.",
            ],
          },
          { type: "h3", text: "Premium detailing (on request)" },
          {
            type: "p",
            text: "Full paint correction, ceramic coating top-up, deep interior detailing, and concours-level prep are available for special events (auto shows, photoshoots, weddings). Charged separately to the requesting member.",
          },
          { type: "h3", text: "Black tier" },
          {
            type: "p",
            text: "Black tier members get included white-glove delivery — vehicle is delivered to your Miami address, fueled and prepped, and picked up at the end of the booking.",
          },
        ],
      },
      {
        slug: "manufacturer-warranty",
        q: "How is the manufacturer warranty preserved?",
        summary:
          "All scheduled service goes through the authorized manufacturer dealer, on-time, with full documentation. Warranty stays intact for the vehicle's full coverage period.",
        body: [
          { type: "h3", text: "Why it matters" },
          {
            type: "p",
            text: "Manufacturer warranties cover major mechanical failures (engine, transmission, electronics) and are worth tens of thousands on exotic vehicles. They have strict requirements: scheduled service must happen on-time, at authorized dealers, with original-equipment parts.",
          },
          { type: "h3", text: "How RYDA preserves it" },
          {
            type: "ul",
            items: [
              "Every service appointment is at the authorized dealer (Ferrari of Miami, McLaren of Beverly Hills, etc.) — never independent shops or quick-lube chains.",
              "Service intervals are tracked and scheduled proactively. Vehicles never go past the manufacturer's recommended interval.",
              "Original-equipment parts only on warranty-covered components. No aftermarket substitutions.",
              "All service records are retained in the LLC's permanent file and re-certified annually.",
            ],
          },
          { type: "h3", text: "What can void warranty" },
          {
            type: "p",
            text: "Track use without manufacturer-approved track-day documentation, aftermarket modifications to powertrain or electronics, or skipped service intervals. We don't allow any of these on RYDA fleet vehicles for this reason.",
          },
        ],
      },
      {
        slug: "hurricane-prep",
        q: "How does RYDA prepare vehicles for hurricane season?",
        summary:
          "All Miami fleet vehicles are stored in indoor, elevated, climate-controlled facilities. During named storms, additional storm shutters and continuous monitoring engage.",
        body: [
          { type: "h3", text: "Year-round" },
          {
            type: "p",
            text: "All Miami vehicles are stored in indoor, climate-controlled facilities elevated above the FEMA flood zone. Standard storage conditions hold humidity at 45–55% and temperature at 68–72°F. Year-round, this protects against humidity-related corrosion, paint deterioration, and electronics issues.",
          },
          { type: "h3", text: "During hurricane season (June–November)" },
          {
            type: "ul",
            items: [
              "Daily NOAA monitoring; alerts trigger preparation protocols 96+ hours before landfall projections.",
              "All vehicles relocated to interior bays, away from facility perimeter.",
              "Storm shutters engage on all storage facility windows.",
              "Backup generators tested and ready to maintain climate control during power outages.",
              "Active member bookings during the warning window are recalled and refunded.",
            ],
          },
          { type: "h3", text: "After the storm" },
          {
            type: "p",
            text: "Each vehicle gets a post-storm inspection (humidity check, electronics test, full visual inspection) before bookings resume. Affected members get priority on rebooking.",
          },
        ],
      },
      {
        slug: "ev-charging",
        q: "How are EVs and hybrids charged and serviced?",
        summary:
          "Vehicles are returned to RYDA at 80%+ charge for EVs (or full fuel for hybrids). Members can opt in to home-delivered Level 2 charging during longer bookings.",
        body: [
          { type: "h3", text: "Standard EV handover" },
          {
            type: "p",
            text: "Pure EVs (Porsche Taycan, Lucid Air Sapphire, Maserati GranTurismo Folgore) are delivered at 80–100% state of charge, prepped to the same standards as ICE vehicles. Members are asked to return them at 60% or higher to support the next member's experience.",
          },
          { type: "h3", text: "Hybrids" },
          {
            type: "p",
            text: "Plug-in hybrids (Ferrari 296 GTB, McLaren Artura, Aston Valhalla) are delivered with a full battery and full fuel tank. Members can plug in at home overnight at any J1772 outlet — no special station required.",
          },
          { type: "h3", text: "Charging during longer bookings" },
          {
            type: "ul",
            items: [
              "RYDA can install a temporary Level 2 charger at your residence for stays of 7+ days. Removed at the end of the booking.",
              "Public DC fast charging (Electrify America, EVgo) is paid via the vehicle's onboard credentials — no separate account needed.",
              "Tesla Superchargers are available on most modern EVs via NACS adapter (provided in the trunk).",
            ],
          },
          { type: "h3", text: "EV-specific service" },
          {
            type: "p",
            text: "Battery health checks, software updates, and high-voltage component inspections happen on a separate annual schedule from the regular maintenance cycle. All performed at the manufacturer dealer.",
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
      "Membership renewals, payment methods, taxes, statements, KYC verification.",
    articles: [
      {
        slug: "payment-methods",
        q: "Updating payment methods",
        summary:
          "Through your dashboard. ACH for membership and large transactions, card for incidentals. Wire instructions are issued per co-ownership buy-in.",
        body: [
          { type: "h3", text: "Where" },
          {
            type: "p",
            text: "Account → Payment Methods. You can add, remove, or set a default method any time.",
          },
          { type: "h3", text: "What we accept" },
          {
            type: "ul",
            items: [
              "ACH (recommended for membership renewals and management fees — no card processing fee).",
              "Credit / debit card (Visa, Mastercard, Amex) — used for incidentals, deductibles, mileage overages.",
              "Wire transfer — used only for buy-ins. Wire instructions are issued per transaction with the Operating Agreement and MSA.",
            ],
          },
          { type: "h3", text: "What we don't accept" },
          {
            type: "p",
            text: "Cash, money orders, crypto, third-party payments. All payments must come from a verified account in your name.",
          },
        ],
      },
      {
        slug: "billing",
        q: "How am I billed?",
        summary:
          "Annual membership on enrollment date. Quarterly management fees per LLC. Per-booking charges (delivery, overages) settled monthly.",
        body: [
          { type: "h3", text: "Membership fee" },
          {
            type: "p",
            text: "Annual, billed on your enrollment anniversary. Auto-renews unless you cancel ≥7 days before. Founding-100 pricing locks for life.",
          },
          { type: "h3", text: "Vehicle management fee" },
          {
            type: "p",
            text: "All-in fee charged to the LLC, billed quarterly, paid pro-rata by co-owners. On a $340K Ferrari with 10 shares, the LLC's annual fee runs ~$70,800 ($7,080 per share, ~$1,770/quarter for a one-share holder). The fee covers RYDA's service component plus pass-through costs (insurance, storage, scheduled maintenance, depreciation reserves). Range across the fleet: ~7–9% of vehicle value depending on the model.",
          },
          { type: "h3", text: "Per-booking charges" },
          {
            type: "ul",
            items: [
              "Standard delivery & detailing: included in the management fee.",
              "Premium delivery (white-glove to non-default address): $200/booking.",
              "Mileage overage: $4/mile, settled the following month.",
              "Track-day rider: $750/event for track-eligible vehicles.",
            ],
          },
          { type: "h3", text: "Statements" },
          {
            type: "p",
            text: "Monthly account statement summarizes membership status, all charges, all bookings, and all per-share LLC obligations. Annual statement issued each year by March 15.",
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
              "Member directory entries for each LLC you co-own (Delaware LLC records).",
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
            text: "Members who use a co-owned vehicle for genuine business purposes may have different treatment — including potential deductibility of operating costs allocable to business mileage. This requires recordkeeping that goes beyond what RYDA's normal reporting captures. Talk to your CPA before relying on it.",
          },
        ],
      },
      {
        slug: "kyc",
        q: "KYC verification — what we collect and why",
        summary:
          "Government ID, selfie match, address proof, clean recent driving record. Required before any co-ownership buy-in or member booking. Verified through Persona — RYDA never sees raw documents.",
        body: [
          { type: "h3", text: "What we collect" },
          {
            type: "ul",
            items: [
              "Government-issued photo ID (US driver's license, passport, or state ID).",
              "Selfie image for biometric match against the ID photo.",
              "Address verification (mailing address — used for billing, statements, and DMV records).",
              "Date of birth and SSN last-4 (for OFAC sanctions screening).",
            ],
          },
          { type: "h3", text: "Why we collect it" },
          {
            type: "p",
            text: "Two reasons: (1) insurance — we add you as a named insured to the vehicle's policy, and carriers require verified identity and a clean recent driving record; (2) operational — misrepresenting identity voids coverage and breaches the Operating Agreement.",
          },
          { type: "h3", text: "Where it's stored" },
          {
            type: "p",
            text: "Documents are processed by Persona (or equivalent third-party). RYDA never sees raw ID images. We retain only the verification result, ID type, name, address, and DOB — encrypted, in our member system.",
          },
          { type: "h3", text: "Sharing" },
          {
            type: "p",
            text: "We don't share KYC data with anyone except (a) insurance carriers when adding you to a policy, (b) state/federal regulators when legally required, and (c) the new co-owner's verification flow on a member-to-member share transfer (limited fields, with your consent).",
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
            text: "Email hello@ryda.com or use the close-account flow in your dashboard. We deactivate the account, cancel any auto-renewals, and email a final account statement. Membership data is retained per our privacy policy retention schedule.",
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
              "If no member is interested at your price, you can lower it, hold and wait, or — in some cases — RYDA may help facilitate a transfer to a member on the waitlist.",
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
          "Yes. Refer a member who completes membership: $500 credit. Refer a member who buys a share: $2,500 credit. Founding-100 members get 2× referral credits.",
        body: [
          { type: "h3", text: "Tiers" },
          {
            type: "ul",
            items: [
              "$500 credit when your referral becomes a paid member (Blue or Black).",
              "$2,500 credit when your referral closes their first co-ownership share.",
              "Founding-100 members earn 2× credits on every successful referral.",
            ],
          },
          { type: "h3", text: "How to refer" },
          {
            type: "p",
            text: "Account → Referral Program in your dashboard. Generate a unique link. Share it however you like — text, email, in person at a track day, social media (within RYDA's brand guidelines). When someone signs up through your link, the credit lands in your account at the qualifying milestone.",
          },
          { type: "h3", text: "What credits can be used for" },
          {
            type: "ul",
            items: [
              "Annual membership renewal.",
              "Track-day rider fees.",
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
        slug: "founding-pricing",
        q: "What's the founding-100 pricing lock?",
        summary:
          "First 100 members lock in $350 Blue / $1,000 Black for life. As long as your membership stays active, the price never increases.",
        body: [
          {
            type: "p",
            text: "When RYDA launched, the first 100 members were eligible for permanently locked membership pricing at a $150–500 annual discount. The lock applies to the membership fee only — co-ownership buy-in prices, management fees, and other charges are at standard rates.",
          },
          { type: "h3", text: "Locked rates" },
          {
            type: "ul",
            items: [
              "Founding Blue: $350/year, locked. (Standard $500/year.)",
              "Founding Black: $1,000/year, locked. (Standard $1,500/year.)",
              "10-year savings vs. standard pricing: $1,500 (Blue) or $5,000 (Black).",
            ],
          },
          { type: "h3", text: "Status terms" },
          {
            type: "ul",
            items: [
              "The lock applies as long as your membership remains active and continuous.",
              "If you cancel and re-enroll later, you re-enroll at standard pricing — founding status is non-recoverable.",
              "Status is non-transferable. You can't sell or gift founding-100 status to another member.",
              "Status carries through tier changes (e.g., upgrading from Blue to Black keeps your founding lock).",
            ],
          },
          {
            type: "p",
            text: "All 100 founding shares are allocated by application order, with priority weighting for members in launch markets and members making early share commitments.",
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
              "Dispute resolution (mandatory mediation, then arbitration in Delaware).",
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
          "It's a Delaware LLC where the members (the co-owners) hold authority over material decisions — not an outside manager. This is what keeps RYDA a luxury access platform, not an investment product.",
        body: [
          { type: "h3", text: "Two types of LLC governance" },
          {
            type: "p",
            text: "Delaware LLCs come in two flavors: manager-managed and member-managed.",
          },
          {
            type: "ul",
            items: [
              "Manager-managed: a designated manager runs the LLC. Members are passive — like shareholders. This is what most fractional investment platforms use, which is what makes those products securities.",
              "Member-managed: the members themselves run the LLC, vote on material decisions, and hire service providers as needed. This is what RYDA uses.",
            ],
          },
          { type: "h3", text: "Why this matters for RYDA" },
          {
            type: "p",
            text: "Member-managed structure is a cornerstone of RYDA's non-investment positioning. The SEC's Howey test for what counts as a security asks whether members expect to profit from the efforts of others. In a member-managed LLC, you and your co-owners ARE the others — you hold authority. RYDA is hired to perform specific services, not to run the LLC. This is structurally similar to how a country club, condo association, or vacation-home co-ownership group operates — none of which are securities.",
          },
          { type: "h3", text: "What you actually decide as a member" },
          {
            type: "ul",
            items: [
              "Whether to sell the vehicle (75% supermajority).",
              "Whether to perform modifications (75% supermajority).",
              "Whether to replace the vehicle on a total loss (75% supermajority).",
              "Whether to renew or terminate the management services agreement with RYDA.",
              "Day-to-day operations are delegated to RYDA — but you can revoke that delegation by member vote.",
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
          "No. They are LLC membership interests in a member-managed Delaware LLC where you actually co-own and use the vehicle. Not registered securities. Not offered for investment purposes.",
        body: [
          {
            type: "p",
            text: "No. RYDA is a luxury access platform, not an investment platform. Each car is held in a member-managed Delaware LLC that you and your co-owners run together. RYDA provides operations under a separate management services agreement. The arrangement is consumption-first — real ownership of a real car, with real usage rights — not a passive investment product.",
          },
          { type: "h3", text: "Why this isn't a security" },
          {
            type: "p",
            text: "Under the SEC's Howey test, an investment contract requires (1) investment of money, (2) in a common enterprise, (3) with expectation of profit, (4) derived from the efforts of others. RYDA's structure breaks the third and fourth prongs:",
          },
          {
            type: "ul",
            items: [
              "Cars depreciate. Co-owners aren't buying with appreciation expectation — the asset is a depreciating consumption good, like a jet card or a country-club membership.",
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
              "12-month minimum hold still applies (Operating Agreement) — but this is a co-ownership stability rule, not a securities lock-up.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "RYDA is not a broker-dealer, investment adviser, or fund manager. Co-ownership stakes are not offered for investment purposes. If you're considering this primarily for financial return, this is the wrong product — buy a Ferrari outright or look at a registered fund instead.",
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
              "Payment information (encrypted, processed by Stripe — RYDA doesn't store card numbers).",
            ],
          },
          { type: "h3", text: "Who we share with" },
          {
            type: "ul",
            items: [
              "Insurance carriers (when adding you to a policy).",
              "Federal/state regulators (when legally required).",
              "Other co-owners on your specific LLC (limited: your name, contact, share count — for booking calendar coordination).",
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
            text: "The dissolution generates a final K-1 for the year, including any gain or loss on the disposition. Co-owners report it on their personal tax returns. As always — talk to your CPA, RYDA does not provide tax advice.",
          },
        ],
      },
      {
        slug: "dispute-resolution",
        q: "How do disagreements between co-owners get resolved?",
        summary:
          "Most disagreements never escalate — RYDA Operations enforces the Operating Agreement consistently. For ones that do: mandatory mediation first, then arbitration in Delaware.",
        body: [
          { type: "h3", text: "Day-to-day governance" },
          {
            type: "p",
            text: "RYDA, as the LLC's hired service provider, performs most operational decisions (scheduling, service, condition issues) by applying the Operating Agreement consistently. The LLC remains member-managed — co-owners hold authority over material decisions — but day-to-day operations are delegated to RYDA via the Management Services Agreement. RYDA's authority is bounded by what the Operating Agreement and MSA explicitly delegate.",
          },
          { type: "h3", text: "When co-owners disagree" },
          {
            type: "p",
            text: "Material issues — sale, replacement, modification, or expulsion of a delinquent member — require a vote per the OA's threshold (typically 75%). If a vote fails to reach threshold, the status quo continues until a new vote is called.",
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
              "Mandatory mediation (60 days) with a Delaware-based mediator.",
              "If mediation fails: binding arbitration in Wilmington, Delaware under AAA rules.",
              "Litigation only as a last resort, with a Delaware forum-selection clause.",
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
          "Sanctioned track days with the rider: yes. Drag strips, drift events, launch control on public roads: no. Spirited canyon driving: yes, within reason.",
        body: [
          { type: "h3", text: "What's allowed" },
          {
            type: "ul",
            items: [
              "Sanctioned track days (HPDE, club track day, manufacturer track event) on track-eligible vehicles WITH the track-day rider booked in advance.",
              "Spirited driving on public roads — using the powerband, enjoying corners, normal performance driving within posted limits.",
              "Launch control on a closed track. Multiple manufacturers (Ferrari, Lambo) actually require periodic use of launch control to keep transmission systems calibrated — but only on track or private property.",
            ],
          },
          { type: "h3", text: "What's not allowed" },
          {
            type: "ul",
            items: [
              "Drag racing (sanctioned drag strips not eligible — manufacturer warranty issues + insurance coverage gap).",
              "Drift events, gymkhana, autocross without proper rider and approval.",
              "Sustained high-RPM driving on public roads (street racing, pace runs).",
              "Launch control on public roads (insurance won't cover transmission damage from this).",
              "Modifications to disable traction control, ABS, or stability systems.",
            ],
          },
          { type: "h3", text: "Why we care" },
          {
            type: "p",
            text: "Aggressive use damages the asset (clutch wear, brake wear, transmission stress) and the cost falls on all co-owners through the next round of valuations. Worse, it's a fast track to voiding warranty and insurance coverage. We're not anti-fun — we're pro-keeping-the-asset-valuable for everyone in the group.",
          },
        ],
      },
      {
        slug: "smoking-pets-food",
        q: "Smoking, pets, food — what's allowed?",
        summary:
          "No smoking, no vaping, no recreational substances. Small dogs in carriers OK with pre-approval. Food and drinks OK with care; spills are member-charged.",
        body: [
          { type: "h3", text: "Smoking and vaping" },
          {
            type: "p",
            text: "No smoking, no vaping, no marijuana. Period. Smoke odor in an exotic interior is permanent — it requires full leather replacement to remove, which can run $15,000+. Detected smoking is a $5,000 cabin restoration fee plus potential membership review.",
          },
          { type: "h3", text: "Pets" },
          {
            type: "ul",
            items: [
              "Small dogs (under 25 lbs) in approved carriers: yes, with pre-booking notice.",
              "Larger dogs, dogs not in carriers, or unrestrained pets: no.",
              "Cats: case-by-case (most cats are stressed in cars and an anxious cat in a Ferrari is a bad outcome).",
              "Other animals: no.",
            ],
          },
          { type: "h3", text: "Food and drinks" },
          {
            type: "p",
            text: "Food and drinks are allowed but discouraged — exotic interiors are typically Alcantara or hand-stitched leather, neither of which forgives spills. If you're going to eat or drink in the car, use sealed containers. Spills are charged at actual cleaning cost (typically $200–800).",
          },
          {
            type: "callout",
            tone: "info",
            text: "Coffee in the cup holder: fine. Coffee from a paper cup with a flimsy lid going through a corner: bad idea. We've seen the receipts.",
          },
        ],
      },
      {
        slug: "road-trips",
        q: "Can I take the car on a road trip?",
        summary:
          "Yes — that's part of what these cars are for. Trips of 500+ miles or 5+ days file an extended-trip rider. Long-distance is a great use of a co-owned exotic.",
        body: [
          { type: "h3", text: "Why road trips work well" },
          {
            type: "p",
            text: "Many of RYDA's most-used member experiences are road trips: Miami-to-Keys, LA-to-Sequoia, NYC-to-Newport. Modern exotics are surprisingly comfortable on long-distance — adaptive suspension, climate control, modern infotainment.",
          },
          { type: "h3", text: "What's needed" },
          {
            type: "ul",
            items: [
              "Trips of 500+ miles or 5+ days: file an extended-trip notification with Concierge 14 days in advance. Insurance documentation, route filing, mid-trip support pre-arranged.",
              "Mileage budget: long road trips can eat into your annual 3,000-mile allotment (100 mi/day × 30 days). Plan accordingly or pay the $4/mile overage.",
              "Cross-state borders: insurance covers all 50 contiguous states. Mexico and Canada need a separate process.",
            ],
          },
          { type: "h3", text: "Practical advice from members" },
          {
            type: "ul",
            items: [
              "Plan fuel stops on premium-fuel station maps in advance — not every interstate exit has 93 octane.",
              "Plan storage: hotels with secured indoor parking are dramatically nicer than hoping for street parking with a Lambo.",
              "Bring a USB-C cable. Modern exotic infotainment is iPhone-default but cables are car-specific.",
              "Tell Concierge ahead of time if you'll be far from cell coverage. They want to know if something happens.",
            ],
          },
        ],
      },
      {
        slug: "car-shows-photoshoots",
        q: "Can I take the car to a car show or photoshoot?",
        summary:
          "Casual car meets and Sunday gatherings: yes. Featured display at major shows: pre-approval. Paid photoshoots or commercial use: requires approval and a separate rider.",
        body: [
          { type: "h3", text: "Casual car culture" },
          {
            type: "p",
            text: "Bringing the car to a casual local meet, a coffee-and-cars Sunday, or a parking-lot gathering with friends: completely fine. This is part of why people own these cars. No special process.",
          },
          { type: "h3", text: "Major shows" },
          {
            type: "p",
            text: "If the vehicle is going to be a featured display at a major event (Cars & Coffee Miami's main showcase, a manufacturer event, a museum exhibition), notify Concierge in advance. We'll coordinate a clean prep, possibly arrange transport, and confirm event-specific insurance considerations.",
          },
          { type: "h3", text: "Photoshoots — personal" },
          {
            type: "p",
            text: "Personal photography (you, your friends, social media content) is fine. The car can be in the photo. We just ask you not to obscure RYDA branding if the vehicle has any (most don't).",
          },
          { type: "h3", text: "Photoshoots — paid or commercial" },
          {
            type: "ul",
            items: [
              "Paid photoshoots, brand collaborations, music video appearances, paid social posts: require advance approval and a commercial-use rider.",
              "Commercial use voids the standard policy without the rider — meaning if the car is damaged during a paid shoot, the insurance won't pay.",
              "RYDA Concierge can quote the commercial rider in 24 hours; cost is typically $750–2,500 per shoot day depending on use.",
            ],
          },
        ],
      },
      {
        slug: "kids-and-baby-seats",
        q: "Can I install a child seat?",
        summary:
          "Yes, with care. Most modern exotics have ISOFIX/LATCH anchors. Don't damage the upholstery — use a share protector. RYDA can install for you on Black tier.",
        body: [
          { type: "h3", text: "Where it works" },
          {
            type: "p",
            text: "Most modern exotics (Ferrari 296 GTB, McLaren 720S, Lambo Urus, Aston DBX, Rolls-Royce Cullinan, Porsche Taycan) have ISOFIX/LATCH child-seat anchors in the rear seats or extended cabin. Some 2-seat configurations don't accommodate child seats safely — check the vehicle listing.",
          },
          { type: "h3", text: "What we ask" },
          {
            type: "ul",
            items: [
              "Use a share protector underneath. The buckles and anchor points scratch leather/Alcantara on hundreds of dollars of upholstery.",
              "Don't tighten anchors with full force — exotic interior trim can deform.",
              "Remove the seat at end of booking. Don't leave it in the car for the next member.",
            ],
          },
          { type: "h3", text: "Help installing" },
          {
            type: "p",
            text: "Black tier members can request RYDA Operations to pre-install the child seat at handover. We use a clean, non-damaging installation method. Available for $50/booking, included in white-glove delivery.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Two-seat configurations (most McLarens, Ferrari 488 / 296 / F8, Aston Vantage) are typically NOT safe for child seats — the airbag system isn't designed for it and there's no rear seat to relocate to. The Cullinan, Urus, DBX, Taycan, and Bentley Bentayga work well for families.",
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
  "getting-started/founding-member-benefits": ["founding", "first 100", "founding member", "early member", "what do founders get", "lifetime pricing", "locked rate", "perks"],
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
  "bookings/track-day": ["track", "racing", "race", "circuit", "hpde", "lap", "performance driving", "track event", "track day", "porsche club", "ferrari challenge"],
  "bookings/mileage": ["miles", "mileage", "overage", "kilometers", "limit", "annual miles", "$4 per mile", "exceed", "go over", "extra miles"],
  "bookings/passengers": ["passenger", "co-driver", "secondary driver", "spouse", "partner", "friend", "additional driver", "guests", "wife", "husband", "kids ride"],
  "bookings/out-of-state-travel": ["out of state", "another state", "state line", "border", "mexico", "canada", "long distance", "across country", "interstate", "transit"],
  "bookings/weather-and-storms": ["weather", "rain", "storm", "hurricane", "tornado", "snow", "hail", "ice", "tropical storm", "evacuation", "evacuate", "noaa"],
  "bookings/airport-and-valet": ["airport", "valet", "park at airport", "hotel", "parking lot", "leave the car", "overnight parking", "secured parking"],
  "bookings/lost-keys": ["lost key", "lost fob", "key fob", "missing key", "can't find key", "replacement key", "spare key", "locked out"],

  // Insurance
  "insurance/coverage": ["insurance", "covered", "policy", "liability", "comprehensive", "collision", "what's covered", "$1m", "limits", "premium", "policy limits"],
  "insurance/deductible": ["deductible", "out of pocket", "i pay", "fault", "at-fault", "accident cost", "what do i pay", "if i crash"],
  "insurance/file-claim": ["claim", "accident", "crash", "collision", "what to do", "file a claim", "got in an accident", "rear ended", "hit by", "fender bender"],
  "insurance/roadside": ["roadside", "tow", "breakdown", "stuck", "flat tire", "battery", "lockout", "fuel", "won't start", "stranded"],
  "insurance/total-loss": ["totaled", "wrecked", "destroyed", "write-off", "write off", "total loss", "irreparable", "totally destroyed", "fire", "stolen and recovered"],
  "insurance/unauthorized-driver": ["my friend", "let someone drive", "buddy drive", "girlfriend", "boyfriend", "uncle", "valet drive", "anyone else drive"],
  "insurance/passenger-injury": ["passenger hurt", "passenger injured", "passenger injury", "got hurt", "injured", "medical bills", "ambulance", "hospital"],
  "insurance/voids-coverage": ["void coverage", "no coverage", "won't be covered", "what voids", "dui", "drinking", "intoxicated", "impaired", "drugs", "racing"],

  // Maintenance
  "maintenance/process": ["maintenance", "service", "repair", "upkeep", "how is it maintained", "who fixes", "service interval"],
  "maintenance/who-pays": ["pay for", "cost of maintenance", "who pays", "service cost", "management fee covers", "12% fee", "maintenance bill"],
  "maintenance/report-damage": ["damage", "scratch", "dent", "scuff", "report", "i scratched", "i hit something", "curbed wheel", "rim damage", "paint chip"],
  "maintenance/inspections": ["inspection", "ppi", "condition report", "annual inspection", "documentation", "service records", "history"],
  "maintenance/detailing": ["clean", "wash", "detail", "detailing", "interior", "wax", "polish", "ceramic coating", "presentation"],
  "maintenance/manufacturer-warranty": ["warranty", "manufacturer warranty", "factory warranty", "void warranty", "ferrari warranty", "porsche warranty", "preserved"],
  "maintenance/hurricane-prep": ["hurricane prep", "storm prep", "hurricane season", "evacuate vehicle", "indoor storage", "miami storm"],
  "maintenance/ev-charging": ["ev", "electric", "charge", "charging", "plug in", "tesla", "supercharger", "battery", "level 2", "hybrid", "phev"],

  // Account
  "account/payment-methods": ["pay", "payment", "card", "ach", "bank", "credit card", "wire", "billing method", "amex", "visa", "mastercard", "stripe"],
  "account/billing": ["bill", "invoice", "charged", "statement", "billing cycle", "when am i charged", "monthly", "quarterly", "annual", "receipt", "auto pay"],
  "account/taxes": ["tax", "k-1", "k1", "1099", "depreciation", "deduction", "irs", "cpa", "tax treatment", "income tax", "tax return", "schedule e"],
  "account/kyc": ["kyc", "id verification", "identity", "verify me", "documents required", "passport", "license", "selfie", "persona", "background check"],
  "account/close": ["cancel account", "leave", "quit", "close account", "deactivate", "delete account", "unsubscribe", "i'm done", "not interested"],
  "account/referral-program": ["referral", "refer a friend", "credit", "rewards", "bonus", "earn", "invite code", "promo code", "incentive", "bring a friend"],
  "account/founding-pricing": ["founding price", "founding pricing", "locked pricing", "lifetime price", "permanently locked", "founder rate"],

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
  "ryda", // every article is about RYDA — no signal
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
