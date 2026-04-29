import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-display text-2xl text-ink">RYDA</p>
            <p className="mt-3 max-w-sm text-sm text-ink-soft">
              Member-managed supercar co-ownership. Miami, FL.
            </p>
            <Link
              href="/founding-members"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-ink bg-ink px-5 text-sm font-medium text-cream hover:bg-red hover:border-red"
            >
              Apply to join
            </Link>
          </div>

          <FooterCol
            title="Platform"
            links={[
              ["Fleet", "/markets"],
              ["Rent", "/rent"],
              ["Membership", "/membership"],
              ["How it works", "/how-it-works"],
              ["Compare", "/compare"],
              ["FAQ", "/faq"],
            ]}
          />
          <FooterCol
            title="Services"
            links={[
              ["Insurance", "/insurance"],
              ["Concierge", "/concierge"],
              ["Storage", "/storage"],
              ["Track day", "/track-day"],
              ["Trust & safety", "/trust-and-safety"],
              ["Member protection", "/member-protection"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["About", "/about"],
              ["Journal", "/journal"],
              ["Careers", "/careers"],
              ["Press", "/press"],
              ["Investors", "/investors"],
              ["Contact", "/contact"],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ["Privacy", "/legal/privacy"],
              ["Terms", "/legal/terms"],
              ["Co-Ownership Disclaimer", "/legal/disclaimer"],
              ["Cookies", "/legal/cookies"],
              ["Accessibility", "/legal/accessibility"],
            ]}
          />
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-mute sm:flex-row sm:px-10">
          <p>© {new Date().getFullYear()} RYDA LLC · Formed under Delaware law</p>
          <p>
            Co-ownership stakes are not registered securities and not offered
            for investment purposes.{" "}
            <Link href="/legal/disclaimer" className="text-ink-soft hover:text-ink">
              Read the disclaimer →
            </Link>
          </p>
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
    <div className="text-sm lg:col-span-2">
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-3 space-y-2 text-ink-soft">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
