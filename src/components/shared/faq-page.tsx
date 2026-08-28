import Link from "next/link";

export type FaqQuestion = {
  q: string;
  a: string;
};

export type FaqSection = {
  title: string;
  questions: FaqQuestion[];
};

export type FaqPageData = {
  accent: "red" | "marine";
  hero: {
    eyebrow: string;
    title: React.ReactNode;
    body: React.ReactNode;
  };
  sections: FaqSection[];
  cta: {
    title: string;
    body: string;
    links: { href: string; label: string; variant?: "primary" | "secondary" }[];
  };
};

export function FaqPageTemplate({ data }: { data: FaqPageData }) {
  const accentText = data.accent === "marine" ? "text-marine" : "text-red";
  const primaryHover = data.accent === "marine" ? "hover:bg-marine" : "hover:bg-red";

  // SEO H2 (audit 12-seo.md): FAQPage JSON-LD makes /faq and /boats/faq
  // eligible for Google's FAQ rich-result accordion in search SERPs —
  // doubles visible real estate for navigational queries like
  // "ryda co-ownership how does it work". Schema is generated from
  // the same data prop that renders the visible <details>, so they
  // can never drift apart. The "<" -> "<" escape prevents
  // script-context breakout if a question/answer ever contains a
  // literal "</script>".
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.sections.flatMap((s) =>
      s.questions.map((qa) => ({
        "@type": "Question",
        name: qa.q,
        acceptedAnswer: { "@type": "Answer", text: qa.a },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
            {data.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {data.hero.title}
          </h1>
          <div className="mt-8 max-w-2xl text-lg text-ink-soft">{data.hero.body}</div>
        </div>
      </section>

      {data.sections.map((section, index) => (
        <section
          key={section.title}
          className={`border-b border-rule ${index % 2 === 1 ? "bg-cream-2" : ""}`}
        >
          <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">{section.title}</h2>
            <div className="mt-10 space-y-4">
              {section.questions.map((qa) => (
                <details
                  key={qa.q}
                  className="group rounded-2xl border border-rule bg-surface p-5"
                >
                  <summary className="cursor-pointer list-none font-display text-lg text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      <span>{qa.q}</span>
                      <span className={`text-2xl transition-transform group-open:rotate-45 ${accentText}`}>
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-ink-soft">{qa.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">{data.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            {data.cta.body}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {data.cta.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.variant === "secondary"
                    ? "inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
                    : `inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink ${primaryHover} hover:text-cream`
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
