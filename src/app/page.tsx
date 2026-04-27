import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { VEHICLES, formatUSD, changeFromPrev } from "@/lib/market-data";

export default function Home() {
  // Use the first 4 vehicles as the "featured market" carousel.
  const featured = VEHICLES.slice(0, 4);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-red">
              Coming soon · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Drive supercars.{" "}
              <span className="italic text-red">Own them.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              RYDA is two products in one. Rent a Ferrari for the weekend.
              Or own a real share — like a stock — in a curated supercar held
              by a Delaware LLC. Trade it any time after 12 months.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/markets"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                See the market
              </Link>
              <Link
                href="/rent"
                className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
              >
                Rent for the weekend
              </Link>
            </div>
          </div>

          {/* Mini market preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                  Live market
                </p>
                <Link href="/markets" className="text-xs font-medium text-red hover:text-red-deep">
                  All →
                </Link>
              </div>
              <ul className="divide-y divide-rule">
                {featured.map((v) => {
                  const c = changeFromPrev(v.pricePerShare, v.prevClose);
                  return (
                    <li key={v.symbol}>
                      <Link
                        href={`/markets/${v.symbol}`}
                        className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-cream-2/40"
                      >
                        <div>
                          <p className="font-display text-base text-ink">{v.name}</p>
                          <p className="text-xs text-mute">{v.ticker}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-ink tabular-nums">
                            {formatUSD(v.pricePerShare)}
                          </p>
                          <p
                            className="text-xs tabular-nums"
                            style={{ color: c.isUp ? "#00C805" : "#DC2626" }}
                          >
                            {c.isUp ? "▲" : "▼"} {c.pct.toFixed(2)}%
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-3 text-center text-xs text-mute">
              Demo data — live trading begins at Miami launch.
            </p>
          </div>
        </div>
      </section>

      {/* Two products */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ProductCard
              eyebrow="RENT"
              title="By the day."
              body="Curated supercars hand-prepared, fully insured, white-glove delivered. From $1,800/day."
              href="/rent"
              cta="Browse rentals"
            />
            <ProductCard
              eyebrow="OWN"
              title="By the share."
              body="Real ownership in a single-purpose Delaware LLC. ~$236/day effective cost. Tradeable after 12 months."
              href="/markets"
              cta="See the market"
              dark
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">How it works</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
            Five steps to a supercar in your name.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply, complete identity verification, and confirm RYDA membership requirements." />
            <Step n="02" title="Choose" body="Browse rentals or buy shares in curated supercars across Miami, LA, and NY." />
            <Step n="03" title="Acquire" body="3 to 8 co-owners form a vehicle LLC. You sign and fund your share via wire or ACH." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. ~50 days and ~4,000 miles per share, per year." />
            <Step n="05" title="Exit" body="After 12 months, sell on the RYDA market. We handle the paperwork. 3% transfer fee." />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Why RYDA</p>
              <h2 className="mt-4 font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
                Asset-backed. Curated. Concierge-operated.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">
                Renting a Ferrari for the weekend builds nothing. Owning one
                outright costs $80,000 a year before you turn the key. RYDA is
                the third option — modeled on what works in real estate
                (Pacaso) and aviation (NetJets), built for exotic cars in the
                US for the first time.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:col-span-7">
              <Pillar title="Real ownership" body="Each vehicle lives in a Delaware LLC. Your share is a registered membership interest, not a club point." />
              <Pillar title="All costs included" body="Insurance, storage, maintenance, depreciation, and registration are bundled. No surprise bills." />
              <Pillar title="Curated fleet" body="Every vehicle is hand-selected — Ferrari, Lamborghini, McLaren, Porsche, Aston Martin. Track-day eligible options on request." />
              <Pillar title="Liquid exit" body="A members-only secondary market. List your share after 12 months — RYDA handles transfer and paperwork." />
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Founding members</p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            Membership is by invitation.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
            We're vetting the first 100 founding members for the Miami launch.
            Tell us about yourself and we'll be in touch with the next steps.
          </p>
          <div className="mt-10">
            <WaitlistForm />
          </div>
          <p className="mt-6 text-xs text-cream/50">
            Membership is limited to verified individuals 28 years or older.
            Co-ownership shares are LLC membership interests, not registered
            securities — see legal disclaimer (forthcoming).
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-16 sm:grid-cols-3 sm:px-10 lg:grid-cols-7">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <p className="font-display text-2xl text-ink">RYDA</p>
            <p className="mt-3 max-w-sm text-sm text-ink-soft">
              The first US asset-backed supercar co-ownership platform.
              Headquartered in Miami, FL. Delaware-incorporated.
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
              ["Securities Disclaimer", "/legal/disclaimer"],
              ["Cookie Policy", "/legal/cookies"],
              ["Accessibility", "/legal/accessibility"],
            ]}
          />
        </div>
        <div className="border-t border-rule py-6 text-center text-xs text-mute">
          © {new Date().getFullYear()} RYDA LLC. All rights reserved.
        </div>
      </footer>
    </>
  );
}

function ProductCard({
  eyebrow,
  title,
  body,
  href,
  cta,
  dark,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  dark?: boolean;
}) {
  const bg = dark ? "bg-ink text-cream" : "bg-surface text-ink";
  const sub = dark ? "text-cream/70" : "text-ink-soft";
  const ctaBg = dark
    ? "bg-cream text-ink hover:bg-red hover:text-cream"
    : "bg-ink text-cream hover:bg-red";
  return (
    <div className={`rounded-2xl border border-rule p-10 ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">{eyebrow}</p>
      <p className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
        {title}
      </p>
      <p className={`mt-4 max-w-md text-base leading-relaxed ${sub}`}>{body}</p>
      <Link
        href={href}
        className={`mt-8 inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium transition-colors ${ctaBg}`}
      >
        {cta} →
      </Link>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface p-8">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
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
