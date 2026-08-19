"use client";

// /account/notifications — the in-app notification feed (build loop 0C,
// migration 0049).
//
// THIS ROUTE CHANGED HANDS, and the form it replaced is gone rather
// than relocated. It used to render notification PREFERENCES — toggles
// for an email digest cadence, SMS and push. None of those channels
// exist: notify.ts sends through Resend and nothing else, and there is
// no SMS provider, no push registration and no mobile app in this repo,
// so every toggle wrote a notif_* column no code reads. The feed is the
// half that is real, and it is deliberately not silenceable: this is
// where a renter finds out their booking was declined.
//
// The notif_* columns (migration 0014) are left alone, so a future
// digest job that genuinely honours them can pick them up and give the
// form an honest reason to come back.
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
