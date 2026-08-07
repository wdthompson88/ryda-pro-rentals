// Launch-window configuration. Single source of truth for the
// date-bound copy that appears in CTAs across the marketing site.
//
// Audit found "Apply by July 2026 to lock early-member pricing"
// hardcoded in /membership/page.tsx and /boats/membership/page.tsx.
// Once the date passes, the copy lies. Centralizing it here means
// flipping one constant changes every surface, AND we get a typed
// function that returns the right copy for the right window.

/** ISO date string. Pricing offer ends at the START of this day. */
export const EARLY_MEMBER_PRICING_DEADLINE = "2026-07-01";

/** Where the Miami launch period actually opens. Pre-launch copy
 *  references this; post-launch copy can pivot. */
export const MIAMI_LAUNCH_QUARTER = "Q3 2026";

/**
 * Returns the right early-member-pricing CTA copy for *now* relative
 * to the deadline. Used on /membership and /boats/membership CTAs.
 */
export function earlyPricingCTA(): {
  headline: string;
  body: string;
  expired: boolean;
} {
  const now = Date.now();
  const deadline = new Date(EARLY_MEMBER_PRICING_DEADLINE).getTime();
  const expired = now > deadline;

  if (expired) {
    return {
      headline: "Members start in Miami.",
      body: `Tier pricing is set at standard rates. Sign up to claim a share of an LLC; member events open with the ${MIAMI_LAUNCH_QUARTER} Miami launch.`,
      expired: true,
    };
  }

  // Format the deadline as "July 2026" for the body copy.
  const deadlineLabel = new Date(EARLY_MEMBER_PRICING_DEADLINE).toLocaleString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  return {
    headline: "Members start in Miami.",
    body: `Sign up by ${deadlineLabel} to lock early-member pricing on Blue or Black for life.`,
    expired: false,
  };
}
