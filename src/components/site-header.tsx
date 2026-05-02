"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

// RYDA spans three verticals: Cars, Boats, Planes. The header detects
// which vertical the visitor is in via the pathname and swaps the nav
// accordingly. Vertical switcher + search + theme toggle were removed
// from the marketing header per UX polish — those move to the footer
// (theme + search) and are reachable from the splitter (vertical jump).

type Vertical = "cars" | "boats" | "planes" | "neutral";

const CARS_NAV = [
  { href: "/markets", label: "Portfolio" },
  { href: "/rent", label: "Rent" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/membership", label: "Membership" },
];

const BOATS_NAV = [
  { href: "/boats/portfolio", label: "Portfolio" },
  { href: "/boats/rent", label: "Charter" },
  { href: "/boats/how-it-works", label: "How it works" },
  { href: "/boats/membership", label: "Membership" },
];

const PLANES_NAV: { href: string; label: string }[] = [
  // Planes is just a coming-soon surface today — no sub-nav.
];

function detectVertical(pathname: string | null): Vertical {
  if (!pathname) return "neutral";
  if (pathname.startsWith("/boats")) return "boats";
  if (pathname.startsWith("/planes")) return "planes";
  if (pathname === "/") return "neutral";
  // Everything else (the existing car-era routes) is the cars vertical:
  // /markets, /rent, /membership, /how-it-works, /faq, /inside, /journal,
  // /vs, /sample-documents, etc. plus /cars itself.
  return "cars";
}

function navForVertical(v: Vertical): { href: string; label: string }[] {
  if (v === "boats") return BOATS_NAV;
  if (v === "planes") return PLANES_NAV;
  if (v === "neutral") return [];
  return CARS_NAV;
}

export function SiteHeader({ inverted }: { inverted?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const vertical = detectVertical(pathname);
  const nav = navForVertical(vertical);

  const tone = inverted ? "text-cream/70 hover:text-cream" : "text-ink-soft hover:text-ink";
  const brand = inverted ? "text-cream" : "text-ink";
  const ctaBase = inverted
    ? "border-cream bg-cream text-ink hover:bg-red hover:text-cream hover:border-red"
    : "border-ink bg-ink text-cream hover:bg-red hover:border-red";
  const burger = inverted ? "text-cream/80 hover:text-cream" : "text-ink-soft hover:text-ink";

  return (
    <header className={`w-full border-b ${inverted ? "border-cream/20" : "border-rule"}`}>
      {/* Single-row marketing header. Vertical switcher / theme toggle /
          search-icon were demoted to footer per luxury polish — header
          now reads as minimal brand mark + nav + one CTA, not as
          a control panel. */}

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10">
        <div className="flex items-baseline gap-4 sm:gap-5">
          <Link href="/" className={`font-display text-2xl tracking-tight ${brand}`}>
            RYDA
          </Link>
          {/* Inline vertical switcher — Cars · Boats · Planes. The
              currently-active vertical is bolded ink/cream; the others
              are mute and clickable so members can jump between
              verticals without bouncing back to the splitter. */}
          {vertical !== "neutral" && (
            <div className="hidden items-baseline gap-2 text-[10px] font-medium uppercase tracking-[0.18em] sm:flex">
              <VerticalSwitch
                href="/cars"
                label="Cars"
                active={vertical === "cars"}
                inverted={inverted}
              />
              <span aria-hidden className={inverted ? "text-cream/30" : "text-mute/50"}>
                ·
              </span>
              <VerticalSwitch
                href="/boats"
                label="Boats"
                active={vertical === "boats"}
                inverted={inverted}
              />
              <span aria-hidden className={inverted ? "text-cream/30" : "text-mute/50"}>
                ·
              </span>
              <VerticalSwitch
                href="/planes"
                label="Planes"
                active={vertical === "planes"}
                inverted={inverted}
              />
            </div>
          )}
        </div>

        <nav className={`hidden gap-7 text-sm font-medium sm:flex ${tone}`}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 sm:gap-5">
          <Link
            href="/signin"
            className={`hidden text-sm font-medium transition-colors sm:inline-flex ${tone}`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${ctaBase}`}
          >
            Sign up
          </Link>

          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full sm:hidden ${burger}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <>
                  <line x1="5" y1="5" x2="17" y2="17" />
                  <line x1="17" y1="5" x2="5" y2="17" />
                </>
              ) : (
                <>
                  <line x1="3.5" y1="7" x2="18.5" y2="7" />
                  <line x1="3.5" y1="11" x2="18.5" y2="11" />
                  <line x1="3.5" y1="15" x2="18.5" y2="15" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className={`border-t sm:hidden ${
            inverted ? "border-cream/20 bg-ink" : "border-rule bg-cream"
          }`}
        >
          <nav className={`mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 text-base ${tone}`}>
            {/* Mobile vertical switcher — same Cars / Boats / Planes
                jump as the desktop header. Active vertical bolded. */}
            <div className="mb-2 flex items-baseline gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em]">
              <VerticalSwitch
                href="/cars"
                label="Cars"
                active={vertical === "cars"}
                inverted={inverted}
              />
              <span aria-hidden className={inverted ? "text-cream/30" : "text-mute/50"}>
                ·
              </span>
              <VerticalSwitch
                href="/boats"
                label="Boats"
                active={vertical === "boats"}
                inverted={inverted}
              />
              <span aria-hidden className={inverted ? "text-cream/30" : "text-mute/50"}>
                ·
              </span>
              <VerticalSwitch
                href="/planes"
                label="Planes"
                active={vertical === "planes"}
                inverted={inverted}
              />
            </div>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className={`mt-2 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${ctaBase}`}
            >
              Sign up
            </Link>
            <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-xs uppercase tracking-wider text-mute">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// Inline vertical-switch link used next to the RYDA wordmark.
// Active vertical: bolded ink (or cream on inverted headers).
// Inactive verticals: mute, clickable, hover transition to ink.
function VerticalSwitch({
  href,
  label,
  active,
  inverted,
}: {
  href: string;
  label: string;
  active: boolean;
  inverted?: boolean;
}) {
  const activeTone = inverted ? "text-cream font-semibold" : "text-ink font-semibold";
  const inactiveTone = inverted
    ? "text-cream/55 font-medium hover:text-cream"
    : "text-mute font-medium hover:text-ink";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`transition-colors ${active ? activeTone : inactiveTone}`}
    >
      {label}
    </Link>
  );
}

