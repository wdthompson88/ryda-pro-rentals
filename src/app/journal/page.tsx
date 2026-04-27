import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Journal — RYDA",
  description:
    "RYDA Journal — long-form on supercar co-ownership, vehicle deep-dives, founder posts, and the business behind the brand.",
};

const POSTS = [
  {
    slug: "why-pacaso-for-supercars",
    title: "Why we're building Pacaso for supercars (and why now)",
    excerpt:
      "The fractional ownership model has worked in real estate, aviation, and art. The math for exotic vehicles is the same — and the timing has never been better.",
    author: "Ryan Galli",
    date: "Apr 27, 2026",
    readTime: "6 min read",
    tag: "Founder note",
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
  },
  {
    slug: "supercar-sharing-ag",
    title: "What Switzerland figured out 10 years ago",
    excerpt:
      "Supercar Sharing AG has been operating in Europe since 2014. Here's what they got right, what we'd do differently, and why none of it has crossed the Atlantic.",
    author: "Ryan Galli",
    date: "Apr 15, 2026",
    readTime: "7 min read",
    tag: "Market analysis",
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
  },
];

export default function JournalPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Journal
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            How we think about cars,{" "}
            <span className="italic text-red">in long form.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-ink-soft">
            Founder notes, vehicle deep-dives, market analysis, and the
            occasional opinion piece. No SEO bait. Read what's useful.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <Link href="#" className="block group">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream/30">
                <div className="flex h-full items-center justify-center text-sm text-mute">
                  Featured image
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-red">{POSTS[0].tag}</p>
                <h2 className="mt-3 font-display text-3xl font-light text-ink transition-colors group-hover:text-red sm:text-4xl">
                  {POSTS[0].title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink-soft">
                  {POSTS[0].excerpt}
                </p>
                <div className="mt-6 flex items-center gap-3 text-xs text-mute">
                  <span className="font-medium text-ink">{POSTS[0].author}</span>
                  <span>·</span>
                  <span>{POSTS[0].date}</span>
                  <span>·</span>
                  <span>{POSTS[0].readTime}</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Post grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Recent</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.slice(1).map((p) => (
              <Link
                key={p.slug}
                href="#"
                className="group block rounded-2xl border border-rule bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <p className="text-xs uppercase tracking-wider text-red">{p.tag}</p>
                <h3 className="mt-2 font-display text-xl text-ink transition-colors group-hover:text-red">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.excerpt}</p>
                <div className="mt-5 flex items-center gap-3 text-xs text-mute">
                  <span className="font-medium text-ink-soft">{p.author}</span>
                  <span>·</span>
                  <span>{p.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Get new posts when they drop.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            One email per post. No marketing, no upsells, no daily digest.
            Unsubscribe whenever.
          </p>
          <form className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="you@email.com"
              className="h-12 flex-1 rounded-full border border-cream/20 bg-cream/5 px-5 text-cream placeholder:text-cream/50 focus:border-red focus:outline-none"
            />
            <button
              type="button"
              className="h-12 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
