import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Press — RYDA",
  description:
    "RYDA press kit, brand assets, fact sheet, and media contacts.",
};

export default function PressPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Press</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Brand assets, fact sheet, and a real human to talk to.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-ink-soft">
            For all media inquiries, email{" "}
            <a href="mailto:press@ryda.com" className="text-red hover:text-red-deep">
              press@ryda.com
            </a>
            . We respond within one business day.
          </p>
        </div>
      </section>

      {/* Fact sheet */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Fact sheet</h2>
          <dl className="mt-10 space-y-5 text-sm">
            <Fact label="Founded" value="2026" />
            <Fact label="Headquarters" value="Miami, FL" />
            <Fact label="Legal entity" value="RYDA LLC (Delaware)" />
            <Fact label="Stage" value="Seed (raising)" />
            <Fact label="Markets" value="Miami (2026), Los Angeles (2027), New York (2027)" />
            <Fact label="Product" value="Daily supercar rentals + member-only fractional co-ownership" />
            <Fact
              label="Model"
              value="Each vehicle is owned by a single-purpose Delaware LLC. 3–8 verified members hold shares."
            />
            <Fact
              label="Effective customer cost"
              value="~$236/day on a co-owned Ferrari vs. $2,500+/day to rent the equivalent"
            />
            <Fact label="Press" value="press@ryda.com" />
            <Fact label="Investors" value="investors@ryda.com" />
          </dl>
        </div>
      </section>

      {/* Brand assets */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Brand assets</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Logos, vehicle photography, and approved marketing imagery.
            Available on request — email{" "}
            <a href="mailto:press@ryda.com" className="text-red hover:text-red-deep">
              press@ryda.com
            </a>{" "}
            with the publication and intended use.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Asset label="Logo · light backgrounds" />
            <Asset label="Logo · dark backgrounds" />
            <Asset label="Logo · monochrome" />
            <Asset label="Wordmark · vector" />
            <Asset label="Founder portraits" />
            <Asset label="Vehicle photography" />
            <Asset label="Brand color guide" />
            <Asset label="Typography spec" />
          </div>
        </div>
      </section>

      {/* Press inquiries form */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Need a quote, an interview, or a comment?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We work with national and trade press. Founders are available for
            interviews on the supercar co-ownership market, the fractional-
            ownership playbook applied to autos, and the legal structure of
            fractional vehicle ownership in the US.
          </p>
          <a
            href="mailto:press@ryda.com?subject=Press%20inquiry"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Email press team
          </a>
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-b border-rule pb-3 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="text-sm text-ink sm:max-w-md sm:text-right">{value}</dd>
    </div>
  );
}

function Asset({ label }: { label: string }) {
  return (
    <div className="aspect-square rounded-xl border border-dashed border-rule bg-cream-2/40 p-4 text-center">
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-2xl text-mute">⌘</p>
        <p className="mt-3 text-xs text-ink-soft">{label}</p>
        <p className="mt-2 text-[10px] text-mute">On request</p>
      </div>
    </div>
  );
}
