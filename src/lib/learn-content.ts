// Educational hub content — Round 2 research recommendation.
// Modeled on Kocomo's /learn taxonomy (Discover → Find → Buy → Relax
// → Earn → Enjoy) but adapted to RYDA's car/yacht buyer journey:
// Understand → Choose → Buy → Drive → Exit.
//
// Each article is a 600-1200 word buyer-confidence piece. Don't put
// policy here — that lives in /faq, /how-it-works, and the operating
// agreement. /learn is for "I'm thinking about this, help me decide"
// content.
//
// Slugs are kebab-case and stable; don't change them after publish
// or you'll break the SEO + internal links.

export type LearnStage = {
  slug: string;
  label: string;
  intro: string;
  description: string;
};

export type LearnArticle = {
  slug: string;
  stage: string;          // matches LearnStage.slug
  title: string;
  excerpt: string;        // ~30-word summary for cards
  readMinutes: number;
  // Body is stub for now — published as we build the editorial
  // calendar. The shell ships with intro paragraphs only.
  intro: string;
};

export const LEARN_STAGES: LearnStage[] = [
  {
    slug: "understand",
    label: "Understand",
    intro: "What you're actually buying",
    description:
      "Start here. The structural difference between RYDA, a timeshare, a registered fund, and solo ownership — explained without jargon.",
  },
  {
    slug: "choose",
    label: "Choose",
    intro: "Picking your share + your car",
    description:
      "How to size your share, read a provenance timeline, spot service-history red flags, and decide whether you want to drive 30 days or 100.",
  },
  {
    slug: "buy",
    label: "Buy",
    intro: "From application to keys",
    description:
      "What the closing checklist actually looks like, what's in the operating agreement, what to expect in your first 30 days.",
  },
  {
    slug: "drive",
    label: "Drive",
    intro: "Day-to-day as a co-owner",
    description:
      "Booking your first F1 weekend, peak windows, telematics privacy, what we cover and what you handle.",
  },
  {
    slug: "exit",
    label: "Exit",
    // Audit T1.2: "Liquidity" was on the SEC-banlist for new affirmative
    // uses. "Exits without a marketplace" carries the same idea without
    // the regulated-securities-vocabulary risk.
    intro: "Exits without a marketplace",
    description:
      "Both paths — planned exit at year 2 and early member-to-member transfer — explained mechanically, plus tax handling and estate transfer.",
  },
];

