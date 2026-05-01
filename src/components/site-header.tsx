"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

// RYDA spans three verticals: Cars, Boats, Planes. The header detects
// which vertical the visitor is in via the pathname and swaps the nav
// accordingly. A small "Cars · Boats · Planes" switcher pill lets
// members move between verticals without going back to the splitter.

type Vertical = "cars" | "boats" | "planes" | "neutral";

const CARS_NAV = [
  { href: "/markets", label: "Portfolio" },
  { href: "/rent", label: "Rent" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/concierge-ownership", label: "Concierge" },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const vertical = detectVertical(pathname);
  const nav = navForVertical(vertical);

  const tone = inverted ? "text-cream/70 hover:text-cream" : "text-ink-soft hover:text-ink";
  const brand = inverted ? "text-cream" : "text-ink";
  const ctaBase = inverted
    ? "border-cream bg-cream text-ink hover:bg-red hover:text-cream hover:border-red"
    : "border-ink bg-ink text-cream hover:bg-red hover:border-red";
  const burger = inverted ? "text-cream/80 hover:text-cream" : "text-ink-soft hover:text-ink";

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/help?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <header className={`w-full border-b ${inverted ? "border-cream/20" : "border-rule"}`}>
      {/* Vertical switcher strip — small, always visible above the main nav.
          Lets a member jump between Cars / Boats / Planes without going
          back to the splitter at /. */}
      <div
        className={`border-b ${
          inverted ? "border-cream/15 bg-ink" : "border-rule bg-cream-2/40"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-6 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] sm:justify-start sm:px-10">
          <VerticalLink
            href="/cars"
            label="Cars"
            active={vertical === "cars"}
            inverted={inverted}
          />
          <span aria-hidden className={inverted ? "text-cream/30" : "text-mute/50"}>
            ·
          </span>
          <VerticalLink
            href="/boats"
            label="Boats"
            active={vertical === "boats"}
            inverted={inverted}
          />
          <span aria-hidden className={inverted ? "text-cream/30" : "text-mute/50"}>
            ·
          </span>
          <VerticalLink
            href="/planes"
            label="Planes"
            active={vertical === "planes"}
            comingSoon
            inverted={inverted}
          />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className={`font-display text-2xl tracking-tight ${brand}`}>
          RYDA
          {vertical !== "neutral" && (
            <span className={`ml-2 align-baseline text-[10px] font-medium uppercase tracking-[0.24em] ${
              inverted ? "text-cream/60" : "text-mute"
            }`}>
              {vertical}
            </span>
          )}
        </Link>

        <nav className={`hidden gap-7 text-sm font-medium sm:flex ${tone}`}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className={`hidden h-9 w-9 items-center justify-center rounded-full transition-colors sm:inline-flex ${tone}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            href="/signin"
            className={`hidden text-sm font-medium transition-colors sm:inline-flex ${tone}`}
          >
            Sign in
          </Link>
          <Link
            href="/founding-members"
            className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${ctaBase}`}
          >
            Apply to join
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

      {searchOpen && (
        <div
          className={`hidden border-t sm:block ${
            inverted ? "border-cream/20 bg-ink" : "border-rule bg-cream-2/50"
          }`}
        >
          <form
            onSubmit={onSearchSubmit}
            className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4 sm:px-10"
          >
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the portfolio, help center, or vehicles…"
              className={`h-11 flex-1 rounded-full border bg-surface px-5 text-sm placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-red/20 ${
                inverted
                  ? "border-cream/30 text-cream placeholder:text-cream/50"
                  : "border-rule text-ink"
              }`}
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-red px-5 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className={`text-sm ${tone}`}
            >
              Close
            </button>
          </form>
        </div>
      )}

      {open && (
        <div
          id="mobile-menu"
          className={`border-t sm:hidden ${
            inverted ? "border-cream/20 bg-ink" : "border-rule bg-cream"
          }`}
        >
          <nav className={`mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 text-base ${tone}`}>
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
              href="/founding-members"
              onClick={() => setOpen(false)}
              className={`mt-2 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${ctaBase}`}
            >
              Apply to join
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

function VerticalLink({
  href,
  label,
  active,
  comingSoon,
  inverted,
}: {
  href: string;
  label: string;
  active: boolean;
  comingSoon?: boolean;
  inverted?: boolean;
}) {
  const baseTone = inverted
    ? "text-cream/55 hover:text-cream"
    : "text-mute hover:text-ink";
  const activeTone = inverted ? "text-cream" : "text-ink";
  return (
    <Link
      href={href}
      className={`px-2 py-0.5 transition-colors ${active ? activeTone : baseTone}`}
    >
      {label}
      {comingSoon && (
        <span
          className={`ml-1 align-baseline text-[8px] font-normal normal-case tracking-normal ${
            inverted ? "text-cream/45" : "text-mute"
          }`}
        >
          (soon)
        </span>
      )}
    </Link>
  );
}
