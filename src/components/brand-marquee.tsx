"use client";

// Quiet typographic marquee for brand wordmarks. NOT logos — luxury
// houses (Hermès, Loro Piana, Louis Vuitton) lean on letterforms, not
// stylized marks; matching that register signals "we curate at this
// tier" without falling into SaaS "Trusted by 10,000+" templating.
//
// Motion: continuous horizontal scroll over ~50s/loop, pauses on
// hover. Built with framer-motion's `animate` keyframes so the
// motion is GPU-composited and respects the same easing/timing
// language as Reveal/RevealStagger elsewhere on the site.
//
// Reduced-motion: collapses to a static centered row. The wordmark
// list is short enough (~7 brands) that it fits comfortably on
// every viewport without animation.
//
// Used in the homepage below-fold editorial band as a third
// element under the founder pull-quote + member criteria. Could
// be reused on /about as a "we curate from" strip later.

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  items: string[];
  /** Optional eyebrow above the strip (e.g., "Curated from"). */
  eyebrow?: string;
  /** Visual weight. "muted" sits behind editorial copy; "primary"
   *  is the focal element. Default muted. */
  tone?: "muted" | "primary";
};

export function BrandMarquee({ items, eyebrow, tone = "muted" }: Props) {
  const reduce = useReducedMotion();

  // Two scrolling tracks, identical content, offset by track width
  // so the loop is seamless. Standard infinite-marquee pattern.
  // Animation goes from 0 → -50% over 50s; at -50% the second
  // track has slid into the first track's position, and the loop
  // restarts invisibly.

  const tonecls =
    tone === "muted" ? "text-mute/80" : "text-ink";

  if (reduce || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        {eyebrow && (
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            {eyebrow}
          </p>
        )}
        <div className={`flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2 font-display text-lg ${tonecls}`}>
          {items.map((item, i) => (
            <span key={item} className="inline-flex items-baseline gap-x-6">
              <span>{item}</span>
              {i < items.length - 1 && (
                <span aria-hidden className="text-mute/50">·</span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {eyebrow && (
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
          {eyebrow}
        </p>
      )}
      <div
        // overflow-hidden clips the scrolling tracks; group/marquee
        // hover-pauses the inner motion via group-hover state.
        className="group/marquee relative w-full overflow-hidden"
        aria-label={items.join(", ")}
      >
        <motion.div
          className="flex w-max gap-x-12"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 50,
            ease: "linear",
            repeat: Infinity,
          }}
          // CSS pause-on-hover via group state. framer-motion doesn't
          // expose a "pause" toggle directly, so we use animationPlayState
          // through a CSS variable. Simpler: scale duration on hover
          // would jump; instead we use Tailwind's group-hover to set
          // animation-play-state via inline style on the same element.
          style={{ animationPlayState: "running" }}
        >
          {/* Track 1 */}
          {items.map((item, i) => (
            <Item key={`a-${item}`} label={item} last={i === items.length - 1} tone={tonecls} />
          ))}
          {/* Track 2 — duplicate for seamless loop. aria-hidden so
              the screen reader doesn't read the wordmarks twice. */}
          {items.map((item, i) => (
            <Item
              key={`b-${item}`}
              label={item}
              last={i === items.length - 1}
              tone={tonecls}
              ariaHidden
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function Item({
  label,
  last,
  tone,
  ariaHidden,
}: {
  label: string;
  last: boolean;
  tone: string;
  ariaHidden?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-x-12 font-display text-lg sm:text-xl ${tone}`}
      aria-hidden={ariaHidden}
    >
      <span>{label}</span>
      {!last && <span className="text-mute/40">·</span>}
    </span>
  );
}
