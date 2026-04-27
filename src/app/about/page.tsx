import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About — RYDA",
  description:
    "The first US asset-backed supercar co-ownership platform. Our story, our team, our mission.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            About
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            We're building the supercar market that should already exist.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            For decades, owning an exotic car has been all-or-nothing —
            a $300,000 cash commitment and $80,000 a year in costs. Or worse,
            renting one for a weekend at $5,000/day with no equity, no community,
            and no priority access. RYDA is the third option.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Our story</h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-soft">
            <p>
              RYDA started with a conversation about a car we couldn't justify
              buying. Ryan had driven a Ferrari once, on a track day in Italy,
              and spent the next three years thinking about it. The math of
              owning one alone never worked. Renting was expensive and hollow.
              Something was missing in the middle.
            </p>
            <p>
              In Europe, that middle ground exists. Companies like Supercar
              Sharing AG in Switzerland have spent a decade proving that
              structured co-ownership of supercars works — legally,
              operationally, and as a community. Thousands of European
              enthusiasts co-own Ferraris, Lamborghinis, and McLarens. None of
              it existed in the US.
            </p>
            <p>
              We built RYDA to fill that gap. An asset-backed, legally
              structured, concierge-operated co-ownership platform for the US
              market. We took the best of what works in Europe and rebuilt it
              for American legal structures (Delaware LLCs), American
              lifestyles, and the markets where the demand is concentrated.
            </p>
            <p>
              We launched in Miami first because it is the most natural
              starting point: the highest per-capita luxury auto ownership in
              the country, no state income tax, F1 Grand Prix and Art Basel,
              and a year-round driving culture.
            </p>
            <p>
              Our goal is simple: make ownership of extraordinary vehicles
              possible for more enthusiasts — responsibly, transparently, and
              with a community-first experience.
            </p>
          </div>
        </div>
      </section>

      {/* Mission + Values */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Mission
          </p>
          <p className="mt-4 max-w-3xl font-display text-2xl leading-tight text-ink sm:text-3xl">
            "To make ownership of extraordinary vehicles possible for more
            enthusiasts — responsibly, transparently, and with a community-first
            experience."
          </p>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Value
              title="Transparency"
              body="Every co-owner sees every cost, every report, and every document. No hidden fees. Ever."
            />
            <Value
              title="Exclusivity"
              body="Membership is earned, not bought. Every member is verified. Every vehicle is vetted."
            />
            <Value
              title="Excellence"
              body="Concierge-grade preparation and handover for every booking. Our standard does not vary."
            />
            <Value
              title="Integrity"
              body="Asset-backed ownership with unambiguous legal documentation. We do what we say."
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Founders</h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Bios will appear here as the founding team is finalized.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <Founder
              name="Ryan Galli"
              role="Founder & CEO"
              bio="Founder of RYDA. Background in [TBD]. Lifelong car enthusiast. Lives in Miami."
            />
            <Founder
              name="—"
              role="Co-Founder & [Role TBD]"
              bio="Position open. Looking for a co-founder with operations or product/tech background to scale RYDA across the US."
              ghost
            />
          </div>
        </div>
      </section>

      {/* HQ */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Headquarters</h2>
          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <dl className="space-y-5 text-sm">
              <Fact label="Legal Entity" value="RYDA LLC" />
              <Fact label="State of Incorporation" value="Delaware" />
              <Fact label="Headquarters" value="Miami, FL (address TBD)" />
              <Fact label="Operating Markets" value="Miami, FL (2026) · Los Angeles, CA (2027) · New York, NY (2027)" />
              <Fact label="General" value="hello@ryda.com" />
              <Fact label="Press" value="press@ryda.com" />
              <Fact label="Investors" value="investors@ryda.com" />
              <Fact label="Partnerships" value="partners@ryda.com" />
            </dl>
            <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-rule bg-ink/5">
              {/* Placeholder for HQ map */}
              <div className="flex h-full items-center justify-center text-sm text-mute">
                Map of HQ — embed once address is finalized
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Become a founding member.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We're vetting the first 100 founding members for the Miami launch.
          </p>
          <Link
            href="/#waitlist"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Apply now →
          </Link>
        </div>
      </section>
    </>
  );
}

function Value({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Founder({
  name,
  role,
  bio,
  ghost,
}: {
  name: string;
  role: string;
  bio: string;
  ghost?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-rule p-8 ${ghost ? "bg-cream-2/40" : "bg-white"}`}>
      <div className="aspect-square w-24 rounded-full bg-ink/10" />
      <p className="mt-6 font-display text-xl text-ink">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{role}</p>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{bio}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-b border-rule pb-3 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="text-sm text-ink sm:text-right">{value}</dd>
    </div>
  );
}
