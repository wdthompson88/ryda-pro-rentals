import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";

export const metadata = { title: "Messages — RYDA" };

const CONVERSATIONS = [
  {
    name: "Ferrari 296 GTB · Group",
    type: "Group · 6 members",
    last: "Co-owner A: Pebble Beach is locked for the August trip. Anyone want to caravan?",
    time: "12 min ago",
    unread: 2,
    active: true,
  },
  {
    name: "Proposal Coordinator · Ferrari 296",
    type: "Proposal Coordinator channel",
    last: "Booking request — Jun 5 to Jun 8 — track day rider",
    time: "1 hr ago",
    unread: 1,
  },
  {
    name: "McLaren 750S Spider · Group",
    type: "Group · 4 members",
    last: "Co-owner C: Inspection report from the Apr 8 trip is up.",
    time: "Yesterday",
  },
  {
    name: "RYDA Support",
    type: "Support",
    last: "We've confirmed your white-glove delivery for Apr 28.",
    time: "2 days ago",
  },
  {
    name: "Direct · Co-owner A",
    type: "Direct message",
    last: "I'll send the route across PCH for Saturday morning.",
    time: "3 days ago",
  },
];

const MESSAGES = [
  { from: "Co-owner A", time: "9:42 AM", text: "Booked Pebble Beach hotels for the August trip. 3 nights, valet parking, spot for the 296.", own: false },
  { from: "Co-owner A", time: "9:43 AM", text: "Pebble Beach is locked for the August trip. Anyone want to caravan?", own: false },
  { from: "You", time: "10:14 AM", text: "I'm in. Driving up Friday morning, leaving Sunday evening.", own: true },
  { from: "Co-owner B", time: "11:02 AM", text: "Going to fly down Saturday and meet you. Co-owner A, can you handle the Ferrari Saturday afternoon?", own: false },
  { from: "Co-owner A", time: "11:08 AM", text: "Of course. I'll do a soft top-down test before I hand off.", own: false },
  { from: "RYDA Service", time: "11:30 AM", text: "I can coordinate hotel parking arrangements + Sunday morning detail. Should I book?", own: false, system: true },
];

export default function MessagesPage() {
  return (
    <>
      <SiteHeader />
      <DemoBanner />

      <section className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Messages
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
          Inbox
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Conversation list */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-rule bg-surface">
              <div className="border-b border-rule p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Tag active>All</Tag>
                  <Tag>Groups</Tag>
                  <Tag>Direct</Tag>
                  <Tag>RYDA</Tag>
                </div>
              </div>
              <ul className="divide-y divide-rule">
                {CONVERSATIONS.map((c, i) => (
                  <li
                    key={i}
                    className={`cursor-pointer px-4 py-4 transition-colors hover:bg-cream-2/40 ${
                      c.active ? "bg-cream-2/40" : ""
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <span className="shrink-0 text-xs text-mute">{c.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-wider text-red">
                      {c.type}
                    </p>
                    <p className="mt-2 truncate text-sm text-ink-soft">{c.last}</p>
                    {c.unread && (
                      <span className="mt-2 inline-block rounded-full bg-red px-2 py-0.5 text-[10px] font-medium text-cream">
                        {c.unread} new
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Active thread */}
          <div className="lg:col-span-8">
            <div className="flex h-[640px] flex-col rounded-2xl border border-rule bg-surface">
              {/* Thread header */}
              <div className="border-b border-rule px-6 py-4">
                <p className="font-display text-lg text-ink">Ferrari 296 GTB · Group</p>
                <p className="mt-0.5 text-xs text-mute">6 members · You + 5 co-owners</p>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {MESSAGES.map((m, i) => (
                  <Message key={i} {...m} />
                ))}
              </div>

              {/* Composer */}
              <div className="border-t border-rule p-4">
                <div className="flex items-center gap-2 rounded-full border border-rule bg-cream px-4 py-2">
                  <input
                    type="text"
                    placeholder="Message the group…"
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none"
                  />
                  <span className="rounded-full bg-red/40 px-4 py-1.5 text-xs font-medium text-cream cursor-not-allowed">
                    Send
                  </span>
                </div>
                <p className="mt-2 text-center text-xs text-mute">
                  Messages here are auditable. Don't share trade secrets or NDA-covered info.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <section className="bg-ink py-12 text-center text-cream/60">
        <p className="text-xs">
          Sample messaging interface. Real-time chat ships with the Miami
          launch.{" "}
          <Link href="/account" className="text-red hover:text-red-deep">
            Back to account →
          </Link>
        </p>
      </section>
    </>
  );
}

function Tag({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Message({
  from,
  time,
  text,
  own,
  system,
}: {
  from: string;
  time: string;
  text: string;
  own?: boolean;
  system?: boolean;
}) {
  if (system) {
    return (
      <div className="rounded-xl border border-red/30 bg-red/5 p-4 text-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-red">
          {from} · {time}
        </p>
        <p className="mt-2 text-ink-soft">{text}</p>
      </div>
    );
  }
  return (
    <div className={own ? "flex justify-end" : "flex"}>
      <div className={own ? "max-w-[75%]" : "max-w-[75%]"}>
        <div className="flex items-baseline gap-2 text-xs text-mute">
          <span className="font-medium text-ink-soft">{own ? "You" : from}</span>
          <span>{time}</span>
        </div>
        <div
          className={`mt-1 rounded-2xl px-4 py-3 text-sm ${
            own ? "bg-red text-cream" : "bg-cream-2 text-ink"
          }`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
