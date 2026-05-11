import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ThreadView } from "./thread-view";

// /messages/[llcId] — per-LLC thread.
//
// Server component is a thin shell: it sets metadata + renders the
// client-side <ThreadView> which fetches messages, polls every 30s,
// and handles the send box. We don't do server-side fetching here
// because:
//   1. Auth header is in the user's session, not in the request to
//      the page render — easier to fetch from the client where
//      authedFetch attaches the bearer.
//   2. The thread is interactive (poll + send), so a client
//      component is the natural home anyway.
//   3. Keeps the LLC-membership check in one place (the API route).

export const metadata = { title: "Thread" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ llcId: string }>;
}) {
  const { llcId } = await params;
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <Link
          href="/messages"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← All threads
        </Link>
        <ThreadView llcId={llcId} />
      </section>
    </>
  );
}
