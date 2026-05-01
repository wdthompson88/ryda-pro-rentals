import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PlanesMissionProfileForm } from "@/components/planes-mission-profile-form";

export const metadata: Metadata = {
  title: "RYDA Planes — Coming soon",
  description:
    "RYDA Planes is in design. Fractional access to private aviation, structured the same way as our cars and boats verticals — member-managed Delaware LLCs, concierge-operated.",
};

export default function PlanesComingSoon() {
  return (
    <>
      <SiteHeader />

      {/* Cinematic hero — same pattern as the cars portfolio hero, but
          with a "Coming soon" treatment. The page is intentionally
          spare: there's no inventory yet and we don't want to bluff. */}
      <section className="relative isolate min-h-[70vh] overflow-hidden border-b border-rule">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=80"
            alt="Private jet on tarmac at dusk"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/85"
          />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-24 text-cream sm:px-10 sm:py-36">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-cream/80">
            RYDA Planes · In design
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
            Fractional access to private aviation,{" "}
            <span className="italic text-red">structured the same way.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-cream/85">
            We&apos;re building Planes the way we built Cars and Boats —
            member-managed Delaware LLCs, single-airframe per LLC, real
            ownership rather than card-time. Different operating model
            (Part 91 vs Part 135 matters), different timelines, same
            doctrine.
          </p>
          <div className="mt-10 max-w-2xl rounded-2xl border border-cream/20 bg-cream/5 p-6 backdrop-blur sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cream/70">
              Tell us your mission profile
            </p>
            <p className="mt-2 text-sm text-cream/85">
              Help us shape the founding cohort: jet class, annual hours,
              primary base. We contact you when a profile-matching airframe
              and operator pair are ready — not before.
            </p>
            <div className="mt-5">
              <PlanesMissionProfileForm />
            </div>
          </div>
        </div>
      </section>

      {/* What we're working on — keep it short and honest. Nothing
          shipped, no fake screenshots. Three considerations the
          founding cohort cares about. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What we&apos;re solving for
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
            The problems that broke other fractional aviation programs.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Pillar
              eyebrow="01"
              title="Real ownership, not card time"
              body="NetJets and Wheels Up sell hours against a fleet. We're targeting the original fractional model — a registered ownership stake in a specific airframe, held in a member-managed Delaware LLC."
            />
            <Pillar
              eyebrow="02"
              title="Honest math on operating cost"
              body="Per-hour costs hide the true picture. RYDA Planes will publish full annual carrying — hangar, crew, insurance, MX reserves, engine reserves — broken out per share, the same way we do on cars and boats."
            />
            <Pillar
              eyebrow="03"
              title="Operator separation"
              body="The LLC owns the airframe. A Part 135 operator runs the flight ops under a separate management agreement. Members retain governance — replacement, sale, modifications — through standard LLC voting."
            />
          </div>
        </div>
      </section>

      {/* Planned timeline — generous and conservative, no precision
          we can't back up. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Timeline
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
            Indicative, not committed.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-ink-soft">
            Aviation regulatory architecture is meaningfully different
            from ground vehicles. We&apos;d rather list later and get the
            structure right than ship a half-baked product. Below is the
            current working plan; nothing here is a contract.
          </p>

          <ol className="mt-12 space-y-6">
            <Phase
              n="01"
              date="Q3 2026"
              title="Cars + Boats live in Miami"
              body="The two existing verticals operating in market. Operational lessons from real members feed the Planes design."
            />
            <Phase
              n="02"
              date="Q4 2026"
              title="Founding cohort outreach"
              body="We talk to the first 20–40 prospective Planes members about mission profile (jet category, hours, base), structure, and operator preference."
            />
            <Phase
              n="03"
              date="2027"
              title="Operator + airframe selection"
              body="Pick the Part 135 operator partner; identify a first airframe (current working hypothesis: a light-jet category like the Phenom 300E or Citation CJ4 Gen2)."
            />
            <Phase
              n="04"
              date="2028+"
              title="First LLC formed"
              body="If economics and demand confirm, the first single-airframe LLC takes member funding. Same buy-in / annual operating split / planned exit doctrine as cars and boats — adjusted for the aviation cost stack."
            />
          </ol>
        </div>
      </section>

      {/* Cross-vertical CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Meanwhile
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Cars and Boats are open for founding members.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            If the Planes thesis resonates, the cars and boats programs
            run the same playbook. Same LLC structure, same exit
            doctrine, same concierge ops.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/cars"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See RYDA Cars →
            </Link>
            <Link
              href="/boats"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              See RYDA Boats →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Pillar({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-sm text-red">{eyebrow}</p>
      <h3 className="mt-3 font-display text-xl text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Phase({
  n,
  date,
  title,
  body,
}: {
  n: string;
  date: string;
  title: string;
  body: string;
}) {
  return (
    <li className="grid grid-cols-1 gap-4 rounded-2xl border border-rule bg-surface p-6 sm:grid-cols-12">
      <div className="sm:col-span-3">
        <p className="font-display text-sm text-red">{n}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-mute">
          {date}
        </p>
      </div>
      <div className="sm:col-span-9">
        <p className="font-display text-lg text-ink">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
    </li>
  );
}
