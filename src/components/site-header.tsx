"use client";

import Link from "next/link";
import { useState } from "react";

const NAV = [
  { href: "/markets", label: "Fleet" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/compare", label: "Compare" },
  { href: "/membership", label: "Membership" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ inverted }: { inverted?: boolean } = {}) {
  const [open, setOpen] = useState(false);

  const tone = inverted ? "text-cream/70 hover:text-cream" : "text-ink-soft hover:text-ink";
  const brand = inverted ? "text-cream" : "text-ink";
  const ctaBase = inverted
    ? "border-cream bg-cream text-ink hover:bg-red hover:text-cream hover:border-red"
    : "border-ink bg-ink text-cream hover:bg-red hover:border-red";
  const burger = inverted ? "text-cream/80 hover:text-cream" : "text-ink-soft hover:text-ink";

  return (
    <header className={`w-full border-b ${inverted ? "border-cream/20" : "border-rule"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className={`font-display text-2xl tracking-tight ${brand}`}>
          RYDA
        </Link>

        <nav className={`hidden gap-8 text-sm font-medium sm:flex ${tone}`}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
              href="/founding-members"
              onClick={() => setOpen(false)}
              className={`mt-2 inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors ${ctaBase}`}
            >
              Apply to join
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
