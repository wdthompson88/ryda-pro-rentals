import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ContactForm } from "@/components/contact-form";

export function ComingSoonLocation({
  city,
  state,
  launchQuarter,
  intro,
  whyHere,
  vehiclePreview,
}: {
  city: string;
  state: string;
  launchQuarter: string;
  intro: string;
  whyHere: string[];
  vehiclePreview: string[];
}) {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            {city}, {state} · {launchQuarter}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {city} is{" "}
            <span className="italic text-red">next on the map.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {intro}
          </p>
        </div>
      </section>

      {/* Why here */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Why {city}</h2>
          <ul className="mt-8 space-y-4 text-base text-ink-soft">
            {whyHere.map((line, i) => (
              <li key={i} className="flex items-start gap-3 leading-relaxed">
                <span className="mt-1 text-red">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Inaugural vehicle preview */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Inaugural fleet preview</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Vehicles we expect to anchor the {city} fleet at launch. Final
            lineup confirmed with the local founding cohort.
          </p>
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehiclePreview.map((v) => (
              <li
                key={v}
                className="rounded-2xl border border-rule bg-surface p-5"
              >
                <p className="font-display text-lg text-ink">{v}</p>
                <p className="mt-1 text-xs text-mute">Indicative · final lineup TBD</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Waitlist */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl text-ink sm:text-4xl">
                {city} priority list
              </h2>
              <p className="mt-4 max-w-md text-base text-ink-soft">
                Tell us you want {city}. When we open the founding cohort
                here, we contact this list first. Founding-member pricing
                will be locked for life.
              </p>
            </div>
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Currently */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Right now
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            We're live in Miami first.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            All RYDA operations launch in Miami in Q3 2026. {city} expansion
            follows on the schedule above. Members from {city} are welcome
            to join now and lock in founding-member pricing — and to fly
            in for Miami events.
          </p>
          <Link
            href="/locations/miami"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            See Miami →
          </Link>
        </div>
      </section>
    </>
  );
}
