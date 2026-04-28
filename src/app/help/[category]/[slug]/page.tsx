import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { HELP, getArticle, type HelpBlock } from "@/lib/help-content";

export async function generateStaticParams() {
  return HELP.flatMap((c) =>
    c.articles.map((a) => ({ category: c.slug, slug: a.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const found = getArticle(category, slug);
  if (!found) return { title: "Help — RYDA" };
  return {
    title: `${found.article.q} — RYDA Help`,
    description: found.article.summary,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const found = getArticle(category, slug);
  if (!found) notFound();
  const { category: cat, article } = found;

  const related = cat.articles.filter((a) => a.slug !== article.slug).slice(0, 4);

  return (
    <>
      <SiteHeader />

      <article className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-20">
          {/* Breadcrumb */}
          <nav className="text-xs uppercase tracking-wider text-mute">
            <Link href="/help" className="hover:text-ink">
              Help
            </Link>{" "}
            <span className="px-2 text-rule">/</span>
            <Link href={`/help/${cat.slug}`} className="hover:text-ink">
              {cat.title}
            </Link>
          </nav>

          {/* Title + summary */}
          <h1 className="mt-6 font-display text-4xl font-light leading-[1.1] text-ink sm:text-5xl">
            {article.q}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            {article.summary}
          </p>

          {/* Body */}
          <div className="mt-10 space-y-5 text-base leading-relaxed text-ink-soft">
            {article.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>

          {/* Footer meta */}
          <div className="mt-16 flex flex-col gap-4 rounded-2xl border border-rule bg-cream-2 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-base text-ink">Was this helpful?</p>
              <p className="mt-1 text-xs text-mute">
                If not, write us — we improve articles based on what members
                actually ask.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink hover:border-ink"
            >
              Contact us
            </Link>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-b border-rule bg-cream-2">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-wider text-mute">
              More in {cat.title}
            </p>
            <ul className="mt-4 space-y-2">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/help/${cat.slug}/${a.slug}`}
                    className="block rounded-xl border border-rule bg-surface px-5 py-4 text-sm text-ink-soft hover:text-ink"
                  >
                    <span className="text-red">→</span> {a.q}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

function Block({ block }: { block: HelpBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "ul":
      return (
        <ul className="ml-5 list-disc space-y-2">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "h3":
      return <h3 className="mt-8 font-display text-xl text-ink">{block.text}</h3>;
    case "callout":
      return (
        <div
          className={`rounded-xl border px-5 py-4 text-sm ${
            block.tone === "warn"
              ? "border-red/40 bg-red/5 text-ink"
              : "border-rule bg-surface text-ink"
          }`}
        >
          {block.text}
        </div>
      );
  }
}
