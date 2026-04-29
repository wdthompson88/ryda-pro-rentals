import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "FAQ — RYDA",
  description:
    "Answers to the most common questions about RYDA membership, co-ownership, rentals, and operations.",
};

type Q = { q: string; a: string };

const SECTIONS: { title: string; questions: Q[] }[] = [
  {
    title: "Co-ownership",
    questions: [
      {
        q: "What am I actually buying?",
        a: "A membership interest in a single-purpose Delaware LLC that owns a specific vehicle. The LLC's only assets are the vehicle, its insurance/operating reserves, and a management contract with RYDA. You hold a registered legal interest, not a club point.",
      },
      {
        q: "How many co-ownership shares per vehicle?",
        a: "10 shares per vehicle by default. Each share entitles you to ~34 days and up to ~4,000 miles of usage per year, depending on the vehicle. A single member can hold one share or several.",
      },
      {
        q: "Are RYDA co-ownership stakes securities?",
        a: "No. RYDA is a luxury access platform, not an investment platform. Each car is held in a member-managed Delaware LLC where you and 5–10 other co-owners hold authority over material decisions; RYDA is hired as a service provider via a separate management agreement. Co-ownership stakes are not registered securities and are not offered for investment purposes. No accredited-investor verification required.",
      },
      {
        q: "Can I transfer my share whenever I want?",
        a: "After a 12-month minimum hold, yes — directly to another verified RYDA member. RYDA facilitates the LLC paperwork. There is no public marketplace and no order book. Settlement takes 1–3 business days. RYDA charges a 3% transfer fee on the agreed price.",
      },
      {
        q: "What if a co-owner stops paying?",
        a: "The LLC's Operating Agreement has remedies, including forced transfer of the delinquent share. RYDA also keeps a maintenance reserve at the LLC level so vehicle ops continue uninterrupted while it's resolved.",
      },
      {
        q: "What if a major mechanical issue comes up?",
        a: "RYDA only acquires Certified Pre-Owned vehicles, and every car gets a documented multi-point Pre-Purchase Inspection by a marque specialist before the LLC closes on it. Powertrain and major mechanical systems are covered by an active CPO warranty during the LLC's first ownership period. Out-of-warranty repairs come from the LLC's maintenance reserve — not from co-owners' pockets. Co-owners aren't on the hook for surprise engine, transmission, or driveline bills.",
      },
      {
        q: "What if the car gets totaled?",
        a: "The vehicle carries agreed-value physical damage insurance. If totaled, the insurance proceeds go to the LLC, are distributed pro-rata to co-owners, and the LLC is wound down. Most groups elect to roll proceeds into a replacement vehicle.",
      },
    ],
  },
  {
    title: "Membership",
    questions: [
      {
        q: "Who can join?",
        a: "Verified individuals 28 years or older with a valid US driver's license, a clean recent driving record, and the ability to pass identity verification (KYC). No accredited-investor status or financial qualification required — RYDA is a luxury access platform, not an investment platform.",
      },
      {
        q: "Does membership cost anything?",
        a: "Three tiers. Core is free. Blue is $500/year ($350 for founding members, locked for life). Black is $1,500/year ($1,000 for founding members, locked for life). Most active members start on Blue.",
      },
      {
        q: "Why 28+?",
        a: "Insurance carriers price exotic-car policies very aggressively for younger drivers. The 28+ minimum keeps fleet premiums manageable and matches the European norm we modeled on (Supercar Sharing AG).",
      },
      {
        q: "Can I join from anywhere in the US?",
        a: "Yes — but the actual vehicles only operate in our launch markets. Miami first (Q3 2026), then LA (2027), then NY (2027). Members anywhere in the US can join early to lock in founding pricing.",
      },
    ],
  },
  {
    title: "Operations",
    questions: [
      {
        q: "Where are the cars stored?",
        a: "In RYDA-vetted partner facilities — climate-controlled, 24/7 monitored, fully insured. Miami first, with LA and NY following.",
      },
      {
        q: "Who maintains them?",
        a: "RYDA. We handle service, registration, inspections, photography, and condition reports. Co-owners are not on call for any of it.",
      },
      {
        q: "How do I book my time?",
        a: "Through the RYDA app, on a shared calendar with the other co-owners. Fair-use rules cap consecutive days during high season (May–September) at 7 per share, with 14 days allowed in low season.",
      },
      {
        q: "Can I drive on a track?",
        a: "Yes, on track-eligible vehicles, with our track-day rider. RYDA arranges the insurance, helmet drop, and post-track inspection. Some hypercars are not eligible by manufacturer warranty.",
      },
    ],
  },
  {
    title: "Rentals (try-before-you-buy)",
    questions: [
      {
        q: "Can I rent a RYDA car if I'm not a co-owner?",
        a: "Yes — members and prospective buyers can rent any available vehicle by the day. Rentals are priced for the high end ($1,800–$8,500/day depending on the car) and are intended as a try-before-you-buy for co-ownership.",
      },
      {
        q: "What's included in a rental?",
        a: "Full insurance, 200 miles per day, 24/7 roadside, and white-glove delivery if you choose it. Track-eligible vehicles can be booked with a track-day rider for unlimited miles on track.",
      },
      {
        q: "Why rentals at all? Aren't you focused on ownership?",
        a: "Yes — co-ownership is the core product. Rentals exist for two reasons: (1) prospective members get a real test-drive before committing six figures to a share, and (2) it supports vehicle utilization for co-owners who don't fully use their entitlement. We don't compete on price with generic rental marketplaces.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">FAQ</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Everything we get asked, answered honestly.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-ink-soft">
            Questions we haven't covered?{" "}
            <Link href="/contact#form" className="text-red hover:text-red-deep">
              Send us a question
            </Link>{" "}
            — we add new ones here when they come up.
          </p>
        </div>
      </section>

      {/* Sections */}
      {SECTIONS.map((s, i) => (
        <section
          key={s.title}
          className={`border-b border-rule ${i % 2 === 1 ? "bg-cream-2" : ""}`}
        >
          <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">{s.title}</h2>
            <div className="mt-10 space-y-4">
              {s.questions.map((qa) => (
                <details
                  key={qa.q}
                  className="group rounded-xl border border-rule bg-surface p-5"
                >
                  <summary className="cursor-pointer list-none font-display text-lg text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      <span>{qa.q}</span>
                      <span className="text-2xl text-red transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-ink-soft">{qa.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Still have a question?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Talk to a real human. 30-minute call, no commitment.
          </p>
          <Link
            href="/contact#consultation"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Book a consultation
          </Link>
        </div>
      </section>
    </>
  );
}
