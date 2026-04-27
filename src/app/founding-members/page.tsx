import { SiteHeader } from "@/components/site-header";
import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Founding Members — RYDA",
  description:
    "Apply to be one of the first 100 RYDA founding members. Miami launch Q3 2026.",
};

export default function FoundingMembersPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Founding members · Miami · Q3 2026
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            The first 100 set the tone for everything after.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-cream/70">
            We're hand-selecting the first 100 RYDA members to launch Miami.
            Founding members get permanent founding-member pricing on RYDA
            Black, first access to every new vehicle in the city, and a seat
            on the inaugural co-owner advisory board.
          </p>
        </div>
      </section>

      {/* Founding-member benefits */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">What founding members get</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Benefit
              title="Founding-member pricing"
              body="$1,000/yr Black tier for life (vs $1,500 for everyone after). Locks in for as long as your membership stays active."
            />
            <Benefit
              title="First-pick access"
              body="Every new Miami vehicle is offered to the founding 100 first, with a 7-day exclusive window before public listing."
            />
            <Benefit
              title="Advisory board"
              body="Quarterly advisory dinner with the founders. Your input shapes vehicle selection, booking rules, and event programming."
            />
            <Benefit
              title="Reduced acquisition fees"
              body="One-time RYDA acquisition fee waived on your first share (~$2,000 value)."
            />
            <Benefit
              title="Annual flagship event"
              body="Founders' weekend tied to F1 Miami GP. Track day, dinner, vehicle launches."
            />
            <Benefit
              title="Permanent badge"
              body="“Founding Member” on your profile and member directory listing. Status doesn't transfer."
            />
          </div>
        </div>
      </section>

      {/* What we're looking for */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What we're looking for.
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            We're not optimizing for the wealthiest applicants. We're looking
            for people who match the culture we want.
          </p>
          <ul className="mt-8 space-y-5 text-base text-ink-soft">
            <Trait
              t="Genuine enthusiasm"
              d="You actually love these cars. You'd drive them even if it didn't make financial sense."
            />
            <Trait
              t="Community-first"
              d="Co-ownership means sharing. People who treat shared property well, communicate clearly, and respect group rules."
            />
            <Trait
              t="Established life"
              d="28+, financially stable, clean driving record. RYDA's insurance demands this."
            />
            <Trait
              t="Long view"
              d="You see this as a 5-10 year membership, not a flip. Founding members hold their first share at least 24 months."
            />
            <Trait
              t="Quietly successful"
              d="No flexing on social media with the cars. RYDA is not a flex platform."
            />
          </ul>
        </div>
      </section>

      {/* Application form */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl text-ink sm:text-4xl">
                Apply.
              </h2>
              <p className="mt-4 max-w-md text-base text-ink-soft">
                We review every application personally. Expect a response
                within 5 business days. If we think you're a fit, we'll set
                up a 30-minute video call before extending an invitation.
              </p>
              <div className="mt-10 space-y-4 text-sm">
                <Stat label="First-cohort size" value="100 members" />
                <Stat label="Launch market" value="Miami, FL" />
                <Stat label="Launch quarter" value="Q3 2026" />
                <Stat label="Black tier (founders)" value="$1,000 / yr (locked)" />
              </div>
            </div>
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-8">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Trait({ t, d }: { t: string; d: string }) {
  return (
    <li className="border-l-2 border-red pl-5">
      <p className="font-medium text-ink">{t}</p>
      <p className="mt-1 text-ink-soft">{d}</p>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-rule pb-2">
      <span className="text-mute">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
