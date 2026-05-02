import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { POSTS, getPost } from "@/lib/journal-content";

export async function generateStaticParams() {
  return POSTS.filter((p) => p.status === "published").map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Journal — RYDA" };
  return {
    title: `${post.title}, RYDA Journal`,
    description: post.excerpt,
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

  return (
    <>
      <SiteHeader />

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
