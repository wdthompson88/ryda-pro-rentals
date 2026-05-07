import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { POSTS, getPost } from "@/lib/journal-content";
import { SITE_URL, toIsoDate } from "@/lib/site-url";

export async function generateStaticParams() {
  return POSTS.filter((p) => p.status === "published").map((p) => ({
    slug: p.slug,
  }));
}

// Default OG image for journal posts. Posts don't carry their own
// hero photos yet (text-only long-form by design), so social
// platforms fall back to the brand banner. Replace with per-post
// art when we add it to JournalPost.
const DEFAULT_JOURNAL_OG = `${SITE_URL}/opengraph-image`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Journal — RYDA" };
  const url = `${SITE_URL}/journal/${post.slug}`;
  const isoDate = toIsoDate(post.date);
  return {
    title: `${post.title} — RYDA Journal`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      siteName: "RYDA",
      publishedTime: isoDate,
      authors: [post.author],
      tags: [post.tag],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post || post.status !== "published") notFound();
  if (!post.body) notFound();

  // SEO: Article JSON-LD makes the post eligible for Google's
  // article-result rich snippet (headline + author + date in SERP)
  // — meaningful uplift on long-form posts like /journal where we
  // out-rank short blog posts on the same query. Generated from the
  // same `post` object that renders the visible body so they can't
  // drift. The "<" -> "<" escape prevents script-context
  // breakout if a future post ever contains a literal "</script>".
  // `image` is required by Google's Article rich-result spec; we
  // fall back to the brand banner because posts are text-only.
  // `datePublished` is normalized to ISO 8601 (toIsoDate) — the
  // human-readable POSTS.date strings ("Apr 27, 2026") aren't a
  // valid datePublished value for Google.
  const postUrl = `${SITE_URL}/journal/${post.slug}`;
  const isoDate = toIsoDate(post.date);
  const wordCount = post.body.reduce(
    (sum, p) => sum + p.split(/\s+/).filter(Boolean).length,
    0,
  );
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": postUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    url: postUrl,
    headline: post.title,
    description: post.excerpt,
    articleSection: post.tag,
    image: [DEFAULT_JOURNAL_OG],
    wordCount,
    datePublished: isoDate,
    dateModified: isoDate,
    author: {
      "@type": post.author === "RYDA Team" || post.author.startsWith("RYDA ")
        ? "Organization"
        : "Person",
      name: post.author,
      ...(post.authorRole ? { jobTitle: post.authorRole } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "RYDA",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
      },
    },
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
        <Link
          href="/journal"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← Journal
        </Link>

        <p className="mt-8 text-xs uppercase tracking-wider text-red">{post.tag}</p>
        <h1 className="mt-3 font-display text-4xl font-light leading-[1.1] text-ink sm:text-5xl">
          {post.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-mute">
          <span className="font-medium text-ink-soft">{post.author}</span>
          {post.authorRole && (
            <>
              <span>·</span>
              <span>{post.authorRole}</span>
            </>
          )}
          <span>·</span>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>

        <div className="mt-12 space-y-6 text-base leading-relaxed text-ink-soft">
          {post.body.map((paragraph, i) => {
            if (paragraph.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="mt-12 font-display text-2xl text-ink sm:text-3xl"
                >
                  {paragraph.slice(3)}
                </h2>
              );
            }
            return <p key={i}>{paragraph}</p>;
          })}
        </div>

        <div className="mt-16 border-t border-rule pt-10">
          <p className="text-xs font-medium uppercase tracking-wider text-mute">
            More from the journal
          </p>
          <ul className="mt-6 space-y-3">
            {POSTS.filter((p) => p.slug !== post.slug)
              .slice(0, 3)
              .map((p) =>
                p.status === "published" ? (
                  <li key={p.slug}>
                    <Link
                      href={`/journal/${p.slug}`}
                      className="block rounded-xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
                    >
                      <p className="text-xs uppercase tracking-wider text-red">
                        {p.tag}
                      </p>
                      <p className="mt-2 font-display text-base text-ink">
                        {p.title}
                      </p>
                      <p className="mt-2 text-xs font-medium text-red">
                        Read →
                      </p>
                    </Link>
                  </li>
                ) : (
                  <li
                    key={p.slug}
                    className="rounded-xl border border-rule bg-surface p-5"
                  >
                    <p className="text-xs uppercase tracking-wider text-red">
                      {p.tag}
                    </p>
                    <p className="mt-2 font-display text-base text-ink">
                      {p.title}
                    </p>
                    <p className="mt-2 text-xs text-mute italic">
                      Coming at launch
                    </p>
                  </li>
                ),
              )}
          </ul>
        </div>
      </article>
    </>
  );
}
