import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { POSTS } from "@/lib/journal-content";

export const metadata = {
  title: "Journal — RYDA",
  description:
    "RYDA Journal — long-form on supercar co-ownership, vehicle deep-dives, founder posts, and the business behind the brand.",
};

export default function JournalPage() {
  const featured = POSTS[0];
  const rest = POSTS.slice(1);

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
          {featured.status === "published" ? (
            <Link href={`/journal/${featured.slug}`} className="group block">
              <FeaturedCard post={featured} clickable />
            </Link>
          ) : (
            <FeaturedCard post={featured} clickable={false} />
          )}
        </div>
      </section>

      {/* Post grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Recent</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) =>
              p.status === "published" ? (
                <Link
                  key={p.slug}
                  href={`/journal/${p.slug}`}
                  className="group block rounded-2xl border border-rule bg-surface p-6 transition-shadow hover:shadow-md"
                >
                  <PostCardBody post={p} clickable />
                </Link>
              ) : (
                <div
                  key={p.slug}
                  className="block rounded-2xl border border-rule bg-surface p-6"
                >
                  <PostCardBody post={p} clickable={false} />
                </div>
              ),
            )}
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
          <Link
            href="/contact?type=Other#form"
            className="mx-auto mt-8 inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
          >
            Email us to subscribe
          </Link>
          <p className="mx-auto mt-3 max-w-xs text-xs text-cream/40">
            Newsletter signup ships with the Miami launch.
          </p>
        </div>
      </section>
    </>
  );
}

function FeaturedCard({
  post,
  clickable,
}: {
  post: (typeof POSTS)[number];
  clickable: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream/30">
        <div className="flex h-full items-center justify-center text-sm text-mute">
          Featured image
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-red">{post.tag}</p>
        <h2
          className={`mt-3 font-display text-3xl font-light leading-tight text-ink sm:text-4xl ${
            clickable ? "transition-colors group-hover:text-red" : ""
          }`}
        >
          {post.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          {post.excerpt}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-mute">
          <span className="font-medium text-ink">{post.author}</span>
          <span>·</span>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readTime}</span>
          <span>·</span>
          <span className="italic">
            {post.status === "published" ? "Read →" : "Coming at launch"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PostCardBody({
  post,
  clickable,
}: {
  post: (typeof POSTS)[number];
  clickable: boolean;
}) {
  return (
    <>
      <p className="text-xs uppercase tracking-wider text-red">{post.tag}</p>
      <h3
        className={`mt-2 font-display text-xl text-ink ${
          clickable ? "transition-colors group-hover:text-red" : ""
        }`}
      >
        {post.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-mute">
        <span className="font-medium text-ink-soft">{post.author}</span>
        <span>·</span>
        <span>{post.date}</span>
        <span>·</span>
        <span className="italic">
          {post.status === "published" ? "Read →" : "Coming at launch"}
        </span>
      </div>
    </>
  );
}
