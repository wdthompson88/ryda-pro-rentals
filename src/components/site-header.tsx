"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

// Pacaso pattern: Portfolio is the front door. We keep "Co-Own" + "Rent"
// as the next-tier nav so the dual product story stays prominent.
const NAV = [
  { href: "/markets", label: "Portfolio" },
  { href: "/rent", label: "Rent" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/concierge-ownership", label: "Concierge" },
  { href: "/membership", label: "Membership" },
];

export function SiteHeader({ inverted }: { inverted?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

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
    // Route the search to the help center search (closest to a real
    // search experience pre-launch). Help search already supports
    // query strings, vehicles, and content.
    router.push(`/help?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <header className={`w-full border-b ${inverted ? "border-cream/20" : "border-rule"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className={`font-display text-2xl tracking-tight ${brand}`}>
          RYDA
        </Link>

        <nav className={`hidden gap-7 text-sm font-medium sm:flex ${tone}`}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quiet search trigger — Pacaso has it as a persistent piece
              of the header. We expand inline rather than route to a
              search page, so the existing nav stays visible. */}
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

          {/* Mobile burger */}
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

      {/* Inline search bar — slides open from the header */}
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

      {/* Mobile menu */}
      {open && (
        <div
          id="mobile-menu"
          className={`border-t sm:hidden ${
            inverted ? "border-cream/20 bg-ink" : "border-rule bg-cream"
          }`}
        >
          <nav className={`mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 text-base ${tone}`}>
            {NAV.map((n) => (
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
