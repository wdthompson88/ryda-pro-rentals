"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AuthSwap,
  VisibleWhenAdmin,
  VisibleWhenPartner,
} from "@/components/auth-aware";

// Rental-first header (Aug 2026 pivot). Rentals are THE product, so the
// nav is one flat list on every page: Rent (the homepage grid) · How it
// works · For partners. The old vertical-aware nav (Cars / Boats /
// Planes switcher, portfolio + membership links) is gone along with the
// co-ownership product itself — this is a rentals-only repo and those
// destinations no longer exist. Site search + the auth-aware Log in /
// Sign up / Account slots are unchanged.

const NAV = [
  // /rent is the canonical browse grid; "/" is the landing page.
  { href: "/rent", label: "Browse" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/partners", label: "For partners" },
];

export function SiteHeader({ inverted }: { inverted?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const nav = NAV;

  // Priority navigation: links stay inline for as long as they fit the
  // space between the brand and the auth cluster; whatever would
  // overflow folds into a trailing "More" dropdown instead of hiding.
  // SSR renders all links (visibleCount = nav.length) so hydration
  // matches; the layout effect corrects on mount and on every resize.
  const [visibleCount, setVisibleCount] = useState(nav.length);
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const moreMeasureRef = useRef<HTMLSpanElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const navEl = navRef.current;
    const measureEl = measureRef.current;
    if (!navEl || !measureEl) return;
    const GAP = 28; // matches the nav's gap-7
    const compute = () => {
      const available = navEl.clientWidth;
      const widths = Array.from(measureEl.children).map(
        (el) => (el as HTMLElement).offsetWidth,
      );
      const moreW = (moreMeasureRef.current?.offsetWidth ?? 56) + 14; // + chevron
      const total =
        widths.reduce((a, b) => a + b, 0) + GAP * Math.max(0, widths.length - 1);
      if (total <= available) {
        setVisibleCount(widths.length);
        return;
      }
      let used = moreW;
      let count = 0;
      for (const w of widths) {
        if (used + GAP + w > available) break;
        used += GAP + w;
        count += 1;
      }
      setVisibleCount(count);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(navEl);
    return () => ro.disconnect();
  }, []);

  // The More menu closes on outside click or Escape, standard menu manners.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const tone = inverted ? "text-cream/70 hover:text-cream" : "text-ink-soft hover:text-ink";
  const brand = inverted ? "text-cream" : "text-ink";
  // Sign in (Log In), soft cream with ink text. Hover lifts to red.
  const signInBtn = inverted
    ? "border-cream/30 bg-cream/10 text-cream hover:bg-cream hover:text-ink"
    : "border-rule bg-cream-2 text-ink hover:border-red hover:text-red";
  // Sign up, dark ink (or cream on inverted) with strong CTA presence.
  const signUpBtn = inverted
    ? "border-cream bg-cream text-ink hover:bg-red hover:text-cream hover:border-red"
    : "border-ink bg-ink text-cream hover:bg-red hover:border-red";
  // Account button (signed-in state), takes the strong-CTA slot on
  // its own — same shape as Sign up so the layout doesn't reflow on
  // hydration.
  const accountBtn = signUpBtn;
  // Admin pill (admin-only, sits to the left of Account). Soft pill in
  // the same family as Log in, accented marine to read as "tool, not
  // CTA" — admins glance at it, members never see it.
  const adminBtn = inverted
    ? "border-cream/30 bg-cream/10 text-cream hover:border-cream hover:bg-cream/15"
    : "border-rule bg-cream-2 text-marine hover:border-marine hover:text-marine-deep";
  // Partner pill (fleet partners only, sits where the admin pill does
  // for admins). Same quiet-tool family as the admin pill but in ink —
  // it's an account surface, not a CTA.
  const partnerBtn = inverted
    ? "border-cream/30 bg-cream/10 text-cream hover:border-cream hover:bg-cream/15"
    : "border-rule bg-cream-2 text-ink-soft hover:border-ink hover:text-ink";
  // Search input theming, tracks the inverted state.
  const searchInput = inverted
    ? "border-cream/30 bg-cream/10 text-cream placeholder:text-cream/50 focus:border-cream focus:ring-cream/20"
    : "border-rule bg-cream-2 text-ink placeholder:text-mute focus:border-ink focus:ring-ink/10";
  const burger = inverted ? "text-cream/80 hover:text-cream" : "text-ink-soft hover:text-ink";

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    // Everlasting top bar (Cars & Bids pattern): sticky so the brand,
    // nav, search, and auth CTAs stay reachable at any scroll depth.
    // Solid background — content must never ghost through it.
    <header
      className={`sticky top-0 z-50 w-full border-b ${
        inverted ? "border-cream/20 bg-ink" : "border-rule bg-cream"
      }`}
    >
      {/* Single-row marketing header. Vertical switcher / theme toggle /
          search-icon were demoted to footer per luxury polish, header
          now reads as minimal brand mark + nav + one CTA, not as
          a control panel. */}

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 sm:px-10">
        <div className="flex items-baseline gap-4 sm:gap-5">
          <Link href="/" className={`font-display text-2xl tracking-tight ${brand}`}>
            RYDA
          </Link>
        </div>

        <nav
          ref={navRef}
          aria-label="Primary"
          className={`relative hidden min-w-0 flex-1 items-center justify-center gap-7 text-sm font-medium sm:flex ${tone}`}
        >
          {/* Invisible twin of the full link list at natural width — the
              fit calculation reads these, never the visible subset. */}
          <div
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 flex gap-7"
          >
            {nav.map((n) => (
              <span key={n.href} className="whitespace-nowrap">
                {n.label}
              </span>
            ))}
          </div>
          <span
            ref={moreMeasureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
          >
            More
          </span>

          {nav.slice(0, visibleCount).map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap">
              {n.label}
            </Link>
          ))}
          {visibleCount < nav.length && (
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((s) => !s)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-1 whitespace-nowrap ${tone}`}
              >
                More
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className={moreOpen ? "rotate-180" : ""}
                >
                  <polyline points="2,3.5 5,6.5 8,3.5" />
                </svg>
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-3 min-w-44 rounded-xl border border-rule bg-surface p-1.5 shadow-lg"
                >
                  {nav.slice(visibleCount).map((n) => (
                    <Link
                      key={n.href}
                      role="menuitem"
                      href={n.href}
                      onClick={() => setMoreOpen(false)}
                      className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-cream-2 hover:text-ink"
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center gap-3 sm:gap-3">
          {/* Site search, visible on >=md so it doesn't crowd small screens.
              On mobile, search is reachable from the burger menu. */}
          <form
            onSubmit={onSearchSubmit}
            role="search"
            className="hidden lg:block"
          >
            <label htmlFor="header-search" className="sr-only">
              Search RYDA
            </label>
            <div className="relative">
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${inverted ? "text-cream/55" : "text-mute"}`}
              >
                <circle cx="6" cy="6" r="4" />
                <line x1="9.2" y1="9.2" x2="12.5" y2="12.5" />
              </svg>
              <input
                id="header-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RYDA"
                className={`h-9 w-48 rounded-full border pl-8 pr-3 text-sm transition-colors focus:outline-none focus:ring-2 ${searchInput}`}
              />
            </div>
          </form>
          {/* Auth slot. Anon members see the paired Log in / Sign up
              CTAs (the original treatment). Signed-in members see a
              single "Account" pill that takes the Sign-up slot's
              styling so the bar doesn't reflow on hydration. */}
          <AuthSwap
            anon={
              <>
                <Link
                  href="/signin"
                  className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${signInBtn}`}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${signUpBtn}`}
                >
                  Sign up
                </Link>
              </>
            }
            authed={
              <>
                <VisibleWhenAdmin>
                  <Link
                    href="/admin"
                    className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${adminBtn}`}
                  >
                    Admin
                  </Link>
                </VisibleWhenAdmin>
                <VisibleWhenPartner>
                  <Link
                    href="/partner"
                    className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${partnerBtn}`}
                  >
                    Partner
                  </Link>
                </VisibleWhenPartner>
                <Link
                  href="/account"
                  className={`hidden rounded-full border px-5 py-2 text-sm font-medium transition-colors sm:inline-flex ${accountBtn}`}
                >
                  Account
                </Link>
              </>
            }
          />

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
            {/* Mobile site-search, opens to /search?q=… */}
            <form
              role="search"
              onSubmit={(e) => {
                onSearchSubmit(e);
                setOpen(false);
              }}
              className="mt-2 px-3"
            >
              <label htmlFor="mobile-search" className="sr-only">
                Search RYDA
              </label>
              <input
                id="mobile-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RYDA"
                className={`h-10 w-full rounded-full border px-4 text-sm focus:outline-none focus:ring-2 ${searchInput}`}
              />
            </form>
            <AuthSwap
              anon={
                <>
                  <Link
                    href="/signin"
                    onClick={() => setOpen(false)}
                    className={`mt-3 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${signInBtn}`}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className={`mt-2 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${signUpBtn}`}
                  >
                    Sign up
                  </Link>
                </>
              }
              authed={
                <>
                  <VisibleWhenAdmin>
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className={`mt-3 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${adminBtn}`}
                    >
                      Admin
                    </Link>
                  </VisibleWhenAdmin>
                  <VisibleWhenPartner>
                    <Link
                      href="/partner"
                      onClick={() => setOpen(false)}
                      className={`mt-3 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${partnerBtn}`}
                    >
                      Partner
                    </Link>
                  </VisibleWhenPartner>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className={`mt-3 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${accountBtn}`}
                  >
                    Account
                  </Link>
                </>
              }
            />
          </nav>
        </div>
      )}
    </header>
  );
}

