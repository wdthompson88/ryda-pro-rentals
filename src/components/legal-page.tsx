import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export type LegalSection = {
  heading: string;
  body: string;
};

export function LegalPage({
  title,
  intro,
  lastUpdated,
  sections,
  counselNote,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  counselNote?: string;
}) {
  return (
    <>
      <SiteHeader />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Legal</p>
          <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-mute">Last updated: {lastUpdated}</p>
          <p className="mt-8 text-base leading-relaxed text-ink-soft">{intro}</p>

          {counselNote && (
            <div className="mt-8 rounded-xl border border-red/20 bg-red/5 px-5 py-4 text-sm text-ink-soft">
              <strong className="font-medium text-red">Note:</strong> {counselNote}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="space-y-10">
            {sections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-display text-2xl text-ink">{s.heading}</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-16 border-t border-rule pt-10 text-sm text-ink-soft">
            <p className="font-medium text-ink">Questions?</p>
            <p className="mt-2">
              <Link href="/contact?type=Other#form" className="text-red hover:text-red-deep">
                Send us a message
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
