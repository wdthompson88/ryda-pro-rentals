"use client";

// Sidebar nav for /account/*. Each entry highlights when the
// pathname matches. Mobile collapses to a horizontal scroll-strip
// above the content (no hamburger; the section count is small).

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon: string;
  // Sub-line shown beneath the label; helps members scan.
  hint?: string;
};

const ITEMS: Item[] = [
  { href: "/account", label: "Overview", icon: "◇", hint: "Stats + activity" },
  { href: "/account/profile", label: "Profile", icon: "◐", hint: "Name, contact, address" },
  { href: "/account/security", label: "Login & security", icon: "◆", hint: "Email, password, sessions" },
  { href: "/account/verification", label: "Verification", icon: "✓", hint: "KYC, driving record" },
  { href: "/account/payments", label: "Payments", icon: "$", hint: "Cards, bank ACH" },
  { href: "/account/membership", label: "Membership", icon: "◇", hint: "Tier, billing, renewal" },
  { href: "/account/notifications", label: "Notifications", icon: "✉", hint: "Email, SMS, push" },
  { href: "/account/documents", label: "Documents", icon: "▤", hint: "Agreements, certificates" },
  { href: "/account/privacy", label: "Privacy & data", icon: "•", hint: "Export, delete account" },
];

export function AccountNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Account sections">
      {/* Desktop: vertical sidebar list */}
      <ul className="hidden flex-col gap-1 lg:flex">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
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
                  <span className="block text-sm font-medium">{item.label}</span>
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
