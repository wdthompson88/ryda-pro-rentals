import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About — RYDA",
  description:
    "A US member-managed supercar co-ownership platform. Our story, our team, our mission.",
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
            Owning is all-or-nothing. Renting is hollow. RYDA is the third option.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Our story</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              RYDA started in Florida. Ryan and Dave rented a Lamborghini for
              a weekend and ran the numbers on Sunday night: solo ownership
              was unworkable, renting was hollow.
            </p>
            <p>
              The math worked, the structure worked, the buyer pool was
              there. The middle ground — real co-ownership of real
              supercars, with professional ops and a clean LLC wrapper —
              just didn&apos;t exist in the US.
            </p>
            <p>
              We built RYDA to fill that gap — member-managed LLCs,
              professional ops, US markets. Miami first: highest per-capita
              luxury auto density, no state income tax, year-round driving.
            </p>
          </div>
        </div>
      </section>

      {/* Founder's letter */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            A note from our founder
          </p>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
            What we're trying to build, in plain English.
          </h2>
          <div className="mt-10 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              I&apos;m going to keep this short. There are roughly three honest
              ways to put a supercar in your driveway in the United States
              today. You can buy one outright, which costs $250,000 to
              $1,000,000 of capital plus $40,000 to $80,000 a year to keep —
              and the car sits idle 90% of the year. You can rent one for
              $2,000–$3,000 a day from a marketplace where coverage and quality
              vary by host. Or you can join a club that hands you rotating
              access for an annual fee that&apos;s consumed regardless of how
              much you drive.
            </p>
            <p>
              None of those was the right answer for us, or for any of our
              friends who actually wanted to drive an exotic. RYDA is the
              fourth answer. It&apos;s a real ownership stake — title held by
              a single-purpose LLC where you and up to four other
              verified members are the registered owners. We run the
              operations under a separate Management Services Agreement, the
              same way an aviation club runs the jets it doesn&apos;t own.
            </p>
            <p>
              The math is simple: a $34K share in a Ferrari 296, plus $7,080 a
              year for insurance, storage, maintenance, and reserves, gets you
              up to 32 days behind the wheel and a real exit at year two. We
              model the residual at 90% of buy-in. We don&apos;t pretend the
              car appreciates — it depreciates, and the model accounts for it.
              What you walk away with isn&apos;t a return. It&apos;s the
              experience of having actually driven a Ferrari, on real roads,
              for the kind of money that doesn&apos;t require selling an
              equity position to pull off.
            </p>
            <p>
              Miami launches Q3 2026. If this fits how you actually want
              to use a supercar — own a piece, drive it ~32 days a year,
              never deal with the operational side — sign up and we&apos;ll
              be in touch.
            </p>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <Image
              src="/team/ryan.jpg"
              alt="Ryan Galli"
              width={56}
              height={56}
              className="rounded-full object-cover"
              style={{ filter: "grayscale(100%) contrast(1.05)" }}
            />
            <div>
              <p className="font-display text-base text-ink">Ryan Galli</p>
              <p className="text-xs uppercase tracking-wider text-mute">
                Co-founder & CEO, RYDA
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
            >
              Sign up →
            </Link>
            <Link
              href="/contact?type=Membership#form"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Schedule a 30-minute call
            </Link>
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
              body="Premium preparation and handover for every booking. Our standard does not vary."
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
            Three co-founders combining executive search, investment
            banking, and three decades of institutional equity markets.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
            <Founder
              name="Ryan Galli"
              role="Co-Founder · CEO / CTO"
              image="/team/ryan.jpg"
              tags={["Odin Partners NY", "Bucknell Psych"]}
              bio="Co-founder and CEO of RYDA. Currently runs Fixed Income Executive Search at Odin Partners NY, placing senior front-office talent at banks and macro hedge funds. Bucknell Psychology."
            />
            <Founder
              name="Dave Thompson"
              role="Co-Founder · CFO / COO"
              image="/team/dave.jpg"
              tags={["SolomonEdwards", "Series 79", "Bucknell '21"]}
              bio="Co-founder leading capital structuring and operational diligence. Manager, Private Equity Services at SolomonEdwards. Previously spent 3+ years in Investment Banking at Ziegler covering Healthcare M&A — analyst through senior associate. Diamond Capital Advisors before that. SIE + Series 79 certified. Bucknell Economics."
            />
            <Founder
              name="Stefano Galli"
              role="Co-Founder · CRO / CSO"
              image="/team/stefano.jpg"
              tags={["Evercore ISI", "Wharton MBA"]}
              bio="Co-founder and strategic advisor with 30+ years in institutional equity markets. Managing Director, Global Equity Sales at Evercore ISI (9+ years). Previously Director of Global Equities Research Sales at Bank of America Merrill Lynch in London, Senior Portfolio Manager at Artio Global Management ($75B AUM at peak), and 8 years in research sales at Merrill Lynch. Wharton MBA, Civil Engineering and Economics at Delaware."
            />
          </div>
        </div>
      </section>

      {/* HQ */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Headquarters</h2>
          <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-5 text-sm sm:grid-cols-2">
            <Fact label="Legal entity" value="RYDA LLC" />
            <Fact label="Structure" value="Member-managed LLC per vehicle" />
            <Fact label="Headquarters" value="Miami, FL — by appointment" />
            <Fact label="Operating markets" value="Miami (2026) · LA (2027) · NY (2027)" />
            <Fact label="General" value="hello@ryda.com" />
            <Fact label="Press" value="press@ryda.com" />
            <Fact label="Partnerships" value="partners@ryda.com" />
            <Fact label="Investors (RYDA Inc.)" value="See /investors" />
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Become a member.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Miami launches Q3 2026. Create your account to browse the
            fleet and claim a share when membership opens.
          </p>
          <Link
            href="/signup"
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
  image,
  tags,
  ghost,
}: {
  name: string;
  role: string;
  bio: string;
  image?: string;
  tags?: string[];
  ghost?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-rule p-8 ${
        ghost ? "bg-cream-2/40" : "bg-surface"
      }`}
    >
      <div className="relative aspect-square w-32 overflow-hidden rounded-full bg-ink/10">
        {image && (
          <Image
            src={image}
            alt={name}
            fill
            sizes="128px"
            className="object-cover"
            style={{ filter: "grayscale(100%) contrast(1.05)" }}
          />
        )}
      </div>
      <p className="mt-6 font-display text-xl text-ink">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{role}</p>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-rule bg-cream-2/40 px-2.5 py-1 text-[10px] text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>
      )}
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
