import Link from "next/link";

// Slim footer — collapsed from 6 columns to a 3-column layout that
// reads as a luxury house mark + 2 link groups, plus a quiet bottom
// strip with legal + disclaimer. Aman / Loro Piana keep marketing
// footers tight: the prospect doesn't need a sitemap, they need a
// mark that signs the page off.

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <p className="font-display text-3xl text-ink">RYDA</p>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              Luxury vehicle access — Cars, Boats, and (soon) Planes.
              Miami, FL · Launching Q3 2026.
            </p>
            <Link
              href="/founding-members"
              className="mt-7 inline-flex h-12 items-center justify-center border border-ink bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red"
            >
              Request membership
            </Link>
            <div className="mt-6 flex items-center gap-4 text-xs text-mute">
              <Link href="/signin" className="hover:text-ink">
                Sign in
              </Link>
              <span className="text-rule">·</span>
              <Link href="/signup" className="hover:text-ink">
                Sign up
              </Link>
              <span className="text-rule">·</span>
              <Link href="/search" className="hover:text-ink">
                Search
              </Link>
              <span className="text-rule">·</span>
              <Link href="/help" className="hover:text-ink">
                Help center
              </Link>
            </div>
          </div>

          {/* Two link groups, dense */}
          <FooterCol
            title="The portfolio"
            links={[
              ["Cars", "/cars"],
              ["Boats", "/boats"],
              ["Planes", "/planes"],
              ["Membership", "/membership"],
              ["How it works", "/how-it-works"],
              ["Sample documents", "/sample-documents"],
              ["Inside RYDA", "/inside"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["About", "/about"],
              ["Journal", "/journal"],
              ["Investors", "/investors"],
              ["Press", "/press"],
              ["Careers", "/careers"],
              ["Contact", "/contact"],
              ["Trust &amp; safety", "/trust-and-safety"],
            ]}
          />
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-mute sm:flex-row sm:items-center sm:px-10">
          <p>© {new Date().getFullYear()} RYDA LLC · Formed under Delaware law</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/legal/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/legal/disclaimer" className="hover:text-ink">
              Co-ownership disclaimer
            </Link>
            <Link href="/legal/cookies" className="hover:text-ink">
              Cookies
            </Link>
            <Link href="/legal/accessibility" className="hover:text-ink">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div className="text-[15px] lg:col-span-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
        {title}
      </p>
      <ul className="mt-5 space-y-3 text-ink-soft">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition-colors hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
