import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";

export const metadata = { title: "Messages" };

// /messages — placeholder until the real co-owner messaging
// service ships. Pre-launch, this page rendered fake conversations
// with hardcoded member names + Pebble Beach trip planning, which
// looked like a working feature a member could rely on. It wasn't.
//
// Now we render an honest "coming soon" state with a clear handoff
// to /contact so members who think they need messaging right now
// reach the team.

export default function MessagesPage() {
  return (
    <>
      <SiteHeader />
      <DemoBanner />

      <section className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Messages
        </p>
        <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
          Co-owner messaging.
        </h1>
        <p className="mt-4 text-base text-ink-soft">
          Group threads with the other members of each LLC, a direct line to
          your Proposal Coordinator, and a support channel for RYDA ops will
          land here when the messaging service ships at the Miami launch.
        </p>

        <div className="mt-10 rounded-2xl border border-dashed border-rule bg-cream-2/40 p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
            Ships at launch
          </p>
          <p className="mt-3 text-base text-ink">
            What you'll see:
          </p>
          <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm text-ink-soft">
            <li>· One thread per LLC you co-own</li>
            <li>· Direct DMs with your Proposal Coordinator</li>
            <li>· RYDA support channel for ops escalations</li>
            <li>· Shared trip-planning thread for road trips</li>
          </ul>
        </div>

        <div className="mt-10">
          <p className="text-sm text-ink-soft">
            Need to reach the team in the meantime?
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red"
          >
            Open a support thread →
          </Link>
        </div>
      </section>
    </>
  );
}
