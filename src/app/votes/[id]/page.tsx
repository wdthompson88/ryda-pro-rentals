import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { VoteDetail } from "./vote-detail";

export const metadata = { title: "Vote" };

// /votes/[id] — server-component shell. The detail view is interactive
// (cast/change ballot, see live tally), so it lives in a client
// component that handles auth + fetch.

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <Link
          href="/votes"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← All votes
        </Link>
        <VoteDetail voteId={id} />
      </section>
    </>
  );
}
