"use client";

// One scroll-driven cinematic moment, sandwiched between the splitter
// intro and the editorial second screen on the homepage. The pattern
// is the canonical luxury-brand motion: a single image starts cropped
// to a slim center band and expands to full-bleed as the user scrolls
// roughly one viewport. Apple iPhone product pages, Aman, Tom Ford
// website-era all use a variant of this. Magic MCP's `SmoothScrollHero`
// suggested the technique; this is a clean RYDA-tokenized rewrite that
// avoids dragging in the `lenis` smooth-scroll dependency it shipped
// with (we already have framer-motion).
//
// Why clipPath instead of scale: scale changes the image's apparent
// resolution mid-animation, which looks soft. clipPath holds the
// image at its native pixel density and just reveals more of it.
// Visually crisper, technically cheaper.
//
// Reduced-motion: the scroll transform is bypassed and the image
// renders full-bleed immediately with a slow Ken-Burns nod.

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionTemplate,
  cubicBezier,
} from "framer-motion";

// Match the project's canonical ease curve, defined once in
// src/components/reveal.tsx (the EASE constant). Using the same
// cubic-bezier here keeps every scroll-driven motion in the site
// rhythmically consistent, per /frontend-design SKILL.md and per
// codex review.
const PROJECT_EASE = cubicBezier(0.22, 1, 0.36, 1);

type Props = {
  /** Source image — works with /public posters or remote URLs that
   *  Next/Image is configured for. */
  src: string;
  alt: string;
  /** Optional eyebrow shown above the image (luxury-brand convention:
   *  small, uppercase, tracked, sits above the visual). */
  eyebrow?: string;
  /** Optional caption shown beneath the image at full-bleed. Single
   *  line, kept short — this is editorial, not body copy. */
  caption?: string;
  /** Object-position for the image (e.g., "center 30%"). Defaults
   *  center. */
  position?: string;
};

export function ScrollRevealHero({
  src,
  alt,
  eyebrow,
  caption,
  position = "center",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  // Scroll progress measured against this section's window —
  // 0 when the section's top hits the viewport bottom, 1 when
  // the section's bottom exits the viewport top. The clip-path
  // animation runs across the middle two-thirds of that range
  // so there's a visible "settled" moment at full-bleed before
  // the next section pushes up.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Inset starts at 25% (vertical and horizontal) — image is a
  // centered 50% × 50% letterbox — and goes to 0 (full-bleed)
  // by the time the section is ~60% scrolled through. After
  // that, full-bleed holds while the section finishes its
  // viewport pass.
  // useTransform accepts an `ease` function in its 4th-arg config
  // object — this applies PROJECT_EASE so the reveal accelerates and
  // settles on the same curve as Reveal/RevealStagger elsewhere on
  // the site instead of the default linear interpolation.
  const insetTop = useTransform(scrollYProgress, [0.1, 0.6], [22, 0], {
    ease: PROJECT_EASE,
  });
  const insetSide = useTransform(scrollYProgress, [0.1, 0.6], [10, 0], {
    ease: PROJECT_EASE,
  });

  // Combine into a single inset() value that animates as one.
  // useMotionTemplate stitches motion-values into a string each
  // frame — much cheaper than four separate transforms.
  const clipPath = useMotionTemplate`inset(${insetTop}% ${insetSide}% ${insetTop}% ${insetSide}%)`;

  if (reduce) {
    return (
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          {eyebrow && (
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-mute">
              {eyebrow}
            </p>
          )}
          <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: position }}
            />
          </div>
          {caption && (
            <p className="mt-5 text-center text-sm text-ink-soft">
              {caption}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      // Section is taller than the viewport so the clipPath
      // transform has scroll distance to work across. ~150vh
      // gives a comfortable reveal arc without dragging.
      className="relative bg-cream"
      style={{ height: "150vh" }}
      aria-label={eyebrow ? `${eyebrow} — ${alt}` : alt}
    >
      {/* The visual sticky-mounts to the viewport so it stays in
          frame as the user scrolls past it. Once the section's
          bottom exits the viewport top, the sticky releases and
          the next section pushes through. */}
      <div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden">
        {eyebrow && (
          <p className="absolute top-10 left-1/2 z-10 -translate-x-1/2 text-[11px] font-medium uppercase tracking-[0.22em] text-mute">
            {eyebrow}
          </p>
        )}

        <motion.div
          className="absolute inset-0"
          style={{ clipPath }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            // priority is false here — this hero appears below the
            // splitter LCP and is scroll-revealed, so eager loading
            // would compete with the LCP image for bandwidth.
            className="object-cover"
            style={{ objectPosition: position }}
          />
        </motion.div>

        {/* Caption rendered on the section's cream surface, NOT
            overlaid on the image. Per codex review: mix-blend-
            difference made caption contrast image-dependent and
            unpredictable. A bottom strip on the cream/ink token
            pair gives WCAG-AA contrast by construction and stays
            within the brand-system token surfaces. The strip
            collapses to invisible padding when no caption is
            passed. */}
        {caption && (
          <div className="relative z-10 mt-auto bg-cream px-6 py-5 text-center">
            <p className="text-sm font-medium text-ink-soft">
              {caption}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
