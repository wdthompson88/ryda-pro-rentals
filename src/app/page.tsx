import { WaitlistForm } from "@/components/waitlist-form";

export default function Home() {
  return (
    <>
      {/* Header */}
      <header className="w-full border-b border-rule">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
          <a href="/" className="font-display text-2xl tracking-tight text-ink">
            RYDA
          </a>
          <nav className="hidden gap-8 text-sm font-medium text-ink-soft sm:flex">
            <a href="#how-it-works" className="hover:text-ink">How it works</a>
            <a href="#vehicles" className="hover:text-ink">Vehicles</a>
            <a href="#economics" className="hover:text-ink">The math</a>
            <a href="#about" className="hover:text-ink">About</a>
          </nav>
          <a
            href="#waitlist"
            className="rounded-full border border-ink bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red"
          >
            Join the list
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-red">
              Coming soon · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Own the cars you{" "}
              <span className="italic text-red">never thought</span> you could.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              RYDA is the first US asset-backed supercar co-ownership platform.
              Hold a real share in a Ferrari, Lamborghini, or McLaren — share
              the costs, share the storage, drive the dream.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="#waitlist"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                Request membership
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
              >
                See how it works
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-rule bg-white p-8 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                Sample economics
              </p>
              <p className="mt-2 font-display text-3xl text-ink">
                Ferrari 296 GTB
              </p>
              <p className="mt-1 text-sm text-ink-soft">2024 · 1 of 6 shares</p>
              <dl className="mt-8 space-y-4 border-t border-rule pt-6 text-sm">
                <Row label="Vehicle price" value="$340,000" />
                <Row label="Your share (16.67%)" value="$56,667" />
                <Row label="Your annual cost" value="$11,800" />
                <Row label="Days you drive / year" value="~50 days" />
                <Row
                  label="Effective cost / day"
                  value="$236"
                  emphasis
                />
              </dl>
              <p className="mt-6 rounded-lg bg-cream-2 px-4 py-3 text-sm text-ink-soft">
                <span className="font-medium text-ink">90% less</span> than
                renting the same car at $2,500/day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            How it works
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
            Five steps to a supercar in your name.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply, complete identity verification, and confirm you meet RYDA membership requirements." />
            <Step n="02" title="Choose" body="Browse curated supercars in Miami, LA, and NY. Each one priced as a share of a single-purpose LLC." />
            <Step n="03" title="Acquire" body="3 to 8 co-owners form a vehicle LLC. You sign legal docs and fund your share via wire or ACH." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. White-glove handover. ~50 days and ~4,000 miles per share, per year." />
            <Step n="05" title="Exit" body="After 12 months, sell your share back to a fellow member. RYDA handles all the paperwork. 3% transfer fee." />
          </div>
        </div>
      </section>

      {/* Pillars / why RYDA */}
      <section id="economics" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Why RYDA
              </p>
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Founding members
          </p>
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
            Co-ownership shares are not registered securities — see legal
            disclaimer (forthcoming).
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-4 sm:px-10">
          <div className="sm:col-span-2">
            <p className="font-display text-2xl text-ink">RYDA</p>
            <p className="mt-3 max-w-sm text-sm text-ink-soft">
              The first US asset-backed supercar co-ownership platform.
              Headquartered in Miami, FL. Delaware-incorporated.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-ink">Contact</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><a href="mailto:hello@ryda.com" className="hover:text-ink">hello@ryda.com</a></li>
              <li><a href="mailto:investors@ryda.com" className="hover:text-ink">investors@ryda.com</a></li>
              <li><a href="mailto:press@ryda.com" className="hover:text-ink">press@ryda.com</a></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-medium text-ink">Legal</p>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><a href="/legal/privacy" className="hover:text-ink">Privacy Policy</a></li>
              <li><a href="/legal/terms" className="hover:text-ink">Terms of Service</a></li>
              <li><a href="/legal/disclaimer" className="hover:text-ink">Securities Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-rule py-6 text-center text-xs text-mute">
          © {new Date().getFullYear()} RYDA LLC. All rights reserved.
        </div>
      </footer>
    </>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd
        className={
          emphasis
            ? "font-display text-2xl text-red"
            : "font-medium text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
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
    <div className="bg-white p-8">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
