"use client";

// Sidebar nav for /account/*. Each entry highlights when the
// pathname matches. Mobile collapses to a horizontal scroll-strip
// above the content (no hamburger; the section count is small).
//
// The Notifications entry carries an unread count (migration 0049).
// Four notes on it:
//
//   * The number is fetched HERE rather than passed down, because the
//     nav and the feed sit in different columns of the /account layout
//     and a shared provider would make every account page pay for state
//     it does not use. src/lib/use-notifications.ts keeps the two in
//     step with a window event.
//   * It renders in BOTH the desktop list and the mobile strip, which
//     are both in the DOM at once. The pill in each is aria-hidden and
//     the count reaches assistive tech as part of each link's own
//     accessible name, so a screen-reader user hears it when they tab to
//     the entry.
//   * THERE IS NO LIVE REGION HERE, deliberately. This nav used to carry
//     a polite sr-only region announcing the same count that the feed's
//     own status line announces (notification-feed.tsx) — and the two
//     are on screen together on /account/notifications, so one "Mark all
//     read" produced two announcements of the same fact. The feed's is
//     the one that survived: it is visible text rather than sr-only, it
//     sits where the change happened, and the count only ever changes as
//     a result of acting on the feed.
//   * Zero renders nothing. A "0" badge is noise, and an empty pill is
//     worse.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStatus } from "@/lib/use-auth-status";
import { useUnreadNotificationCount } from "@/lib/use-notifications";

type Item = {
  href: string;
  label: string;
  icon: string;
  // Sub-line shown beneath the label; helps members scan.
  hint?: string;
};

const ITEMS: Item[] = [
  { href: "/account", label: "Overview", icon: "◇", hint: "Stats + activity" },
  // Rental-first ordering: requests sit directly under Overview,
  // mirroring the admin pipeline's placement.
  { href: "/account/requests", label: "Rental requests", icon: "◔", hint: "Where each request stands" },
  { href: "/account/portfolio", label: "Your shares", icon: "◑", hint: "Cars you co-own" },
  { href: "/account/profile", label: "Profile", icon: "◐", hint: "Name, contact, address" },
  { href: "/account/security", label: "Login & security", icon: "◆", hint: "Email, password, sessions" },
  { href: "/account/verification", label: "Verification", icon: "✓", hint: "KYC, driving record" },
  { href: "/account/payments", label: "Payments", icon: "$", hint: "Cards, bank ACH" },
  { href: "/account/membership", label: "Membership", icon: "◇", hint: "Tier, billing, renewal" },
  // The feed lives at this route since build loop 0C; the old
  // channel-preferences form moved to /account/notifications/preferences.
  { href: "/account/notifications", label: "Notifications", icon: "✉", hint: "Requests, answers, updates" },
  { href: "/account/documents", label: "Documents", icon: "▤", hint: "Agreements, certificates" },
  { href: "/account/privacy", label: "Privacy & data", icon: "•", hint: "Export, delete account" },
];

export function AccountNav() {
  const pathname = usePathname() ?? "";
  const { status: authStatus } = useAuthStatus();
  const { unreadCount } = useUnreadNotificationCount(authStatus === "authed");

  // Which entry, if any, wears the badge. Keyed by href rather than by
  // index so re-ordering ITEMS cannot silently move the count.
  const badgeFor = (href: string): number =>
    href === "/account/notifications" ? unreadCount : 0;

  return (
    <nav aria-label="Account sections">
      {/* No live region — see the header note. The feed owns the one
          announcement of this count. */}

      {/* Desktop: vertical sidebar list */}
      <ul className="hidden flex-col gap-1 lg:flex">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = badgeFor(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 transition-colors ${
                  active
                    ? "bg-ink text-cream"
                    : "text-ink-soft hover:bg-cream-2 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm ${
                    active ? "text-cream/80" : "text-mute"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-medium">
                      {item.label}
                    </span>
                    {badge > 0 && (
                      <>
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                            active ? "bg-cream text-ink" : "bg-red text-cream"
                          }`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                        {/* The count as part of the link's own name.
                            This is the ONLY way it reaches assistive
                            tech from the nav — there is no live region
                            here; the feed owns that announcement. */}
                        <span className="sr-only">
                          , {badge} unread
                        </span>
                      </>
                    )}
                  </span>
                  {item.hint && (
                    <span
                      className={`block text-[11px] ${
                        active ? "text-cream/60" : "text-mute"
                      }`}
                    >
                      {item.hint}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Mobile + tablet: horizontal scrollable chip strip. Each chip
          is the section label, no hint, scaled to fit. */}
      <div className="-mx-6 overflow-x-auto px-6 lg:hidden">
        <ul className="flex min-w-max gap-2">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = badgeFor(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-ink bg-ink text-cream"
                      : "border-rule bg-cream text-ink-soft hover:border-ink hover:text-ink"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                  {badge > 0 && (
                    <>
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                          active ? "bg-cream text-ink" : "bg-red text-cream"
                        }`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                      <span className="sr-only">, {badge} unread</span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

// /account is exact-match active; deeper paths (/account/profile)
// are active when pathname starts with the href + a slash. This
// avoids /account being marked active on every sub-page.
function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(href + "/");
}
