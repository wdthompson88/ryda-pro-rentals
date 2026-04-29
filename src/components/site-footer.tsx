import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-16 sm:grid-cols-3 sm:px-10 lg:grid-cols-7">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <p className="font-display text-2xl text-ink">RYDA</p>
          <p className="mt-3 max-w-sm text-sm text-ink-soft">
            Member-managed supercar co-ownership. Miami, FL.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            ["Markets", "/markets"],
            ["Rent", "/rent"],
            ["Portfolio", "/portfolio"],
            ["Membership", "/membership"],
            ["Founding members", "/founding-members"],
            ["Events", "/events"],
          ]}
        />
        <FooterCol
          title="Services"
          links={[
            ["Insurance", "/insurance"],
            ["Concierge", "/concierge"],
            ["Storage", "/storage"],
            ["Track day", "/track-day"],
            ["List your car", "/host-your-car"],
            ["Trust & Safety", "/trust-and-safety"],
            ["Help center", "/help"],
            ["How it works", "/how-it-works"],
            ["FAQ", "/faq"],
          ]}
        />
        <FooterCol
          title="Locations"
          links={[
            ["Miami (2026)", "/locations/miami"],
            ["Los Angeles (2027)", "/locations/los-angeles"],
            ["New York (2027)", "/locations/new-york"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["About", "/about"],
            ["Journal", "/journal"],
            ["Sustainability", "/sustainability"],
            ["Press", "/press"],
            ["Investors", "/investors"],
            ["Careers", "/careers"],
            ["Contact", "/contact"],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ["Sign in", "/signin"],
            ["Privacy Policy", "/legal/privacy"],
            ["Terms of Service", "/legal/terms"],
            ["Co-Ownership Disclaimer", "/legal/disclaimer"],
            ["Cookie Policy", "/legal/cookies"],
            ["Accessibility", "/legal/accessibility"],
          ]}
        />
      </div>
      <div className="border-t border-rule py-6 text-center text-xs text-mute">
        © {new Date().getFullYear()} RYDA LLC. All rights reserved.
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
    <div className="text-sm">
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
