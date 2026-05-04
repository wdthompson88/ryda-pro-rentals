// <MemberCTAFooter> — single source of truth for the "Become a
// member · 28+ verified individuals" CTA block at the bottom of
// most marketing pages.
//
// Audit found this repeated 7 times across the site:
//   - cars/page.tsx:296,319
//   - boats/page.tsx:285,308
//   - markets/[symbol]/page.tsx:445
//   - about/page.tsx:227
//   - boats/about/page.tsx:231
//   - locations/miami/page.tsx:141
//
// Single component so the CTA copy + age-restriction language
// evolve in one place. Tone defaults to luxury-considered; can be
// overridden per-page via the `tagline` prop.

import { BtnLink } from "@/components/ui/btn";

type MemberCTAFooterProps = {
  /** Optional override for the headline. */
  headline?: string;
  /** Optional override for the descriptive sub-copy. */
  tagline?: string;
  /** Optional secondary CTA (e.g. "Talk to us" alongside "Become a member"). */
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Visual scheme. "ink" (default) or "cream" for cream-on-page surfaces. */
  surface?: "ink" | "cream";
};

export function MemberCTAFooter({
  headline = "Become a member.",
  tagline = "Membership is limited to verified individuals 28 years or older. Identity verification, no exceptions.",
  secondaryHref,
  secondaryLabel,
  surface = "ink",
}: MemberCTAFooterProps) {
  const sectionClass =
    surface === "ink"
      ? "bg-ink py-20 text-cream sm:py-24"
      : "bg-cream-2 py-20 sm:py-24";
  const taglineClass = surface === "ink" ? "text-cream/75" : "text-ink-soft";

  return (
    <section className={sectionClass}>
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
        <h2
          className={`font-display text-3xl font-light sm:text-4xl ${
            surface === "ink" ? "text-cream" : "text-ink"
          }`}
        >
          {headline}
        </h2>
        <p
          className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${taglineClass}`}
        >
          {tagline}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <BtnLink
            href="/signup"
            variant={surface === "ink" ? "secondary" : "primary"}
            size="lg"
            className={
              surface === "ink"
                ? "border-cream text-cream hover:bg-cream hover:text-ink"
                : ""
            }
          >
            Become a member →
          </BtnLink>
          {secondaryHref && secondaryLabel ? (
            <BtnLink
              href={secondaryHref}
              variant="ghost"
              size="lg"
              className={
                surface === "ink" ? "text-cream/85 hover:text-cream" : ""
              }
            >
              {secondaryLabel}
            </BtnLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
