// /learn/[slug] — individual learn article. The body is intentionally
// stub-shaped right now: an intro paragraph + "in editorial" note.
// We ship the shell so internal links + SEO sitemap entries land
// before launch; full bodies fill in via editorial calendar.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  LEARN_ARTICLES,
  getArticle,
  getStage,
  articlesByStage,
} from "@/lib/learn-content";

export async function generateStaticParams() {
  return LEARN_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Learn — RYDA" };
  return {
    title: `${article.title} — RYDA Learn`,
    description: article.excerpt,
  };
}

export default async function LearnArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const stage = getStage(article.stage);
  const siblings = articlesByStage(article.stage).filter(
    (a) => a.slug !== article.slug,
  );

  return (
    <>
      <SiteHeader />

      {/* Article hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
          <Link
            href={`/learn#${article.stage}`}
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← Learn · {stage?.label}
          </Link>
          <h1 className="mt-6 font-display text-4xl font-light leading-[1.1] text-ink sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-mute">
            {article.readMinutes} min read
          </p>
          <p className="mt-8 text-lg leading-relaxed text-ink-soft">
            {article.excerpt}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
          <div className="space-y-6 text-base leading-relaxed text-ink-soft">
            <p>{article.intro}</p>
            <p className="rounded-xl border border-rule bg-cream-2/40 px-5 py-4 text-sm italic text-ink">
              The full text of this article is in our editorial
              calendar and lands in the weeks ahead of Q3 launch. Until
              then, the intro above captures the shape of the answer.
              For an immediate response, the team is at{" "}
              <Link
                href="mailto:support@ryda.pro"
                className="font-medium not-italic text-red hover:underline"
              >
                support@ryda.pro
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Siblings */}
      {siblings.length > 0 && (
        <section className="border-b border-rule bg-cream-2">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              More in {stage?.label}
            </p>
            <ul className="mt-6 space-y-4">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/learn/${s.slug}`}
                    className="group block rounded-xl border border-rule bg-surface p-5 hover:border-ink/40"
                  >
                    <p className="font-display text-lg text-ink">
                      {s.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{s.excerpt}</p>
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
