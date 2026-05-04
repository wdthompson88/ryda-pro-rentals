// <ScheduleCallCard> — single source of truth for the "Schedule a
// 30-minute call" affordance.
//
// Audit found this CTA repeated verbatim 8 times across the site:
//   - about/page.tsx:136
//   - boats/about/page.tsx:148
//   - boats/how-it-works/page.tsx:397, 411
//   - boats/portfolio/[slug]/page.tsx:432, 443
//   - boats/sample-documents/page.tsx:257, 271
//   - markets/[symbol]/page.tsx:431
//   - member-protection/page.tsx:246
//
// Pulled into one component so copy + visual treatment evolve in
// one place. Three variants for the three contexts it's used in.

import { BtnLink } from "@/components/ui/btn";

type ScheduleCallCardProps = {
  /**
   * - "default": "Talk to RYDA" — generic onboarding CTA.
   * - "asset":   "Walk through this car/boat" — on a specific asset page.
   * - "minimal": just the button row, no card chrome (for inline use).
   */
  variant?: "default" | "asset" | "minimal";
  /** Override the headline (defaults to a sensible per-variant string). */
  title?: string;
  /** Override the body copy. */
  body?: string;
  /** Override the CTA label. */
  ctaLabel?: string;
  /** Override the destination (defaults to /contact?type=...). */
  href?: string;
  /** Optional muted detail row beneath the button. */
  detail?: string;
};

const DEFAULTS: Record<
  Exclude<ScheduleCallCardProps["variant"], undefined | "minimal">,
  { title: string; body: string; ctaLabel: string; href: string }
> = {
  default: {
    title: "Talk to RYDA.",
    body: "30 minutes with a member of our team. No pressure, no pitch — just answers to whatever you want to know about co-ownership, the LLC structure, the membership tiers, or this specific asset.",
    ctaLabel: "Schedule a 30-minute call",
    href: "/contact?type=Call",
  },
  asset: {
    title: "Walk through this asset with us.",
    body: "30 minutes on a call. We'll walk through the LLC structure, the storage and operations setup, and exactly what your share entitles you to.",
    ctaLabel: "Schedule a 30-minute call",
    href: "/contact?type=Asset",
  },
};

export function ScheduleCallCard({
  variant = "default",
  title,
  body,
  ctaLabel,
  href,
  detail,
}: ScheduleCallCardProps) {
  if (variant === "minimal") {
    return (
      <BtnLink href={href ?? "/contact?type=Call"} variant="primary" size="md">
        {ctaLabel ?? "Schedule a 30-minute call"} →
      </BtnLink>
    );
  }

  const d = DEFAULTS[variant];
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <p className="font-display text-2xl text-ink sm:text-3xl">
        {title ?? d.title}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
        {body ?? d.body}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <BtnLink href={href ?? d.href} variant="primary" size="md">
          {ctaLabel ?? d.ctaLabel} →
        </BtnLink>
        {detail ? (
          <span className="text-xs text-mute">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}
