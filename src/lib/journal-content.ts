// Long-form journal posts. The first one is finished and shippable; the
// rest are stub-summaries marked "Coming at launch" until they're written.

export type JournalPost = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  authorRole?: string;
  date: string;
  readTime: string;
  tag: string;
  status: "published" | "draft";
  /**
   * Plain text body, paragraph-per-string. Headings start with `## `.
   */
  body?: string[];
};

export const POSTS: JournalPost[] = [
  {
    slug: "why-fractional-supercars-now",
    title: "Why fractional supercar ownership, and why now",
    excerpt:
      "Fractional ownership has been the right answer in real estate, aviation, and art for decades. The math for exotic vehicles is the same — and three things changed in the last five years that made it actually work.",
    author: "Ryan Galli",
    authorRole: "Co-founder",
    date: "Apr 27, 2026",
    readTime: "6 min read",
    tag: "Founder note",
    status: "published",
    body: [
      "I rented a Lamborghini in Miami one weekend in 2023. By Sunday night, my partner Dave and I were running the math at a Cuban diner on Calle Ocho. The rental was $4,200 for three days. Buying the same car outright was about $300,000, plus $80,000 a year before you turn the key. The middle option — the one wealthy Europeans had used for a decade — didn't exist in the US.",
      "Three years later it does. Here's why now is the right moment, and what we got from a decade of watching the model work elsewhere.",
      "## Fractional ownership solves a math problem the wealthy have had forever",
      "The economic case for fractional ownership is older than this magazine. NetJets sells you 1/16th of a Gulfstream because no one — not even the people who can afford the whole plane — actually wants the carrying cost of an asset that sits idle 90% of the time. Yacht owners syndicate. Real estate funds slice high-rises into REITs. Galleries sell shares of Picassos.",
      "The supercar version has been operating in Switzerland since 2014 (Supercar Sharing AG, ~1,300 members, CHF 34M in transactions). The structure is sound. The buyer pool exists. What was missing was the US legal scaffolding and the operational team that could run it the way Americans expect — concierge-grade, app-based, and clear about who owns what.",
      "## Three things changed in the last five years",
      "First, the SEC's posture clarified. The line between a member-managed LLC (where members vote on material decisions) and a manager-managed LLC (where a sponsor runs the show on behalf of passive investors) is now well-tested case law. Co-ownership platforms that built the second got hit. Platforms that built the first — country clubs, yacht clubs, NetJets jet cards — kept operating.",
      "Second, insurance carriers started writing multi-named-insured fleet policies for vehicles over $300K. Hagerty, Travelers, and CHUBB all do it now. They didn't five years ago. Without that, a co-ownership LLC was uninsurable.",
      "Third, the fleet itself changed. CPO programs from Ferrari, McLaren, and Lamborghini now ship with active warranties on the powertrain — meaning a co-ownership LLC isn't inheriting someone else's deferred maintenance. The Pre-Purchase Inspection process (every car gets one before any share is sold) catches what the warranty doesn't.",
      "## What we copied from Switzerland and what we changed",
      "Supercar Sharing AG had ten years to learn what works. The structure — small group of co-owners, single-purpose holding entity, professional operations — we kept. The legal wrapper (Swiss AG vs. Delaware LLC), the daily entitlement model, the transfer mechanics, and the storage protocol — those we rebuilt for American markets.",
      "We also did one thing they didn't: every RYDA vehicle is Certified Pre-Owned with an active manufacturer or independent CPO warranty. The LLC is buying a known asset, not a maintenance gamble.",
      "## Where this lands",
      "The product is quiet on purpose. RYDA isn't a fund, isn't a marketplace, isn't a club. Each vehicle is a Delaware LLC. You're a registered co-owner of a real car alongside up to nine other verified members. We're hired by the LLC to run operations — sourcing, storage, insurance, scheduling, maintenance, transfers — under a separate Management Services Agreement.",
      "Members drive ~34 days a year on a 10-share split. The math comes out to roughly $208 per day all-in once buy-in is amortized — about an order of magnitude below daily rental at $2,500 a day. We bake 25 days of service and downtime into the calendar so the cars don't burn out.",
      "## What's next",
      "Miami launches Q3 2026. We're vetting our first 100 founding members now. If you've ever stared at a Ferrari in your driveway and known you'd drive it ten times a year, this was built for you.",
    ],
  },
  {
    slug: "ferrari-296-gtb-deep-dive",
    title: "The Ferrari 296 GTB, two years in",
    excerpt:
      "What it's like to actually live with a hybrid V6 Ferrari. Real reliability data, real maintenance costs, what to expect at year three.",
    author: "RYDA Team",
    date: "Apr 22, 2026",
    readTime: "9 min read",
    tag: "Vehicle deep-dive",
    status: "draft",
  },
  {
    slug: "supercar-sharing-ag",
    title: "What Switzerland figured out 10 years ago",
    excerpt:
      "Supercar Sharing AG has been operating in Europe since 2014. What they got right, what we'd do differently, and why none of it crossed the Atlantic.",
    author: "Ryan Galli",
    date: "Apr 15, 2026",
    readTime: "7 min read",
    tag: "Market analysis",
    status: "draft",
  },
  {
    slug: "delaware-llc-vs-club-membership",
    title: "Delaware LLC vs. club membership: why the structure matters",
    excerpt:
      "The legal wrapper around your share is the difference between owning an asset and holding a club point. Plain-English breakdown.",
    author: "RYDA Legal",
    date: "Apr 8, 2026",
    readTime: "5 min read",
    tag: "Operations",
    status: "draft",
  },
  {
    slug: "why-miami-first",
    title: "Why we picked Miami first",
    excerpt:
      "Density of exotic-car ownership, year-round driving, no state income tax, and a culture that fits the RYDA model. Plus the hard data.",
    author: "Ryan Galli",
    date: "Mar 30, 2026",
    readTime: "8 min read",
    tag: "Founder note",
    status: "draft",
  },
];

export function getPost(slug: string): JournalPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function publishedPosts() {
  return POSTS.filter((p) => p.status === "published");
}
