import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { POSTS } from "@/lib/journal-content";
import { InlineEmailCapture } from "@/components/inline-email-capture";

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
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-mute">
            Journal
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            How we think about cars,{" "}
            <span className="italic">in long form.</span>
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

      {/* Subscribe — inline email capture posts to the waitlist with
          source="journal-newsletter" so the team can send a one-off
          email per post (or batch monthly) to subscribers separately
          from membership leads. */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-2xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Get new posts when they drop.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            One email per post. No marketing, no upsells, no daily digest.
            Unsubscribe whenever.
          </p>
          <div className="mx-auto mt-8 max-w-md">
            <InlineEmailCapture source="journal-newsletter" />
          </div>
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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
      {/* Editorial pull quote treatment instead of a stock-photo
          placeholder. The featured post leads with a quiet, oversized
          tag block — Loro Piana / The Row pattern — and the headline
          carries the visual weight without an image stub. */}
      <div className="lg:col-span-4">
        <p className="font-display text-[10px] uppercase tracking-[0.22em] text-mute">
          Featured · {post.tag}
        </p>
        <p className="mt-6 font-display text-xl italic text-ink-soft sm:text-2xl">
          &ldquo;{post.excerpt.split(".")[0]}.&rdquo;
        </p>
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-mute">
          {post.date} · {post.readTime}
        </p>
      </div>
      <div className="lg:col-span-8">
        <p className="font-display text-[10px] uppercase tracking-[0.22em] text-mute">
          {post.tag}
        </p>
        <h2
          className={`mt-3 font-display text-4xl font-light leading-tight text-ink sm:text-5xl ${
            clickable ? "transition-colors group-hover:text-red" : ""
          }`}
        >
          {post.title}
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-soft sm:text-base">
          {post.excerpt}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-mute">
          <span className="font-medium text-ink">{post.author}</span>
          <span>·</span>
          <span>
            {post.status === "published" ? "Read the essay →" : "Coming at launch"}
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
