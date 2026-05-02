import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Footer, brand row on top + 4 link columns below + legal strip.
// Pacaso / Brunello pattern: full sitemap visible, but quiet eyebrows
// and 15px body so the density doesn't shout. Theme toggle lives in
// the bottom legal strip, power-user setting, not a top-level nav.

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      {/* Brand row, generous, full width */}
      <div className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <p className="font-display text-3xl text-ink">RYDA</p>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                Luxury vehicle access, Cars, Boats, and (soon) Planes.
                Member-managed LLCs, professionally operated.
                Miami launching Q3 2026.
              </p>
            </div>
            <div className="lg:col-span-5 lg:flex lg:items-end lg:justify-end">
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center border border-ink bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red"
                >
                  Sign up
                </Link>
                <div className="flex flex-wrap items-center gap-x-4 text-xs text-mute">
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
            </div>
          </div>
        </div>
      </div>

      {/* 4 link columns */}
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <FooterCol
            title="Cars"
            links={[
              ["Portfolio", "/markets"],
              ["Rent", "/rent"],
              ["Membership", "/membership"],
              ["How it works", "/how-it-works"],
              ["Insurance", "/insurance"],
              ["Storage", "/storage"],
              ["FAQ", "/faq"],
            ]}
          />
          <FooterCol
            title="Boats"
            links={[
              ["Portfolio", "/boats/portfolio"],
              ["Charter", "/boats/rent"],
              ["Membership", "/boats/membership"],
              ["How it works", "/boats/how-it-works"],
              ["About boats", "/boats/about"],
              ["FAQ", "/boats/faq"],
              ["Sample documents", "/boats/sample-documents"],
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              ["Journal", "/journal"],
              ["Inside RYDA", "/inside"],
              ["Sample documents", "/sample-documents"],
              ["Trust & safety", "/trust-and-safety"],
              ["Member protection", "/member-protection"],
              ["Sustainability", "/sustainability"],
              ["Host your vehicle", "/host-your-car"],
              ["Help center", "/help"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["About", "/about"],
              ["Investors", "/investors"],
              ["Press", "/press"],
              ["Careers", "/careers"],
              ["Contact", "/contact"],
            ]}
          />
        </div>
      </div>

      {/* Legal bottom strip */}
      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-mute sm:flex-row sm:items-center sm:px-10">
          <p>© {new Date().getFullYear()} RYDA LLC · Formed under applicable LLC law</p>
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
            <ThemeToggle className="ml-2" />
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
    <div className="text-[15px]">
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