export const LEARN_ARTICLES: LearnArticle[] = [
  // UNDERSTAND
  {
    slug: "what-you-actually-own",
    stage: "understand",
    title: "What you actually own",
    excerpt:
      "A RYDA share is a membership interest in a single-purpose LLC that holds title to one specific vehicle. Not a security, not a timeshare, not a token.",
    readMinutes: 5,
    intro:
      "When you buy a RYDA share, you become a member of a single-purpose LLC that holds clear title to one specific car or yacht. Your share is a membership interest in that LLC, recorded on the LLC's member register, governed by the operating agreement you sign at closing. It's not a financial instrument issued by RYDA. It's not a token on a blockchain. It's not a right to use the car for a fixed week each year (that's a timeshare). And it's not a stake in RYDA the company. The distinction matters for taxes, for exit timing, and for what you can actually expect from us.",
  },
  {
    slug: "ryda-vs-timeshare-vs-jet-card",
    stage: "understand",
    title: "RYDA vs. timeshare vs. jet card",
    excerpt:
      "Three structures that look similar from a brochure but operate completely differently. Why a member-managed LLC sits in a different legal universe than a timeshare or a fractional jet card.",
    readMinutes: 6,
    intro:
      "From a brochure, RYDA, a timeshare, and a fractional jet card all read the same: 'pay less than full ownership, get more than rental.' Underneath, they're three different structures with three different sets of rights, exit paths, and tax treatments. A timeshare deeds you a calendar week — you don't own an asset, you own a recurring usage right. A fractional jet card prepays flight hours against a fleet — you don't own the aircraft, you own a service contract. RYDA puts your name on an LLC member register — you own a membership interest in a single-purpose entity that holds title to one specific car or yacht. Three different brochure pitches, three different structures, three different exit paths.",
  },

  // CHOOSE
  {
    slug: "sizing-your-share",
    stage: "choose",
    title: "How to size your share",
    excerpt:
      "Most members hold the 2-share minimum. Here's the math on when 2, 5, or 10 shares makes sense — and the multi-vehicle portfolio approach.",
    readMinutes: 4,
    intro:
      "Every RYDA vehicle is split into 10 shares with a 2-share minimum per person. The default math: 1 share = ~32 days/year + 3,200 miles. 2 shares = ~64 days. 5 shares = ~160 days. 10 shares = effectively solo ownership with a professional-ops layer on top. The right number for you depends on three questions: how often do you actually want to drive, how much capital do you want deployed in any one car, and how much variety do you want across the portfolio?",
  },
  {
    slug: "reading-a-provenance-timeline",
    stage: "choose",
    title: "Reading a provenance timeline",
    excerpt:
      "Build date, first owner, mileage at acquisition, service partner. What each line on the timeline tells you about residual value at year 2.",
    readMinutes: 5,
    intro:
      "Every RYDA listing has a four-stage provenance timeline: Built (factory + month/year), First-owner delivery, Acquired by RYDA, Operations begin. The timeline is a quick-read residual-value signal. A car built in March, delivered to a single private collector, garage-kept under factory-authorized service, acquired with full records — that's the curve we model the resale on. A car that's bounced through three owners in 18 months with gaps in the service log is a different story. Here's how to read each line.",
  },

  // BUY
  {
    slug: "the-closing-checklist",
    stage: "buy",
    title: "The closing checklist",
    excerpt:
      "Every step from 'I want this share' to 'the keys are mine.' Identity verification, OA review, escrow, member register update.",
    readMinutes: 7,
    intro:
      "RYDA closings happen in five steps over 7-14 calendar days. (1) Identity + driver-record verification. (2) Operating Agreement review with your counsel — RYDA's standard OA is on every listing as a sample, redlined comments are welcomed. (3) Wire to escrow (or ACH for under $50K). (4) RYDA executes the membership-interest assignment, updates the LLC member register, files the OA amendment. (5) Welcome packet with your member dashboard link and the booking calendar opens.",
  },
  {
    slug: "first-30-days",
    stage: "buy",
    title: "Your first 30 days as a member",
    excerpt:
      "Onboarding call, garage tour, first booking. What to expect week-by-week.",
    readMinutes: 4,
    intro:
      "The first 30 days are deliberately structured. Day 1: welcome packet + portal access. Day 1-7: 30-minute onboarding call with the ops lead, walks you through the booking calendar, telematics consent, and how to flag your first peak window. Day 7-14: optional in-person garage tour at the Wynwood storage facility, meet the service partners, see the car. Day 14-30: book your first reservation when you're ready. There's no clock that demands you drive in your first month — but most members do, because that's the point.",
  },

  // DRIVE
  {
    slug: "how-peak-windows-work",
    stage: "drive",
    title: "How peak windows work in Miami",
    excerpt:
      "F1 GP, Art Basel, NYE. Eight named peak windows, one protected pick per share, then rotation. Calendar-fairness enforced by code.",
    readMinutes: 6,
    intro:
      "Miami has eight peak windows that drive the booking calendar: Boat Show (mid-Feb), Spring Break + Ultra (late March), F1 Grand Prix (early May), Memorial Day, Fourth of July, Art Basel (first week of December), Holiday week + NYE, and Super Bowl host year. The fairness rule: every share gets one protected peak window per year before any co-owner can claim a second. After everyone's used their first, the calendar opens for second picks in claim order. No member can hold more than 30% of the next 90 days on any single vehicle. Calendar-fairness enforced by code, not by polite asks.",
  },

  // EXIT
  {
    slug: "the-two-exit-paths",
    stage: "exit",
    title: "The two exit paths",
    excerpt:
      "Planned exit at year 2 (the default) vs. early member-to-member transfer (after 12-month minimum hold). Mechanics, timing, fees.",
    readMinutes: 8,
    intro:
      "Every RYDA LLC has two ways out. The default: a planned exit at the 2-year mark or 60K-mile cap, whichever comes first. RYDA collects three independent bids, qualifies any unsolicited offer with proof of funds + escrow, and the LLC votes 75% supermajority to confirm. A 5%+ competing qualified offer mid-vote pauses and resets the vote around the higher bid. Sale closes through escrow, proceeds distribute pro-rata to members within 14 days. The alternate path, available after a 12-month minimum hold: transfer your share directly to another verified RYDA member. RYDA handles the LLC paperwork (3% transfer fee). No marketplace, no auction, no public price ticker.",
  },
];

export function getStage(slug: string): LearnStage | undefined {
  return LEARN_STAGES.find((s) => s.slug === slug);
}

export function getArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}

export function articlesByStage(stageSlug: string): LearnArticle[] {
  return LEARN_ARTICLES.filter((a) => a.stage === stageSlug);
}
