"use client";

// Sticky table of contents bar for long-form pages. Sits horizontally
// just below the site header. Active section is highlighted using
// IntersectionObserver. Works on mobile + desktop (horizontal scroll
// on small screens).

import { useEffect, useRef, useState } from "react";

export function StickyToc({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, number>();

    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              visible.set(it.id, entry.intersectionRatio);
            } else {
              visible.delete(it.id);
            }
          }
          let best: string | null = null;
          let bestRatio = 0;
          for (const [id, ratio] of visible.entries()) {
            if (ratio > bestRatio) {
              best = id;
              bestRatio = ratio;
            }
          }
          if (best) setActive(best);
        },
        { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [items]);

  // Auto-scroll the active chip into view on mobile so the user can see
  // where they are in the doc.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chip = container.querySelector<HTMLElement>(
      `[data-toc-id="${active}"]`,
    );
    if (chip) {
      chip.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [active]);

  return (
    <nav
      aria-label="Page contents"
      className="sticky top-18 z-30 border-b border-rule bg-cream/95 backdrop-blur-md"
    >
      <div
        ref={containerRef}
        className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-6 py-3 sm:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <a
              key={it.id}
              href={`#${it.id}`}
              data-toc-id={it.id}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-ink bg-ink text-cream"
                  : "border-rule bg-surface text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {it.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
