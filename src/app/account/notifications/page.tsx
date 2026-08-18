"use client";

// /account/notifications — the in-app notification feed (build loop 0C,
// migration 0049).
//
// THIS ROUTE CHANGED HANDS. It used to render the notification
// PREFERENCES form (which channels may reach you). That form still
// exists, at ./preferences, linked from the header below. The feed takes
// the top-level route because it is what a member opens a notifications
// section to look at — "what did RYDA tell me" is the question; "how may
// RYDA tell me" is a setting. The nav's isActive() is a prefix match, so
// the section stays highlighted on both.
//
// The /account layout already gates auth and bounces anon visitors to
// /signin — but useAuthStatus starts at 'loading' and the redirect is a
// client effect, so there is a real frame in which this page renders
// without a session. It gets its own signed-out state rather than firing
// a guaranteed 401 at the API (the same reason /account/requests reads
// authStatus before fetching).

import Link from "next/link";
import { useAuthStatus } from "@/lib/use-auth-status";
import { NotificationFeed } from "@/components/account/notification-feed";

export default function NotificationsPage() {
  const { status: authStatus } = useAuthStatus();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Notifications
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          What&apos;s happened since you were here.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Requests, answers, and anything that moves a booking. Newest first —
          open one to go straight to it.
        </p>
        <Link
          href="/account/notifications/preferences"
          className="mt-4 inline-flex text-sm font-medium text-red transition-colors hover:text-red-deep"
        >
          Choose what reaches you →
        </Link>
      </header>

      {authStatus === "anon" ? (
        <div className="rounded-2xl border border-rule bg-cream-2 px-8 py-10">
          <p className="font-display text-2xl text-ink">Sign in to see these.</p>
          <p className="mt-3 max-w-md text-sm text-ink-soft">
            Your notifications are private to your account.
          </p>
          <Link
            href="/signin?next=%2Faccount%2Fnotifications"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <NotificationFeed enabled={authStatus === "authed"} />
      )}
    </div>
  );
}
