import Link from "next/link";
import { Reveal } from "@/components/reveal";

export type SampleDocumentItem =
  | string
  | {
      title: string;
      meta?: string;
      purpose?: string;
      signedBy?: string;
      href?: string;
      actionLabel?: string;
    };

export type SampleDocumentGroup = {
  category: string;
  items: SampleDocumentItem[];
};

export type SampleDocumentsPageData = {
  accent: "red" | "marine";
  hero: {
    eyebrow: string;
    title: React.ReactNode;
    body: string;
    links: { href: string; label: string; variant?: "primary" | "secondary" }[];
  };
  docs: SampleDocumentGroup[];
  detailed?: boolean;
  requestHref: string;
  privacySection?: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  cta: {
    title: string;
    body: string;
    links: { href: string; label: string; variant?: "primary" | "secondary" }[];
  };
};

export function SampleDocumentsPageTemplate({ data }: { data: SampleDocumentsPageData }) {
  const accentText = data.accent === "marine" ? "text-marine" : "text-red";

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
            {data.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {data.hero.title}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {data.hero.body}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {data.hero.links.map((link) => (
              <ActionLink key={link.href} accent={data.accent} link={link} />
            ))}
          </div>
        </div>
      </section>

      {data.docs.map((group) => (
        <section
          key={group.category}
          className="border-b border-rule [&:nth-child(even)]:bg-cream-2"
        >
          <div className={`mx-auto px-6 sm:px-10 ${data.detailed ? "max-w-7xl py-16 sm:py-20" : "max-w-3xl py-12 sm:py-16"}`}>
            <MaybeReveal enabled={data.detailed}>
              <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
                {group.category}
              </p>
            </MaybeReveal>
            {data.detailed ? (
              <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {group.items.map((item, index) => {
                  const doc =
                    typeof item === "string"
                      ? { title: item, meta: "", purpose: "", signedBy: "" }
                      : item;
                  return (
                    <Reveal key={doc.title} delayMs={index * 60}>
                      <div className="h-full rounded-2xl border border-rule bg-surface p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-2 text-[10px] font-bold uppercase tracking-wider text-marine">
                            PDF
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg text-ink">{doc.title}</p>
                            {doc.meta && (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-mute">
                                {doc.meta}
                              </p>
                            )}
                          </div>
                        </div>
                        {doc.purpose && (
                          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                            {doc.purpose}
                          </p>
                        )}
                        <div className="mt-5 flex items-baseline justify-between border-t border-rule pt-4">
                          {doc.signedBy ? (
                            <p className="text-[11px] text-mute">
                              Signed by · <span className="text-ink-soft">{doc.signedBy}</span>
                            </p>
                          ) : (
                            <span aria-hidden="true" />
                          )}
                          <Link
                            href={doc.href ?? data.requestHref}
                            className={`text-xs font-medium ${accentText}`}
                          >
                            {doc.actionLabel ?? "Request"} →
                          </Link>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-rule">
                {group.items.map((item) => {
                  const doc =
                    typeof item === "string"
                      ? { title: item, href: data.requestHref, actionLabel: "Request sample" }
                      : item;
                  return (
                    <li key={doc.title} className="flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-display text-base text-ink">{doc.title}</p>
                        {doc.purpose && (
                          <p className="mt-1 max-w-xl text-xs leading-relaxed text-mute">
                            {doc.purpose}
                          </p>
                        )}
                      </div>
                      <Link
                        href={doc.href ?? data.requestHref}
                        className={`shrink-0 text-xs font-medium ${accentText}`}
                      >
                        {doc.actionLabel ?? "Request sample"} &rarr;
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ))}

      {data.privacySection && (
        <section className="border-b border-rule">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
            <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
              {data.privacySection.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
              {data.privacySection.title}
            </h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
              {data.privacySection.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">{data.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">{data.cta.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {data.cta.links.map((link) => (
              <ActionLink key={link.href} accent={data.accent} link={link} inverse />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function MaybeReveal({
  enabled,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return enabled ? <Reveal>{children}</Reveal> : <>{children}</>;
}

function ActionLink({
  accent,
  inverse,
  link,
}: {
  accent: "red" | "marine";
  inverse?: boolean;
  link: { href: string; label: string; variant?: "primary" | "secondary" };
}) {
  const primary = accent === "marine" ? "bg-marine hover:bg-marine-deep" : "bg-red hover:bg-red-deep";
  const inversePrimary = accent === "marine" ? "hover:bg-marine" : "hover:bg-red";
  const secondary = inverse
    ? "border border-cream/30 text-cream hover:border-cream"
    : "border border-rule text-ink hover:border-ink";

  return (
    <Link
      href={link.href}
      className={
        link.variant === "secondary"
          ? `inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium ${secondary}`
          : inverse
            ? `inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink ${inversePrimary} hover:text-cream`
            : `inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium text-cream ${primary}`
      }
    >
      {link.label}
    </Link>
  );
}
