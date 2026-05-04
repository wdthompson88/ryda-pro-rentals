// <Btn> — single rounded-full pill primitive.
//
// Replaces the ~216 ad-hoc rounded-full buttons across the codebase.
// Audit found five different combos on cars/page.tsx alone
// (h-12 px-7, h-11 px-5, h-12 px-6, h-11 px-6, etc.) — every "make
// this button bigger" decision was a fresh judgment call. Single
// component → consistent height/padding/typography across the entire
// site, and any future change to button hover/loading state lives in
// one place.
//
// Variants (chosen for what the brand actually needs, not the full
// component-library matrix):
//   - primary   — solid ink fill, cream text, hover-red. Default CTA.
//   - secondary — bordered cream/ink, transparent fill. Cancel/tertiary.
//   - ghost     — no border, text-only. Inline link-like buttons.
//
// Sizes:
//   - sm — h-9, px-4, text-xs. Inline / dense surfaces.
//   - md — h-11, px-5, text-sm. Default for nearly everything.
//   - lg — h-12, px-7, text-sm. Hero CTAs only.

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-ink text-cream border border-ink hover:bg-red hover:border-red disabled:opacity-50",
  secondary:
    "bg-transparent text-ink border border-rule hover:border-ink disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-soft border border-transparent hover:text-ink disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-sm",
};

const BASE =
  "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:cursor-not-allowed";

type BtnProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

/** Anchor-styled button for next/link navigation. */
export function BtnLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: BtnProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "href" | "className" | "children"
  >) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Real <button>. Use for form submits + onClick handlers. */
export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: BtnProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
