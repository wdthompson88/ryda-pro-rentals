"use client";

// Visibility-gated wrapper around HealthBadge. The badge itself
// polls /api/health every 60s and ships its own ~3KB of UI logic;
// dynamic-importing it shaves the chunk off the critical-path JS
// bundle on every marketing page (homepage, /how-it-works, /portfolio,
// etc.) where the user typically never scrolls to the legal strip
// and never sees it.
//
// Pattern:
//   1. Empty <span> renders immediately, server + client.
//   2. IntersectionObserver watches the placeholder. When it enters
//      the viewport (with a 200px rootMargin so the chunk has time
//      to fetch before it visually appears), we flip `visible` true.
//   3. React.lazy + Suspense kick off the import on first render of
//      the visible state. The chunk lands; HealthBadge mounts; its
//      polling effect starts running.
//   4. We disconnect the observer once we've fired so the badge
//      stays mounted and continues polling for the rest of the
//      session.
//
// Why this and not next/dynamic with `ssr: false`: next/dynamic
// fetches the chunk during hydration regardless of visibility, so
// the bytes still cost the LCP path. Intersection-gated lazy() is
// the only pattern that actually defers the network request.

import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";

// React.lazy resolves once and caches; subsequent visible toggles
// (e.g. footer re-enters viewport on a long page) reuse the same
// promise. The .then mapping converts our named export to the
// default-export shape lazy() requires.
const HealthBadgeImpl = lazy(() =>
  import("./health-badge").then((m) => ({ default: m.HealthBadge })),
);

export function HealthBadgeLazy() {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Browsers without IntersectionObserver (very old Safari, JSDOM
      // in tests) fall back to immediate visibility — better than
      // never showing the badge at all.
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      // 200px ahead of the viewport gives the dynamic import enough
      // network/parse headroom to be ready right as the badge slot
      // becomes visible. No flash-of-loading-state in practice.
      { rootMargin: "200px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className="inline-flex">
      {visible && (
        <Suspense fallback={null}>
          <HealthBadgeImpl />
        </Suspense>
      )}
    </span>
  );
}
