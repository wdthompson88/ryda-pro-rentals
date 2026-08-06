"use client";

// Reveal + RevealStagger — scroll-triggered fade-up animations
// powered by framer-motion. The single Reveal preserves the
// pre-framer-motion API (existing callers in /cars, /boats,
// /inside, portfolio-listings, boats-listings, sample-documents
// keep working unchanged) but the implementation now uses
// motion.div with whileInView + viewport={{once}} which gives:
//   - Built-in spring physics on the transform
//   - Free GPU acceleration via the framer-motion compositor
//   - Automatic cleanup of IntersectionObservers when remounted
//   - Respects prefers-reduced-motion via useReducedMotion()
//
// RevealStagger is the new addition — wraps a list/grid where
// each direct child should fade up in sequence. Uses framer-
// motion's variants pattern with staggerChildren so we don't
// need to compute per-item delays.
//
// Why we keep these in one file: they share the same easing,
// duration defaults, and reduced-motion handling. Anyone reaching
// for fade-up animation finds both APIs in one place.

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Match the previous easing curve so the new implementation is
// visually identical to the IntersectionObserver+CSS version
// it replaces. Cubic-bezier(0.22, 1, 0.36, 1) is the same one
// the old style attribute used.
const EASE = [0.22, 1, 0.36, 1] as const;

type RevealTag = "div" | "section" | "li" | "article";

export function Reveal({
  children,
  delayMs = 0,
  as = "div",
  className = "",
  /** When true (default), animation runs once then disconnects. */
  once = true,
  /** How far the element travels up during the reveal. Default 16px. */
  distance = 16,
  /** Animation duration in ms. Default 700. */
  durationMs = 700,
}: {
  children: ReactNode;
  delayMs?: number;
  as?: RevealTag;
  className?: string;
  once?: boolean;
  distance?: number;
  durationMs?: number;
}) {
  const reduce = useReducedMotion();

  // Reduced motion → render in the visible state immediately, no
  // animation. Same behavior as the previous implementation.
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.05, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: durationMs / 1000,
        delay: delayMs / 1000,
        ease: EASE,
      }}
    >
      {children}
    </Component>
  );
}

// ---- Stagger variants used by RevealStagger ----

const staggerContainer = (staggerSec: number, delaySec: number): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerSec,
      delayChildren: delaySec,
    },
  },
});

const staggerItem = (distance: number, durationSec: number): Variants => ({
  initial: { opacity: 0, y: distance },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durationSec, ease: EASE },
  },
});

/** Wrap a list/grid where each direct child should fade up in
 *  sequence as the container scrolls into view. Children become
 *  motion items automatically — they don't need to be Reveal
 *  themselves, but plain elements (divs, Links, Cards, etc).
 *
 *  Common usage:
 *    <RevealStagger className="grid grid-cols-3 gap-6" staggerMs={80}>
 *      {vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
 *    </RevealStagger>
 *
 *  The container itself doesn't fade — only the children stagger.
 *  If you want both, wrap RevealStagger inside a Reveal. */
export function RevealStagger({
  children,
  className = "",
  as = "div",
  /** Time between each child's animation start. Default 80ms. */
  staggerMs = 80,
  /** Delay before the first child starts. Default 0. */
  initialDelayMs = 0,
  /** Per-child travel distance. Default 16px. */
  distance = 16,
  /** Per-child animation duration. Default 600ms — slightly faster
   *  than single-Reveal default since each child is part of a
   *  rhythm and shouldn't drag. */
  durationMs = 600,
  /** Run animation once when scrolled into view (default), or
   *  re-run on every entry. */
  once = true,
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  staggerMs?: number;
  initialDelayMs?: number;
  distance?: number;
  durationMs?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const Container = motion[as];
  const itemVariants = staggerItem(distance, durationMs / 1000);
  const containerVariants = staggerContainer(staggerMs / 1000, initialDelayMs / 1000);

  // We wrap each direct child in a motion.div so the parent's
  // staggerChildren transition cascades. Using React.Children.map
  // would force consumers to deal with key-on-fragment issues; the
  // wrapping approach keeps the API simple — pass any children,
  // they stagger.
  return (
    <Container
      className={className}
      initial="initial"
      whileInView="animate"
      viewport={{ once, amount: 0.05, margin: "0px 0px -8% 0px" }}
      variants={containerVariants}
    >
      {childrenAsArray(children).map((child, i) => (
        <motion.div
          key={(child as { key?: string | number })?.key ?? i}
          variants={itemVariants}
          // The wrapper must generate a real box: `display: contents`
          // would keep the child a direct grid item but a contents
          // element paints nothing, so the animated opacity/transform
          // silently never render (the stagger becomes a no-op).
          // Instead the wrapper itself becomes the grid/flex item of
          // the consumer's container, and making it a single-cell grid
          // stretches the child to fill it in both axes — preserving
          // the equal-height card behavior children had when they were
          // direct grid items.
          style={{ display: "grid" }}
        >
          {child}
        </motion.div>
      ))}
    </Container>
  );
}

/** Coerce children to an array — handles single element, array,
 *  fragment, or null. Filters null/false so conditional children
 *  don't add stagger gaps. */
function childrenAsArray(children: ReactNode): ReactNode[] {
  if (children == null || children === false) return [];
  if (Array.isArray(children)) return children.filter((c) => c != null && c !== false);
  return [children];
}
