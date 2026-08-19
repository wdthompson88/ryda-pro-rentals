import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SearchResults } from "@/components/search-results";

// The description has to match SEARCH_INDEX, which is the whole of what
// /search can return: the Miami rental listings plus five site pages.
// It advertised "boats" and "comparison pages" — there is no boats
// vertical to search (search-results.tsx says so itself) and no
// comparison page in the index or the route tree.
export const metadata: Metadata = {
  title: "Search",
  description:
    "Search RYDA's Miami rental listings and the main site pages — how it works, FAQ, about and contact.",
};

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <Suspense
        fallback={
          <section className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
              Loading…
            </p>
          </section>
        }
      >
        <SearchResults />
      </Suspense>
    </>
  );
}
