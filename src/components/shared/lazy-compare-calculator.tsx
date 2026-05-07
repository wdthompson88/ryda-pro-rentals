"use client";

// Client-only lazy wrapper for the CompareCalculator.
//
// Why this exists:
// - audit/16-performance.md flagged compare-calculator (953 LOC,
//   useState + useMemo + slider matrix) as the largest unhydrated-on-
//   load chunk on /portfolio/[symbol] and /boats/portfolio/[slug].
// - The calculator is below the fold on every detail page. Most
//   visitors never scroll to it, but the bundle ships anyway.
// - Server Components in Next 16 can't pass `ssr: false` to
//   `next/dynamic`, so we wrap the import in this thin "use client"
//   shim. The wrapper itself is tiny; the heavy chunk is removed
//   from the initial JS bundle and loads on hydration of this
//   subtree (not viewport-triggered — for true on-scroll loading
//   we'd need an IntersectionObserver wrapper, deferred to a
//   future iteration).
//
// SEO note: skipping SSR is safe here because the calculator
// renders interactive sliders + projections, not crawlable copy.
// The static editorial copy *around* the calculator (in the page
// file) still server-renders normally, so search engines see the
// pricing context. Google doesn't index slider state.
//
// Type-safety: forwards the same generic Props as the underlying
// component (CompareCalculatorConfig + lockedAsset), so call sites
// keep their existing types.

import dynamic from "next/dynamic";
import type {
  CompareAsset,
  CompareCalculatorConfig,
} from "./compare-calculator";

const CompareCalculator = dynamic(() => import("./compare-calculator"), {
  ssr: false,
  loading: () => <CalculatorSkeleton />,
});

function CalculatorSkeleton() {
  // Reserve roughly the same vertical space the calculator occupies
  // when hydrated, so we don't introduce CLS (cumulative layout
  // shift) when the JS finishes loading and the real UI swaps in.
  return (
    <div
      aria-hidden="true"
      className="h-[640px] w-full animate-pulse rounded-2xl border border-rule bg-cream-2"
    />
  );
}

type Props<TAsset extends CompareAsset> = {
  config: CompareCalculatorConfig<TAsset>;
  lockedAsset?: TAsset;
};

// Generic-preserving wrapper. The cast back to a generic component
// is intentional: `next/dynamic` erases generics, so we restore the
// caller-facing signature here.
export default function LazyCompareCalculator<TAsset extends CompareAsset>(
  props: Props<TAsset>,
) {
  return <CompareCalculator {...(props as Props<CompareAsset>)} />;
}
