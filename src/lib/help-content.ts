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
          "Asset-backed supercar co-ownership. Each vehicle is owned by a single-purpose Delaware LLC and 3–8 verified members hold shares.",
        body: [
          {
            type: "p",
            text: "RYDA is the first US asset-backed supercar co-ownership platform. Each vehicle in the fleet is owned by a single-purpose Delaware LLC. Three to eight verified members buy shares of that LLC, and those shares entitle them to usage of the underlying vehicle — typically 50 days and 4,000 miles per share per year.",
          },
          {
            type: "p",
            text: "RYDA handles every operational layer: acquisition, storage, insurance, scheduling, maintenance, member services, and the secondary market when a member wants to exit their share after the 12-month minimum hold.",
          },
          {
            type: "p",
            text: "It's not a timeshare, not a rental marketplace, not a fund. It's direct asset-backed ownership with a concierge layer on top.",
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
              "If the LLC sells the vehicle, you receive your pro-rata share of the proceeds — including any appreciation.",
              "You can sell your share to another verified RYDA member on the secondary market after 12 months.",
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
          "Core is free and lets you watch markets. Blue ($500/yr) unlocks share purchases. Black ($1,500/yr) adds priority and concierge perks.",
        body: [
          { type: "h3", text: "Core — Free" },
          {
            type: "p",
            text: "Free, no commitment. You can browse the markets, see vehicle data, and read all marketing materials. You cannot purchase shares, book vehicles, or access the secondary market on Core.",
          },
          { type: "h3", text: "Blue — $500/year ($350 founding)" },
          {
            type: "p",
            text: "The standard tier for active co-owners. Includes share purchases, secondary-market access, member event invitations, and standard concierge services. Founding-100 members lock in $350/year for life.",
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
          "For share purchases, yes — RYDA offers shares under Reg D 506(c). Membership and rentals do not require accreditation.",
        body: [
          {
            type: "p",
            text: "Two different things to keep separate.",
          },
          { type: "h3", text: "Membership and rentals — no" },
          {
            type: "p",
            text: "Joining RYDA, browsing the markets, and renting a vehicle does not require accredited-investor status. Anyone who passes our standard membership verification (28+, valid US license, clean recent driving record) can rent any available vehicle.",
          },
          { type: "h3", text: "Share purchases — yes" },
          {
            type: "p",
            text: "Buying a share in a RYDA vehicle LLC requires accredited-investor verification because shares are offered under SEC Reg D 506(c). Accreditation is verified through a third-party service before any share purchase closes — typically a letter from a CPA, attorney, or registered broker-dealer, or evidence of qualifying income/net worth. We don't require you to upload tax returns or bank statements directly to RYDA.",
          },
          {
            type: "p",
            text: "If you want to drive but not own, rentals are the path. If you want to own, accreditation is the gate.",
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
    ],
  },

  // ── Buying & selling shares ──────────────────────────────────────
  {
    slug: "shares",
    icon: "$",
    title: "Buying & selling shares",
    blurb:
      "Share purchases, the Operating Agreement, the 12-month minimum hold, secondary-market sales.",
    articles: [
      {
        slug: "how-to-buy",
        q: "How do I buy a share?",
        summary:
          "Pick a vehicle, complete identity and accreditation checks, sign the Operating Agreement and Subscription Agreement, fund the share, you're closed.",
        body: [
          { type: "h3", text: "1. Pick the vehicle" },
          {
            type: "p",
            text: "Browse markets at /markets, pick a vehicle and a share. Each vehicle is a different LLC with its own Operating Agreement and capital structure.",
          },
          { type: "h3", text: "2. Identity verification (KYC)" },
          {
            type: "p",
            text: "We verify identity through Persona or an equivalent third-party. Government ID upload, selfie match, and address confirmation. Typically takes 5–10 minutes.",
          },
          { type: "h3", text: "3. Accreditation verification" },
          {
            type: "p",
            text: "Required by Reg D 506(c). You provide a letter from a CPA, attorney, or registered broker-dealer attesting to your accredited status. We accept most common formats.",
          },
          { type: "h3", text: "4. Documents" },
          {
            type: "p",
            text: "You'll review and sign two documents electronically: the LLC Operating Agreement (governs how the LLC and the co-owners interact) and the Subscription Agreement (your purchase of the specific share). Both are sent via secure e-signature.",
          },
          { type: "h3", text: "5. Funding" },
          {
            type: "p",
            text: "Wire or ACH the share price into the LLC's escrow account. RYDA holds funds in escrow until all signatures are collected, then releases to the LLC and your share is officially recorded.",
          },
          { type: "h3", text: "6. Onboarding" },
          {
            type: "p",
            text: "First booking can be scheduled the day funds clear. We schedule a 30-minute walkthrough on the vehicle (controls, etiquette, condition baseline) before your first drive.",
          },
        ],
      },
      {
        slug: "documents",
        q: "What documents will I sign?",
        summary:
          "Operating Agreement (governance) + Subscription Agreement (your specific purchase). Both via e-signature, both reviewed by counsel.",
        body: [
          { type: "h3", text: "Operating Agreement" },
          {
            type: "p",
            text: "The Operating Agreement governs the LLC: how decisions get made, fair-use rules, what happens if a co-owner stops paying, how the vehicle gets sold or replaced, voting thresholds, and dispute resolution. Standard length: 30–40 pages. We provide a 2-page plain-English summary alongside the full document.",
          },
          { type: "h3", text: "Subscription Agreement" },
          {
            type: "p",
            text: "Your specific share purchase: the share price, what you're getting, the 12-month minimum hold, the 3% transfer fee on resale, and your acknowledgment of the Reg D 506(c) offering and securities risks.",
          },
          { type: "h3", text: "Annual documents" },
          {
            type: "p",
            text: "Each year you'll receive an updated certificate of insurance, K-1 (for tax filing), an annual condition and service report on the vehicle, and a fair-market valuation update used for insurance and (when relevant) secondary-market pricing.",
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
        q: "What does a share actually entitle me to?",
        summary:
          "On a 6-share split: ~50 days and ~4,000 miles per year, voting rights on material LLC decisions, and a pro-rata claim on the asset and any sale proceeds.",
        body: [
          { type: "h3", text: "Usage" },
          {
            type: "p",
            text: "On the standard 6-share split, each share entitles you to roughly 50 days and 4,000 miles of vehicle usage per year. Days are booked on a shared calendar with the other co-owners. Fair-use rules cap consecutive days during peak season.",
          },
          { type: "h3", text: "Ownership" },
          {
            type: "p",
            text: "You own a registered LLC membership interest. If the LLC sells the vehicle (e.g., the group decides to replace it), proceeds are distributed pro-rata to all shareholders.",
          },
          { type: "h3", text: "Voting" },
          {
            type: "p",
            text: "Material decisions — selling the vehicle, performing modifications, replacing the vehicle — require a vote per the Operating Agreement (typically a 75% majority of shares). Routine maintenance, scheduling, and operations are handled by RYDA without a vote.",
          },
          { type: "h3", text: "What it does not include" },
          {
            type: "ul",
            items: [
              "Title to the vehicle (the LLC holds title; you hold a share of the LLC).",
              "Unilateral decision-making (you share authority with co-owners).",
              "Commercial use of the vehicle.",
            ],
          },
        ],
      },
      {
        slug: "selling",
        q: "Can I sell my share whenever I want?",
        summary:
          "After a 12-month minimum hold, yes — on the RYDA member-only secondary market. Settlement in 1–3 business days. RYDA charges a 3% transfer fee.",
        body: [
          {
            type: "p",
            text: "Yes, with two conditions:",
          },
          {
            type: "ul",
            items: [
              "12-month minimum hold from your purchase date. This is in the Operating Agreement to keep co-owner groups stable through at least one full year of use.",
              "The buyer must be a verified RYDA member with completed accreditation. We can't sell shares to outside parties because the offering is Reg D 506(c).",
            ],
          },
          {
            type: "p",
            text: "Once the hold period clears, list your share on the member secondary market through your dashboard. Set the asking price (we provide a fair-market reference based on recent comparable transactions and an updated vehicle valuation). Matching is automatic when a buyer accepts.",
          },
          {
            type: "p",
            text: "RYDA charges a 3% transfer fee on the sale price, deducted at settlement. Settlement is 1–3 business days; funds are wired to your account on file.",
          },
          {
            type: "callout",
            tone: "info",
            text: "If no buyer matches at your asking price, you can lower it, hold and re-list, or — in rare cases — RYDA may bid in to provide liquidity.",
          },
        ],
      },
      {
        slug: "pricing",
        q: "How is a share priced on the secondary market?",
        summary:
          "Reference price based on the current vehicle valuation (auction-adjusted) divided by share count, plus a recent-transaction adjustment. Sellers set their actual ask.",
        body: [
          {
            type: "p",
            text: "Two inputs determine the reference price you'll see on the markets page for any vehicle:",
          },
          {
            type: "ul",
            items: [
              "Current vehicle valuation. We pull from auction comparables (Bring a Trailer, RM Sotheby's, Mecum) and certified independent appraisals on a quarterly cadence. This sets the base value of the underlying asset.",
              "Recent member-to-member transactions. The most recent secondary-market trades on similar shares adjust the reference up or down.",
            ],
          },
          {
            type: "p",
            text: "Reference price = (current vehicle valuation + accrued reserves) ÷ share count, then adjusted by recent transaction premium or discount. Actual transactions can clear above or below the reference based on supply and demand.",
          },
          {
            type: "p",
            text: "You set your actual ask when listing. The reference is just a starting point — sellers in a hurry list below, sellers willing to wait list above.",
          },
        ],
      },
      {
        slug: "transfer-fee",
        q: "What's the 3% transfer fee?",
        summary:
          "A flat 3% of the sale price on every secondary-market share transfer, paid to RYDA. Covers transfer paperwork, KYC re-verification of the buyer, and registry updates.",
        body: [
          {
            type: "p",
            text: "Every share transfer through the RYDA secondary market carries a 3% fee on the sale price. It's deducted from seller proceeds at settlement.",
          },
          { type: "h3", text: "What the fee covers" },
          {
            type: "ul",
            items: [
              "Transfer paperwork and updated Operating Agreement signatures from the new co-owner.",
              "KYC and accreditation verification of the buyer.",
              "Updated certificates of insurance and reissued share certificate.",
              "Registry update with Delaware Division of Corporations.",
              "Onboarding of the new member into the booking calendar with the other co-owners.",
            ],
          },
          {
            type: "p",
            text: "It's competitive with — usually below — comparable structures (Pacaso charges 5%, fractional jet programs charge 5–10%). The fee is fixed and disclosed in the Subscription Agreement.",
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
          "Standard share = 4,000 miles/year. Overages billed at $4/mile. Track miles excluded under the track-day rider.",
        body: [
          {
            type: "p",
            text: "Each share gets ~4,000 miles per year on the standard 6-share split. Tracking is automatic from vehicle telemetry — you'll see real-time mileage status in your dashboard.",
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
          "Routine maintenance is paid from the LLC's annual reserve, funded by the 12% vehicle management fee. No surprise bills.",
        body: [
          {
            type: "p",
            text: "Routine maintenance is fully covered by the 12% annual management fee (charged to the LLC, not directly to members). The fee is set high enough to cover:",
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
            text: "The 12% rate is reviewed annually and may adjust if maintenance costs trend differently than projected. Any adjustment is a documented LLC decision with member notice.",
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
          "Through your dashboard. ACH for membership and large transactions, card for incidentals. Wire instructions are issued per share purchase.",
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
              "Wire transfer — used only for share purchases. Wire instructions are issued per transaction with the Subscription Agreement.",
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
            text: "12% of the vehicle's annual value, billed quarterly to the LLC, paid pro-rata by co-owners. So on a $340K Ferrari with 6 shares, your quarterly contribution is roughly $1,700.",
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
            text: "Monthly account statement summarizes membership status, all charges, all bookings, and all per-share LLC obligations. Annual K-1 (for tax filing) is issued each year by March 15.",
          },
        ],
      },
      {
        slug: "taxes",
        q: "Tax treatment of share ownership",
        summary:
          "RYDA shares are LLC membership interests. Most members receive a K-1 each year. Talk to your CPA — RYDA isn't tax counsel.",
        body: [
          {
            type: "callout",
            tone: "warn",
            text: "RYDA does not provide tax advice. Always consult your CPA or tax professional for your specific situation. The information below is educational, not advisory.",
          },
          { type: "h3", text: "What you receive" },
          {
            type: "p",
            text: "Each LLC issues an annual K-1 to all members by March 15 of the following year. The K-1 reports your pro-rata share of the LLC's income, expenses, gains, and losses for the year.",
          },
          { type: "h3", text: "What's typically reportable" },
          {
            type: "ul",
            items: [
              "Depreciation (typically the largest item — vehicles depreciate faster than real estate).",
              "Operating expenses (insurance, storage, maintenance reserves).",
              "Any gain or loss on sale of the vehicle (when the LLC sells or you sell your share on the secondary market).",
              "Mileage overage charges and other personal-use add-ons.",
            ],
          },
          { type: "h3", text: "The personal-use angle" },
          {
            type: "p",
            text: "Because shares carry usage rights, IRS rules around personal use of an LLC-owned asset apply. Most members treat their personal usage as a non-deductible distribution. Your CPA can structure this correctly for your situation.",
          },
        ],
      },
      {
        slug: "kyc",
        q: "KYC verification — what we collect and why",
        summary:
          "Government ID, selfie match, address proof. Required before any share purchase or member booking. Verified through Persona — RYDA never sees raw documents.",
        body: [
          { type: "h3", text: "What we collect" },
          {
            type: "ul",
            items: [
              "Government-issued photo ID (US driver's license, passport, or state ID).",
              "Selfie image for biometric match against the ID photo.",
              "Address verification (mailing address — used for billing, statements, K-1).",
              "Date of birth and SSN last-4 (for OFAC sanctions screening).",
            ],
          },
          { type: "h3", text: "Why we collect it" },
          {
            type: "p",
            text: "Two reasons: (1) regulatory — Reg D 506(c) and standard KYC/AML obligations require us to verify member identity for share purchases; (2) operational — we insure vehicles based on member verification, so misrepresenting identity voids coverage.",
          },
          { type: "h3", text: "Where it's stored" },
          {
            type: "p",
            text: "Documents are processed by Persona (or equivalent third-party). RYDA never sees raw ID images. We retain only the verification result, ID type, name, address, and DOB — encrypted, in our member system.",
          },
          { type: "h3", text: "Sharing" },
          {
            type: "p",
            text: "We don't share KYC data with anyone except (a) insurance carriers when adding you to a policy, (b) state/federal regulators when legally required, and (c) the buyer's KYC system on a secondary-market share transfer (limited fields, with your consent).",
          },
        ],
      },
      {
        slug: "close",
        q: "Closing my account",
        summary:
          "If you hold no shares: instant. If you hold shares: sell them on the secondary market first, then close. Settlement of any open obligations happens at closure.",
        body: [
          { type: "h3", text: "If you hold no shares" },
          {
            type: "p",
            text: "Email hello@ryda.com or use the close-account flow in your dashboard. We deactivate the account, cancel any auto-renewals, and email a final account statement. Membership data is retained per our privacy policy retention schedule.",
          },
          { type: "h3", text: "If you hold one or more shares" },
          {
            type: "p",
            text: "You'll need to exit your shares before closing the account. Two paths:",
          },
          {
            type: "ul",
            items: [
              "List on the secondary market and wait for a buyer (typical resolution: 30–90 days, depending on vehicle and ask).",
              "Request RYDA bid-in for liquidity (case-by-case, typically at a 5–10% discount to fair-market reference).",
            ],
          },
          {
            type: "p",
            text: "Once shares are sold and proceeds settled, we close the account on request. Outstanding management fees, mileage overages, or deductibles are settled from sale proceeds.",
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
      "Operating Agreement, Reg D 506(c), securities disclaimer, data privacy.",
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
              "Exit terms (12-month minimum hold, secondary-market mechanics, RYDA's bid-in option).",
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
        slug: "reg-d",
        q: "Reg D 506(c) and what it means",
        summary:
          "An SEC framework that lets us offer shares publicly without a full registration, as long as buyers are verified accredited investors.",
        body: [
          { type: "h3", text: "What Reg D 506(c) is" },
          {
            type: "p",
            text: "Rule 506(c) of SEC Regulation D, established by the JOBS Act and amended in 2020, allows companies to publicly advertise a private securities offering — but every buyer must be a verified accredited investor. It's the framework that lets RYDA market share availability on its public website while still operating as a private offering.",
          },
          { type: "h3", text: "Why it matters for RYDA" },
          {
            type: "ul",
            items: [
              "We can list available shares on /markets without violating SEC general-solicitation rules.",
              "Every share buyer must complete accreditation verification before closing — no exceptions.",
              "RYDA must keep accreditation evidence on file for at least 6 years.",
            ],
          },
          { type: "h3", text: "What 'accredited' means (basic)" },
          {
            type: "p",
            text: "An accredited investor under SEC rules is generally one of: $200K+ individual income (or $300K joint) for the past two years; net worth over $1M excluding primary residence; or holds certain professional certifications (Series 7, 65, or 82). The full SEC definition is broader.",
          },
        ],
      },
      {
        slug: "securities",
        q: "Are RYDA shares securities?",
        summary:
          "Yes — they're LLC membership interests offered under Reg D 506(c). The full Securities Disclaimer is on the legal page.",
        body: [
          {
            type: "p",
            text: "Yes. RYDA shares are LLC membership interests offered under SEC Regulation D, Rule 506(c). They are securities under federal law.",
          },
          { type: "h3", text: "What that means in practice" },
          {
            type: "ul",
            items: [
              "Buyers must be verified accredited investors at the time of purchase.",
              "Shares are subject to a 12-month minimum hold (Rule 144 / Operating Agreement).",
              "Resale is restricted to other verified RYDA members (the secondary market).",
              "RYDA files Form D with the SEC for each offering.",
            ],
          },
          { type: "h3", text: "What it doesn't mean" },
          {
            type: "p",
            text: "RYDA is not a registered broker-dealer or investment adviser. We don't provide investment advice and we don't guarantee any return. Vehicle ownership carries depreciation risk; secondary-market liquidity is not guaranteed.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Read the full Securities Disclaimer at /legal/disclaimer before purchasing any share. If you're unsure, talk to securities counsel.",
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
              "Buyer KYC systems on secondary-market transfers (limited fields, with your consent).",
            ],
          },
          { type: "h3", text: "Who we don't share with" },
          {
            type: "p",
            text: "We don't sell or rent member data. We don't share with advertising networks. We don't share with other RYDA LLCs you're not a member of. The full policy is at /legal/privacy.",
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
