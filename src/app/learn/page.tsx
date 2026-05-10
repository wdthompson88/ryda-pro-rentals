// /learn — educational hub home page. 5-stage taxonomy modeled on
// Kocomo's /learn (Discover → Find → Buy → Relax → Earn → Enjoy)
// adapted to RYDA's car/yacht buyer journey: Understand → Choose
// → Buy → Drive → Exit.
//
// Don't move policy out of /faq — /learn is buyer-confidence content,
// not legal disclosure.

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  LEARN_STAGES,
  articlesByStage,
} from "@/lib/learn-content";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Understand RYDA's co-ownership model, choose your share, buy with confidence, drive without surprises, and exit cleanly. Plain-language explainers across the full member journey.",
};

export default function LearnHome() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Learn
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            How co-ownership{" "}
            <span className="italic">actually</span> works.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Plain-language explainers across the full RYDA member
            journey, from your first thought about co-owning a Ferrari
            to the day the LLC sells it and proceeds land in your
            account. Five stages, eight launch articles, growing as
            the editorial calendar fills in.
          </p>
        </div>
      </section>

      {/* Stage rails */}
      {LEARN_STAGES.map((stage) => {
        const articles = articlesByStage(stage.slug);
        if (articles.length === 0) return null;
        return (
          <section
            key={stage.slug}
            id={stage.slug}
            className="border-b border-rule odd:bg-cream-2/40"
          >
            <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                    Stage · {stage.label}
                  </p>
                  <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                    {stage.intro}.
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                    {stage.description}
                  </p>
                </div>
                <ul className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {articles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/learn/${a.slug}`}
                        className="group block h-full rounded-xl border border-rule bg-surface p-5 transition-colors hover:border-ink/40"
                      >
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-mute">
                          {a.readMinutes} min read
                        </p>
                        <p className="mt-2 font-display text-xl text-ink leading-snug">
                          {a.title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                          {a.excerpt}
                        </p>
                        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-red">
                          Read →
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 text-center">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Question we haven't answered?
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            Email{" "}
            <Link
              href="mailto:support@ryda.pro"
              className="font-medium text-red hover:underline"
            >
              support@ryda.pro
            </Link>{" "}
            and we'll write the article. The editorial calendar is
            built from member questions.
          </p>
        </div>
      </section>
    </>
  );
}
