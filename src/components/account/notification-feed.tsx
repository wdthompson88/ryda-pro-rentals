"use client";

// The in-app notification feed (migration 0049), rendered inside
// /account/notifications.
//
// UNREAD IS NOT A COLOUR. An unread row is marked four ways that do not
// depend on hue: a filled dot in the gutter, a bolder title, a white
// card against the read rows' flat cream, and the literal word "New" in
// the row's accessible name. Colour-only status is the single most
// common a11y failure in a feed, and the one a designer is most likely
// to reintroduce — if you restyle this, keep at least two of the four.
//
// ROW ANATOMY, and why the mark-read control is a SIBLING of the link
// rather than inside it: a <button> nested in an <a> is invalid HTML and
// gives keyboard users an activation target that does two things at
// once. So the row is a container, the link covers title + body (click
// marks read AND navigates, which is what a feed row should do), and
// "Mark read" sits beside it for the case where someone wants to clear a
// row without going anywhere.
//
// Design system only — tokens, no raw hex, light-only. Cars are the red
// accent (this is a rental surface; never marine here).

import Link from "next/link";
import { useNotificationFeed, type NotificationView } from "@/lib/use-notifications";

export function NotificationFeed({ enabled }: { enabled: boolean }) {
  const feed = useNotificationFeed(enabled);

  if (!enabled || feed.status === "loading") {
    return <p className="text-sm text-mute">Loading your notifications…</p>;
  }

  if (feed.status === "error") {
    return (
      <div className="rounded-2xl border border-rule bg-surface p-5">
        <p className="text-sm text-ink-soft">
          {feed.error ?? "Could not load notifications."}
        </p>
        <button
          type="button"
          onClick={feed.refresh}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          Try again
        </button>
      </div>
    );
  }

  // The pre-migration window. 0049 is written but "applying a migration
  // needs explicit operator approval" (build loop §3.3), so there is a
  // real deploy in which this page exists and the table does not. Saying
  // so plainly beats an empty state that implies nothing has happened.
  //
  // AND IT PROMISES NO FALLBACK. This copy used to say "Booking updates
  // still reach you by email in the meantime". They do not: RYDA's only
  // email path is notifyTeam() (src/lib/notify.ts), which mails the TEAM,
  // plus a one-off "request received" acknowledgement on the rental
  // INQUIRY funnel. Nothing emails a renter when a booking is approved,
  // declined, countered, expired or cancelled. Telling someone to watch
  // an inbox that will never ring is worse than telling them nothing.
  if (!feed.configured) {
    return (
      <div className="rounded-2xl border border-rule bg-cream-2 px-8 py-10">
        <p className="font-display text-2xl text-ink">Not switched on yet.</p>
        <p className="mt-3 max-w-md text-sm text-ink-soft">
          In-app notifications are built but haven&apos;t been enabled on this
          environment yet. Your requests and bookings work as normal — there is
          just nowhere to show their updates until this is switched on.
        </p>
      </div>
    );
  }

  if (feed.notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-rule bg-cream-2 px-8 py-10">
        <p className="font-display text-2xl text-ink">Nothing yet.</p>
        <p className="mt-3 max-w-md text-sm text-ink-soft">
          When an operator answers a request — or a booking moves — it lands
          here. We&apos;ll keep it to what actually matters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Live region. The count is announced on change rather than
          shouted on load: aria-live="polite" waits for the user to
          finish whatever they are doing. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft" role="status" aria-live="polite">
          {feed.unreadCount === 0
            ? "You're all caught up."
            : `${feed.unreadCount} unread ${
                feed.unreadCount === 1 ? "notification" : "notifications"
              }.`}
        </p>

        {feed.unreadCount > 0 && (
          <button
            type="button"
            onClick={feed.markAllRead}
            disabled={feed.busy}
            className="inline-flex h-10 items-center justify-center rounded-full border border-rule bg-surface px-5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark all read
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {feed.notifications.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onMarkRead={() => feed.markRead([n.id])}
            busy={feed.busy}
          />
        ))}
      </ul>

      {feed.hasMore && (
        <div className="pt-2">
          <button
            type="button"
            onClick={feed.loadMore}
            disabled={feed.loadingMore}
            className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {feed.loadingMore ? "Loading…" : "Show older"}
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  busy,
}: {
  notification: NotificationView;
  onMarkRead: () => void;
  busy: boolean;
}) {
  const unread = notification.readAt === null;

  // The whole row's accessible name, so a screen reader hears "New" and
  // the timestamp without them being visual-only decoration.
  const label = [
    unread ? "New." : null,
    notification.title,
    notification.body ?? null,
    relativeTime(notification.createdAt),
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <span className="flex items-start gap-3">
      {/* Shape, not colour: filled for unread, hollow ring for read. */}
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          unread ? "bg-red" : "border border-rule bg-transparent"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm ${
            unread ? "font-semibold text-ink" : "font-normal text-ink-soft"
          }`}
        >
          {notification.title}
        </span>
        {notification.body && (
          <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
            {notification.body}
          </span>
        )}
        <span className="mt-2 flex items-center gap-2 text-xs text-mute">
          <span>{relativeTime(notification.createdAt)}</span>
          {unread && (
            <span className="rounded-full bg-red/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-red-deep">
              New
            </span>
          )}
        </span>
      </span>
    </span>
  );

  const surface = unread ? "border-rule bg-surface" : "border-rule bg-cream-2";

  return (
    <li>
      <div
        className={`flex items-start gap-3 rounded-2xl border p-5 transition-colors ${surface}`}
      >
        {notification.link ? (
          // Clicking navigates AND marks read. The mark is fired without
          // awaiting so the navigation is not held up by it; the hook's
          // optimistic update means the row is already styled read if
          // the user comes back.
          <Link
            href={notification.link}
            onClick={() => {
              if (unread) onMarkRead();
            }}
            aria-label={label}
            className="min-w-0 flex-1 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
          >
            {inner}
          </Link>
        ) : (
          // No destination: the row is still the mark-read control, so a
          // keyboard user has exactly one target either way.
          <button
            type="button"
            onClick={onMarkRead}
            disabled={!unread || busy}
            aria-label={label}
            className="min-w-0 flex-1 rounded-xl text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink disabled:cursor-default"
          >
            {inner}
          </button>
        )}

        {/* Sibling, never nested — see the header note on <button> in <a>. */}
        {unread && notification.link && (
          <button
            type="button"
            onClick={onMarkRead}
            disabled={busy}
            className="shrink-0 rounded-full border border-rule px-3 py-1.5 text-[11px] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark read
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * "2h ago" / "Mar 14". Local time is correct here — unlike the booking
 * DATES, which are UTC calendar days (rental-availability.ts), a
 * created_at is an instant and the member's own clock is the right frame
 * for "when did RYDA tell me this".
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(then).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
