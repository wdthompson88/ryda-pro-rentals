import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HiddenWhenAuthed } from "@/components/auth-aware";

export const metadata = {
  title: "Events — RYDA",
  description:
    "RYDA member events. F1 Miami GP weekend, founders' dinners, Cars & Cuban Coffee, track days and more.",
};

const EVENTS = [
  {
    when: "May 2 – May 4, 2026",
    title: "F1 Miami Grand Prix Weekend",
    where: "Miami International Autodrome",
    detail:
      "Founders' track day Friday at Homestead, paddock + suite access Saturday, gala Saturday night, race day Sunday with private box. Black members + first 100 only.",
    tag: "Flagship",
  },
  {
    when: "Aug 15, 2026",
    title: "Soft Launch Dinner",
    where: "Miami · Address shared with attendees",
    detail:
      "The first 100 RYDA members meet the founders. Vehicle reveal of the inaugural Miami fleet. Six-course tasting menu. Open bar. Black tie.",
    tag: "Founders",
  },
  {
    when: "Aug 16-19, 2026",
    title: "Pebble Beach + Monterey Car Week",
    where: "Pebble Beach, CA",
    detail:
      "Hotel block, RYDA paddock at the concours, drives along 17-mile drive, an exclusive Quail Lodge breakfast for members.",
    tag: "Travel",
  },
  {
    when: "Sep 19, 2026",
    title: "Cars & Cuban Coffee",
    where: "RYDA Miami Facility",
    detail:
      "Quarterly morning meet. 7am espresso, pastelitos, the cars warmed up for sunrise drives down US-1. Open to all members.",
    tag: "Quarterly",
  },
  {
    when: "Dec 6, 2026",
    title: "Art Basel Preview Night",
    where: "Miami Beach",
    detail:
      "RYDA + a Miami gallery host members for a preview before public openings. Champagne, gallery walk, transportation by RYDA.",
    tag: "Black tier",
  },
  {
    when: "Q1 2027",
    title: "Florida Keys Road Trip",
    where: "Miami → Key West",
    detail:
      "3-day curated drive. Hotels, photographer, support vehicle, route planning, breakfast/lunch/dinner reservations all coordinated. 12 cars, 24 members maximum.",
    tag: "Travel",
  },
];

export default function EventsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Events
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            The community is{" "}
            <span className="italic">half the point.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-ink-soft">
            RYDA programming brings members together around the cars and
            the cities. Most events are open to all members. Some are
            Black-tier only. Early members get the first invitations.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10">
          <div className="flex flex-wrap gap-2">
            {["All", "Flagship", "Founders", "Travel", "Quarterly", "Black tier"].map(
              (c, i) => (
                <button
                  key={c}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    i === 0
                      ? "bg-ink text-cream"
                      : "bg-surface text-ink-soft hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Events list */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <div className="space-y-4">
            {EVENTS.map((e) => (
              <article
                key={e.title}
                className="rounded-2xl border border-rule bg-surface p-6 sm:p-8"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-8">
                  <div className="sm:col-span-3">
                    <p className="font-display text-sm uppercase tracking-wider text-red">
                      {e.when}
                    </p>
                    <span className="mt-3 inline-block rounded-full bg-cream-2 px-3 py-1 text-xs font-medium text-ink-soft">
                      {e.tag}
                    </span>
                  </div>
                  <div className="sm:col-span-9">
                    <h2 className="font-display text-2xl text-ink">{e.title}</h2>
                    <p className="mt-1 text-xs uppercase tracking-wider text-mute">
                      {e.where}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                      {e.detail}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-4 text-xs">
                      <Link
                        href="/membership"
                        className="font-medium text-red hover:text-red-deep"
                      >
                        Members RSVP →
                      </Link>
                      <Link
                        href="/contact"
                        className="text-ink-soft hover:text-ink"
                      >
                        Question about this event?
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Get on the calendar.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Early members get every event invitation 2 weeks before public.
            Blue members get monthly meetups; Black members get flagship events
            and priority on travel programming.
          </p>
          <HiddenWhenAuthed>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              Apply for membership →
            </Link>
          </HiddenWhenAuthed>
        </div>
      </section>
    </>
  );
}
