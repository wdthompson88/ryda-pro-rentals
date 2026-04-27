import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Careers — RYDA",
  description: "Open roles at RYDA. We're hiring for the Miami launch.",
};

const ROLES = [
  {
    title: "Co-Founder / COO",
    type: "Full-time · Equity",
    location: "Miami, FL (in-person)",
    body: "Run the operations side of RYDA. Build the storage + handover + insurance partnerships that make every booking flawless. Background in luxury hospitality, fleet management, or operations leadership at a high-growth startup.",
  },
  {
    title: "Head of Vehicle Acquisition",
    type: "Full-time · Equity",
    location: "Miami, FL (in-person)",
    body: "Source the vehicles. Negotiate with dealers and private sellers. Build the playbook for vehicle vetting, diligence, and pricing. 5+ years in luxury auto retail or wholesale required.",
  },
  {
    title: "Head of Member Experience",
    type: "Full-time · Equity",
    location: "Miami, FL",
    body: "First touchpoint for every prospective and active member. Run the application process, handover concierge, and member events. Background in private aviation, ultra-luxury hospitality, or wealth management client services.",
  },
  {
    title: "Senior Full-Stack Engineer",
    type: "Full-time · Equity",
    location: "Remote (US)",
    body: "Take ownership of the platform. Next.js, Supabase, Stripe Connect, and a real-time matching engine for the secondary market. We need someone who's shipped marketplaces or fintech products before.",
  },
  {
    title: "Brand Designer",
    type: "Full-time or contract",
    location: "Remote (US)",
    body: "Design the visual identity at every touchpoint — site, app, member-facing PDFs, signage, livery on the vehicles themselves. You should be able to point at a thing in the world and tell us why the typography is right.",
  },
];

export default function CareersPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Careers</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Build the supercar market that should already exist.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-ink-soft">
            We're hiring for the Miami launch. Small team, real equity, real
            cars, no committee. If you've ever wanted to build a brand from
            zero with the people who actually decide what gets built — read on.
          </p>
        </div>
      </section>

      {/* Why RYDA */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Why RYDA</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Why title="Real equity" body="Meaningful equity grants for the first 10 hires. We're not a venture-debt grinder." />
            <Why title="Small team" body="No committees, no design-by-Slack. You'll work directly with the founders on every decision." />
            <Why title="Tangible craft" body="Most of us got into this work because we love the cars. You'll touch them, drive them, photograph them." />
            <Why title="Long-term company" body="We're not building to flip in 18 months. We're building a multi-decade institution." />
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Open roles</h2>
          <ul className="mt-10 space-y-4">
            {ROLES.map((r) => (
              <li
                key={r.title}
                className="rounded-2xl border border-rule bg-surface p-8 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-xl text-ink">{r.title}</p>
                  <p className="text-xs text-mute">{r.type}</p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wider text-red">{r.location}</p>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">{r.body}</p>
                <a
                  href={`mailto:careers@ryda.com?subject=Application%20%E2%80%94%20${encodeURIComponent(r.title)}`}
                  className="mt-5 inline-flex items-center text-sm font-medium text-ink hover:text-red"
                >
                  Apply →
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* General */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Don't see your role?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Email{" "}
            <a href="mailto:careers@ryda.com" className="text-red hover:text-red-deep">
              careers@ryda.com
            </a>{" "}
            with what you'd build at RYDA. The best applications make a
            specific case for the role you should be hired into.
          </p>
        </div>
      </section>
    </>
  );
}

function Why({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
