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
      "Members drive ~30 days a year on a 10-share split. The math comes out to roughly $236 per day in steady-state ops cost once buy-in is amortized — about an order of magnitude below daily rental at $2,400 a day. The remaining 65 days each year are reserved for service and the optional rental pool so the cars don't burn out.",
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
    status: "published",
    body: [
      "The 296 GTB was supposed to be a compromise. A 120-degree V6 instead of a V8. A hybrid system instead of a naturally-aspirated banshee. Reviewers wrote about the politics of it for the entire 2022 launch year. Two years on, the 296 isn't a compromise — it's the most usable mid-engine Ferrari since the F355. The V6 makes 654 hp on its own; the e-motor adds another 165. The combined 819 hp drives the rear wheels through an 8-speed F1 dual-clutch. 0-60 happens in 2.9 seconds. None of that matters as much as the daily-drivability story underneath it.",
      "## What two years of CPO data actually shows",
      "Across the four 296 GTBs we've tracked through Ferrari North America's CPO program (independent inspection records, verified by our partner workshops in Miami, NY, and LA), reliability has been notably better than the F8 Tributo it replaced. The shorter wheelbase + electric front-axle assist removes a lot of the F8's heat-management stress on slow-speed crawl. We've seen one HPDF (high-pressure direct fuel) sensor swap covered under warranty. Zero powertrain incidents in 38,000 combined CPO miles.",
      "The hybrid battery is the obvious question. Ferrari's 8-year/unlimited-mile battery warranty covers it. Replacement cost outside warranty would be material — roughly $24K parts + labor on the current Ferrari North America rate sheet. We size LLC reserves on the 296 to cover one battery event over the 2-year hold even though the warranty makes it unlikely. That's the discipline of running the cars on someone else's behalf: the reserve is set to the realistic worst case, not the median.",
      "## Maintenance, in real numbers",
      "Annual service is straightforward — fluids, filters, brake-fluid flush every two years. Ferrari's 7-year scheduled-maintenance program covers most of it on a recently-titled CPO car, which is exactly the kind we buy. Tires (Michelin Pilot Sport 4S in the OE size) run about $2,400 a set; in normal RYDA rotation we replace once across a 2-year hold.",
      "Brakes (carbon-ceramic from the factory) effectively last the hold. A track-day rider — the optional uplift our members can bolt on for sanctioned events — does step up the wear, which is why track packages carry a separate per-event allocation rather than being included in steady-state ops.",
      "## The drive itself",
      "It's the throttle response that makes the 296 feel different. The e-motor fills in the bottom end of the torque curve so the V6 doesn't have to. You're never waiting for boost. Below 50 mph the car will run silently in eDrive — useful in a Coral Gables dawn run when you don't want to wake the neighborhood. Above that, the V6 wakes up and the noise is closer to a 458 than the F8's twin-turbo character.",
      "What we've heard from members across the test cars: this is a car you can drive every day if you have a daily that's wrong for you. It eats highway miles in eDrive + V6 cruise mode (real 22 mpg combined isn't unusual). It scares you in Race mode. It does not require ceremony to start. That last part — no warmup ritual, no fluid temps to babysit before you can drive normally — is what makes the 296 the right first share for a member who wants real exotic-car ownership without a part-time hobby attached.",
      "## What to expect at year three",
      "Year three is when residuals start to compress on the 296. By then the SF90 successor will be on dealer lots, and the V12 12Cilindri will have shaken out of its launch premium. We model 10% depreciation across the 2-year hold and exit before year three intentionally — the buy-in returns roughly 90% of buy-in to members at LLC dissolution, modeled at current Hagerty/HagertyValuationTools comparables. Real residuals will of course depend on real market conditions at the actual exit; the conservatism is intentional.",
      "## Bottom line",
      "If you'd genuinely drive a Ferrari 30 to 60 days a year and you don't want to manage one, the 296 GTB is the share to pick. Lower carry, higher reliability, no compromise on the experience.",
    ],
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
    status: "published",
    body: [
      "If you're comparing supercar co-ownership to a supercar club, the most important question isn't price. It's the legal shape of what you're buying. The wrapper determines what happens to your money if the platform fails, who has authority over the car, and whether your 'share' is actually an asset or a contract right.",
      "## What a Delaware LLC actually is",
      "A Delaware Limited Liability Company is a business entity that holds title to property — in our case, a single specific vehicle. Each LLC at RYDA holds exactly one car. The members of the LLC (you and up to nine other co-owners) are the legal owners of the company that owns the car. Delaware was a deliberate choice: it has the best-tested corporate case law in the country, predictable courts, and statutes that make member-managed governance straightforward.",
      "When you 'buy a share,' you're being added to the LLC's member register. That's a registered, transferable ownership interest — not a contract right against a sponsor.",
      "## What 'member-managed' means and why we picked it",
      "An LLC can be structured two ways: manager-managed (a sponsor or fund makes decisions on behalf of passive investors) or member-managed (the members themselves vote on material questions). RYDA LLCs are member-managed. You and your co-owners hold authority over: any sale or replacement of the vehicle (75% supermajority required), modifications, additional capital calls, and replacement of operational service providers.",
      "This is not a cosmetic choice. Manager-managed LLCs that look like collective investments have, in some cases, been treated as securities by the SEC under Howey. Member-managed LLCs where the members govern the asset more closely resemble country-club, yacht-club, and jet-card structures — which the SEC has historically not regulated as securities. We engaged corporate counsel before forming the first LLC and built the governance to sit firmly in the latter category.",
      "## How a club membership compares",
      "A club membership is a contract. You pay an annual fee (often $30,000–$80,000) for a defined number of access days. The club owns the cars. If the club shuts down, the cars go to the lender, the operator, or the receiver — not to the members. The membership has no asset backing.",
      "That's not a flaw in the club model. It's the model. Clubs trade asset-backing for variety: rotating fleet, predictable annual budgeting, no commitment. They make sense for a specific kind of buyer.",
      "## The four practical differences",
      "First — title. The LLC owns the car. Your share is a registered membership interest in that LLC. A club fee buys you days of usage; the operator owns the asset.",
      "Second — failure scenarios. If RYDA the company shut down tomorrow, the LLCs survive: members appoint a new operating service provider (the Management Services Agreement is between the LLC and RYDA, not the LLC and members), and the cars are unaffected. If a club shut down, members lose access immediately.",
      "Third — exit. At the end of the 2-year hold, the LLC sells the car and distributes proceeds pro-rata to members. Modeled residual is roughly 90% of buy-in; actual depends on market. A club membership is consumed annually with no exit value.",
      "Fourth — governance. As a co-owner you vote on questions about your specific car. As a club member, the operator chooses what's in the fleet and you accept whatever rotates through.",
      "## What the LLC structure isn't",
      "It isn't an investment. The car will depreciate. Co-ownership shares are not registered securities and are not offered for investment purposes. The case for buying one isn't a return — it's that you'd actually drive a Ferrari 30 to 60 days a year and the math beats the alternative ways to do that.",
      "It also isn't a tax shelter. RYDA does not provide tax advice; consult your accountant. The LLC files a partnership return; depreciation passes through. None of which is a reason to buy a share — it's only a feature for members who'd already drive the car.",
      "## Bottom line",
      "A share in a member-managed Delaware LLC is asset-backed. You're a registered owner of a company that owns a car. A club membership is a contract for access. Both are legitimate products. They are not interchangeable, and the platforms that conflate them are doing it on purpose.",
    ],
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
