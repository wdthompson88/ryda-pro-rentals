import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "List your car — RYDA",
  description:
    "Have a supercar sitting in storage? List it on RYDA — earn from rentals, or contribute it to a member-managed LLC and share it with vetted co-owners. We handle insurance, ops, and concierge.",
};

export default function HostYourCarPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            For owners
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Got a car that mostly{" "}
            <span className="italic text-red">just sits there?</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            The average exotic is driven less than 2,500 miles per year. The
            other 363 days, it depreciates in a garage costing you money.
            RYDA gives you two options to put that asset to work — without
            losing control.
          </p>
        </div>
      </section>

      {/* Two paths */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Option
              eyebrow="OPTION 1"
              title="Lease it to a vehicle LLC."
              body="Keep 100% ownership. Lease your vehicle to one of RYDA's vehicle LLCs under a counsel-reviewed lease. The LLC handles insurance, prep, handover, damage claims, and pays you a monthly lease fee. You set blackout dates and can end the lease."
              points={[
                "Predictable monthly lease fee from the vehicle LLC",
                "LLC handles insurance, ops, member services",
                "RYDA's underwriting screens every member who drives",
                "Free storage in RYDA partner facility (optional)",
                "Pull the car back at any notice period defined in the lease",
              ]}
              cta="Apply to lease"
            />
            <Option
              eyebrow="OPTION 2"
              title="Bring it into a co-ownership LLC."
              body="Contribute your car into a member-managed Delaware LLC with up to 10 vetted co-owners. You keep one or more shares, the rest are filled by RYDA-vetted members. You and your co-owners run the LLC together; RYDA handles operations."
              points={[
                "Recover most of your capital while keeping access to the car",
                "Stay involved as a co-owner, or step away after closing",
                "RYDA handles the LLC formation, Operating Agreement, and member onboarding",
                "Insurance + storage move to the LLC at closing",
                "3% transaction fee — far less than dealer markup",
              ]}
              cta="Talk to an advisor"
              dark
            />
          </div>
        </div>
      </section>

      {/* What we accept */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">What we accept</h2>
          <p className="mt-4 text-base text-ink-soft">
            We curate the fleet. Not every car works on the RYDA platform.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <Yes>
              Modern (post-2018) Ferrari, Lamborghini, McLaren, Porsche
              (911 Turbo and up), Aston Martin, Bentley, Rolls-Royce
            </Yes>
            <Yes>
              Select hypercars (Pagani, Koenigsegg, hybrid Aston, Bugatti) —
              case by case
            </Yes>
            <Yes>
              Notable classics with provenance (Ferrari Daytona, 911
              Carrera RS, etc.) — co-ownership only, not rental
            </Yes>
            <No>
              Vehicles outside our launch markets (Miami first; LA + NY
              following 2027)
            </No>
            <No>
              Vehicles with structural damage or salvage history
            </No>
            <No>
              Vehicles in a leased or financed position you can't title-clear
            </No>
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Process</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Apply" body="Tell us about the car. We'll respond within 3 business days with a yes/no/request-more-info." />
            <Step n="02" title="Inspection" body="One of our certified inspectors evaluates the vehicle. ~2 hours, at your location or our facility." />
            <Step n="03" title="Onboarding" body="Storage, insurance, photos, and listing setup. ~5 business days end-to-end." />
            <Step n="04" title="Live" body="Rental bookings or member onboarding into the co-ownership LLC begin. You get monthly statements and 24/7 visibility." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Tell us about your car.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We respond to every owner application personally within 3 business days.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Apply →
          </Link>
        </div>
      </section>
    </>
  );
}

function Option({
  eyebrow,
  title,
  body,
  points,
  cta,
  dark,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: string;
  dark?: boolean;
}) {
  const bg = dark ? "bg-ink text-cream" : "bg-surface text-ink";
  const sub = dark ? "text-cream/70" : "text-ink-soft";
  const ctaCls = dark
    ? "bg-cream text-ink hover:bg-red hover:text-cream"
    : "bg-ink text-cream hover:bg-red";
  return (
    <div className={`rounded-2xl border border-rule p-10 ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">{eyebrow}</p>
      <p className="mt-4 font-display text-4xl font-light sm:text-5xl">{title}</p>
      <p className={`mt-4 ${sub}`}>{body}</p>
      <ul className="mt-8 space-y-3 text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3">
            <span className="mt-1 text-red">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/contact"
        className={`mt-10 inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium transition-colors ${ctaCls}`}
      >
        {cta} →
      </Link>
    </div>
  );
}

function Yes({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed text-ink-soft">
      <span className="mt-1 text-red">✓</span>
      <span>{children}</span>
    </li>
  );
}

function No({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed text-ink-soft">
      <span className="mt-1 text-red">×</span>
      <span>{children}</span>
    </li>
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
