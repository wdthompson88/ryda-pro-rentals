import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { InlineEmailCapture } from "@/components/inline-email-capture";

// Coming-soon treatment for the entire /boats/* tree. Rendered by
// src/app/boats/layout.tsx when the requester isn't an admin. The
// underlying pages still exist and admins see them; this is a
// public-facing curtain while the boats vertical is finalized.
//
// Visual idiom mirrors /planes (cinematic dark hero, pillars, honest
// timeline) so the two pre-launch verticals read as a deliberate set
// rather than ad-hoc placeholders. Copy is tuned for boats being
// further along than planes — opening, not "in design."
export function BoatsComingSoon() {
  return (
    <>
      <SiteHeader />

      <section className="relative isolate min-h-[70vh] overflow-hidden border-b border-rule">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/posters/boats-yacht.jpg"
            alt="Yacht at anchor in Miami at golden hour"
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
            RYDA Boats · Opening soon
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
            Co-own or charter the world&apos;s most beautiful boats —{" "}
            <span className="italic">soon.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-cream/85">
            We&apos;re finishing the Miami boats program — survey, slip,
            captain, and the first hulls. Same doctrine as RYDA Cars:
            member-managed LLC per boat, up to five verified members,
            three-year planned exit. Real ownership, not card-time.
          </p>
          <div className="mt-10 max-w-2xl rounded-2xl border border-cream/20 bg-cream/5 p-6 backdrop-blur sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cream/70">
              Get the launch invite
            </p>
            <p className="mt-2 text-sm text-cream/85">
              Drop your email and we&apos;ll write you the day the first
              hulls open to members. No marketing drip; one note when it
              ships.
            </p>
            <div className="mt-5">
              <InlineEmailCapture
                source="boats-waitlist"
                buttonLabel="Notify me when boats open →"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What we&apos;re solving for
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl">
            The problems that broke other boat-share programs.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Pillar
              eyebrow="01"
              title="One hull, one LLC"
              body="Every boat is held in its own member-managed LLC with up to five verified owners. No commingled fleet, no points, no surprise availability windows."
            />
            <Pillar
              eyebrow="02"
              title="Honest carrying cost"
              body="Dockage, captain, fuel, insurance, MX reserves, depreciation — all published per share before you sign. The cost sheet is the contract."
            />
            <Pillar
              eyebrow="03"
              title="Planned three-year exit"
              body="Each LLC has a defined holding period and exit. Members aren&apos;t trapped in an indefinite asset; the boat is sold or rolled on a schedule everyone agreed to up front."
            />
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Meanwhile
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            RYDA Cars is open for early members.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            The cars program runs the playbook boats will inherit —
            single-asset LLCs, transparent operating costs, exit on a
            schedule. Worth a look while we finish the marina.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/cars"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See RYDA Cars →
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Talk to us →
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
