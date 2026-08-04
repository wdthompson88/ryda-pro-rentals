"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSwap, VisibleWhenAdmin } from "@/components/auth-aware";

// RYDA spans three verticals: Cars, Boats, Planes. The header detects
// which vertical the visitor is in via the pathname and swaps the nav
// accordingly. Plus a small site-search bar so members can find a car,
// boat, or doc from any page. Sign-in / Sign-up are paired buttons —
// soft cream "Log in" next to a dark "Sign up" CTA, in RYDA's palette.

type Vertical = "cars" | "boats" | "planes" | "neutral";

const CARS_NAV = [
  { href: "/portfolio", label: "Portfolio" },
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
  // Planes is just a coming-soon surface today, no sub-nav.
];

function detectVertical(pathname: string | null): Vertical {
  if (!pathname) return "neutral";
  if (pathname.startsWith("/boats")) return "boats";
  if (pathname.startsWith("/planes")) return "planes";
  if (pathname === "/") return "neutral";
  // Everything else (the existing car-era routes) is the cars vertical:
  // /portfolio, /rent, /membership, /how-it-works, /faq, /inside, /journal,
  // /vs, /sample-documents, etc. plus /cars itself.
  return "cars";
}

function navForVertical(v: Vertical): { href: string; label: string }[] {
  if (v === "boats") return BOATS_NAV;
  if (v === "planes") return PLANES_NAV;
  if (v === "neutral") return [];
  return CARS_NAV;
}

// Sign in (Log In), soft cream with ink text. Hover lifts to red.
const signInBtn = "border-rule bg-cream-2 text-ink hover:border-red hover:text-red";
// Sign up, dark ink with strong CTA presence.
const signUpBtn = "border-ink bg-ink text-cream hover:bg-red hover:border-red";
// Account button (signed-in state), takes the strong-CTA slot on
// its own — same shape as Sign up so the layout doesn't reflow on
// hydration.
const accountBtn = signUpBtn;
// Admin pill (admin-only, sits to the left of Account). Soft pill in
// the same family as Log in, accented marine to read as "tool, not
// CTA" — admins glance at it, members never see it.
const adminBtn = "border-rule bg-cream-2 text-marine hover:border-marine hover:text-marine-deep";
// Search input theming.
const searchInput =
  "border-rule bg-cream-2 text-ink placeholder:text-mute focus:border-ink focus:ring-ink/10";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const vertical = detectVertical(pathname);
  const nav = navForVertical(vertical);

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="w-full border-b border-rule">
      {/* Single-row marketing header. Vertical switcher / search-icon
          were demoted to footer per luxury polish, header now reads as
          minimal brand mark + nav + one CTA, not as a control panel. */}

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10">
        <div className="flex items-baseline gap-4 sm:gap-5">
          <Link href="/" className="font-display text-2xl tracking-tight text-ink">
            RYDA
          </Link>
          {/* Inline vertical switcher, Cars · Boats · Planes. The
              currently-active vertical is bolded ink; the others
              are mute and clickable so members can jump between
              verticals without bouncing back to the splitter. */}
          {vertical !== "neutral" && (
            <div className="hidden items-baseline gap-2 text-[10px] font-medium uppercase tracking-[0.18em] sm:flex">
              <VerticalSwitch href="/cars" label="Cars" active={vertical === "cars"} />
              <span aria-hidden className="text-mute/50">
                ·
              </span>
              <VerticalSwitch href="/boats" label="Boats" active={vertical === "boats"} />
              <span aria-hidden className="text-mute/50">
                ·
              </span>
              <VerticalSwitch href="/planes" label="Planes" active={vertical === "planes"} />
            </div>
          )}
        </div>

        <nav className="hidden gap-7 text-sm font-medium md:flex text-ink-soft hover:text-ink">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full sm:hidden text-ink-soft hover:text-ink"
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
        <div id="mobile-menu" className="border-t sm:hidden border-rule bg-cream">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 text-base text-ink-soft">
            {/* Mobile vertical switcher, same Cars / Boats / Planes
                jump as the desktop header. Active vertical bolded. */}
            <div className="mb-2 flex items-baseline gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em]">
              <VerticalSwitch href="/cars" label="Cars" active={vertical === "cars"} />
              <span aria-hidden className="text-mute/50">
                ·
              </span>
              <VerticalSwitch href="/boats" label="Boats" active={vertical === "boats"} />
              <span aria-hidden className="text-mute/50">
                ·
              </span>
              <VerticalSwitch href="/planes" label="Planes" active={vertical === "planes"} />
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

// Inline vertical-switch link used next to the RYDA wordmark.
// Active vertical: bolded ink. Inactive verticals: mute, clickable,
// hover transition to ink.
function VerticalSwitch({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`transition-colors ${
        active ? "text-ink font-semibold" : "text-mute font-medium hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
