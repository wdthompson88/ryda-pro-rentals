import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SearchResults } from "@/components/search-results";

export const metadata: Metadata = {
  title: "Search — RYDA",
  description:
    "Search across the RYDA site — vehicles, boats, journal posts, comparison pages, FAQ.",
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
