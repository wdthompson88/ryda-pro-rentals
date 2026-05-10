import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HiddenWhenAuthed } from "@/components/auth-aware";
import { SITE_URL } from "@/lib/site-url";

export const metadata = {
  title: "Miami",
  description:
    "RYDA's first market. Q3 2026 launch. The story behind Miami, our partner facility, member events, and the member cohort.",
  alternates: { canonical: `${SITE_URL}/locations/miami` },
};

export default function MiamiPage() {
  // SEO: Place + parent Organization JSON-LD describes the Miami
  // market for Google's knowledge graph without claiming the
  // location is operational yet.
  //
  // Codex round-2 caught that AutomotiveBusiness with 24/7 hours
  // on a Q3 2026 pre-launch page misrepresents an active business
  // — Google's Local Business spec is for businesses customers can
  // visit today. We use `Place` instead and keep the parent-Org
  // pointer for brand attribution. Once Miami ships and we have a
  // public-facing partner facility address to share, switch to
  // `AutomotiveBusiness` with the real `streetAddress` and hours.
  //
  // Address is intentionally city-only — the partner facility's
  // street address is shared at booking per the page copy — and
  // schema.org allows partial PostalAddress.
  // The "<" -> "<" escape prevents script-context breakout.
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${SITE_URL}/locations/miami`,
    name: "RYDA Miami (launches Q3 2026)",
    description:
      "RYDA's flagship market. Member-managed LLC supercar co-ownership in Miami-Dade. Climate-controlled storage, in-house service, white-glove handover. Membership opens Q3 2026.",
    url: `${SITE_URL}/locations/miami`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Miami",
      addressRegion: "FL",
      addressCountry: "US",
    },
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: "Miami-Dade County",
    },
  };
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": SITE_URL,
    name: "RYDA",
    url: SITE_URL,
    areaServed: [
      { "@type": "City", name: "Miami" },
      { "@type": "City", name: "Miami Beach" },
      { "@type": "City", name: "Coral Gables" },
      { "@type": "City", name: "Coconut Grove" },
      { "@type": "AdministrativeArea", name: "Miami-Dade County" },
    ],
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(placeJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Miami · Q3 2026 launch
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            We start where the cars{" "}
            <span className="italic">already live.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Miami has the highest per-capita exotic-car ownership in the US.
            No state income tax. F1, Art Basel, year-round driving. A
            concentration of the wealth migrants we exist to serve.
            That's why RYDA launches here first.
          </p>
        </div>
      </section>

      {/* Market stats */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat number="$14.8B" label="US luxury auto market (2025)" />
            <Stat number="#1" label="US per-capita exotic ownership" />
            <Stat number="0%" label="Florida state income tax" />
            <Stat number="365" label="Days/year of driving weather" />
          </div>
        </div>
      </section>

      {/* Why Miami */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Why Miami first</h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-soft">
            <p>
              Miami is the only US city where supercar ownership is a normal
              part of daily life, not a special-occasion thing. You see a
              Ferrari in line at a coffee shop. Lamborghinis are not rare.
              The density of $250K+ vehicles per zip code in Miami-Dade
              exceeds entire metro areas of comparable wealth.
            </p>
            <p>
              That density is the prerequisite for what RYDA is doing. We
              need a critical mass of buyers, sellers, and active drivers
              within a 30-mile radius of one storage facility. Miami has it.
              Most US cities don't.
            </p>
            <p>
              The city's culture also matches RYDA's tone. Quiet luxury, not
              loud flexing. People who appreciate vehicles for their
              engineering. Wealth that's earned, often globally, often
              entrepreneurial. The kind of people who would rather own a
              piece of three Ferraris than the whole one Ferrari.
            </p>
          </div>
        </div>
      </section>

      {/* Partner facility */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Our Miami facility</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            RYDA's flagship storage and handover hub is in partnership with
            a vetted Miami-based luxury vehicle facility, climate-controlled,
            24/7 security, supercar-rated insurance.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Feature title="Climate controlled" body="58–72°F year-round. Humidity managed. Hurricane-rated structure." />
            <Feature title="24/7 monitored" body="On-site security, 256-camera coverage, biometric access for RYDA staff only." />
            <Feature title="In-house service" body="Manufacturer-trained techs for Ferrari, Lamborghini, McLaren, Porsche, Aston." />
            <Feature title="White-glove handover" body="Vehicle prepped, photo-documented, fueled. Delivered or pickup." />
          </div>
          <p className="mt-8 text-xs text-mute">
            Full address shared with members at booking confirmation.
          </p>
        </div>
      </section>

      {/* Member calendar */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Miami events</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Members get invitations to all RYDA Miami programming.
          </p>
          <div className="mt-12 space-y-4">
            <Event
              when="May 2026"
              what="F1 Miami Grand Prix Weekend"
              detail="Founders' track day Friday, paddock access Saturday, gala Saturday night, race day Sunday."
            />
            <Event
              when="Aug 2026"
              what="Soft launch dinner"
              detail="First 100 dinner with the founders. Vehicle reveal of the inaugural Miami fleet."
            />
            <Event
              when="Q4 2026"
              what="Cars & Cuban Coffee"
              detail="Quarterly morning meet at our facility. Espresso, pastelitos, and the cars warmed up for sunrise drives down US-1."
            />
            <Event
              when="Dec 2026"
              what="Art Basel preview night"
              detail="RYDA + a Miami gallery host members for a preview before public openings."
            />
            <Event
              when="Q1 2027"
              what="Florida Keys road trip"
              detail="3-day curated drive from Miami to Key West. Hotels, photographer, support vehicle, all coordinated."
            />
          </div>
        </div>
      </section>

      {/* Sign up */}
      <section className="border-b border-rule bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Members · Miami
          </p>
          <h2 className="mt-4 font-display text-4xl font-light sm:text-5xl">
            Become a member.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Miami launches Q3 2026. Create your account to browse the
            fleet, run the numbers, and claim a share when membership
            opens.
          </p>
          <HiddenWhenAuthed>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream"
              >
                Sign up →
              </Link>
              <Link
                href="/signin"
                className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream transition-colors hover:border-red hover:text-red"
              >
                Sign in
              </Link>
            </div>
          </HiddenWhenAuthed>
        </div>
      </section>
    </>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-light text-ink sm:text-5xl">{number}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-mute">{label}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Event({
  when,
  what,
  detail,
}: {
  when: string;
  what: string;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-rule bg-surface p-6 sm:grid-cols-12 sm:gap-6 sm:p-8">
      <div className="sm:col-span-2">
        <p className="font-display text-sm uppercase tracking-wider text-red">{when}</p>
      </div>
      <div className="sm:col-span-10">
        <p className="font-display text-xl text-ink">{what}</p>
        <p className="mt-2 text-sm text-ink-soft">{detail}</p>
      </div>
    </div>
  );
}
