"use client";

// Site-search results component. Reads the query from the URL,
// searches the static index built at module-load time, and renders
// grouped results (Cars / Boats / Journal / Other). Live re-search
// as the user types into the input.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { searchSite, type SearchResult } from "@/lib/search-index";

const VERTICAL_LABEL: Record<string, string> = {
  cars: "Cars",
  boats: "Boats",
  planes: "Planes",
  general: "General",
};

const TYPE_LABEL: Record<string, string> = {
  vehicle: "Vehicle",
  boat: "Yacht",
  journal: "Journal",
  vs: "Comparison",
  page: "Page",
  doc: "Documents",
  faq: "FAQ",
};

const VERTICAL_TONE: Record<string, string> = {
  cars: "text-red",
  boats: "text-marine",
  planes: "text-cream/80",
  general: "text-ink-soft",
};

export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  // Mirror URL → state on back/forward navigation
  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const results: SearchResult[] = useMemo(() => searchSite(query), [query]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    // Update the URL without a full nav so back/forward works.
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  // Group results by vertical for display
  const byVertical: Record<string, SearchResult[]> = {};
  for (const r of results) {
    (byVertical[r.vertical] ||= []).push(r);
  }
  const verticalOrder = ["cars", "boats", "planes", "general"];

  return (
    <section>
      {/* Search input */}
      <div className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Search
          </p>
          <form onSubmit={onSubmit} className="mt-4">
            <label htmlFor="site-search" className="sr-only">
              Search RYDA
            </label>
            <div className="flex h-14 items-center rounded-full border border-rule bg-surface px-5 transition-colors focus-within:border-ink">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="mr-3 shrink-0 text-mute"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M14 14l4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                id="site-search"
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try Wajer, Ferrari, charter, LLC, journal…"
                className="h-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-mute focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="ml-2 shrink-0 rounded-full px-3 text-sm text-mute hover:text-ink"
                >
                  ×
                </button>
              ) : null}
            </div>
          </form>

          <p className="mt-5 text-xs text-mute">
            {query.trim() ? (
              <>
                <span className="font-display text-base text-ink tabular-nums">
                  {results.length}
                </span>{" "}
                result{results.length === 1 ? "" : "s"} for{" "}
                <span className="font-medium text-ink">
                  &quot;{query.trim()}&quot;
                </span>
              </>
            ) : (
              "Type to search across vehicles, boats, journal posts, comparison pages, and FAQ."
            )}
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        {!query.trim() ? (
          <EmptyHint />
        ) : results.length === 0 ? (
          <NoResults query={query} />
        ) : (
          <div className="space-y-12">
            {verticalOrder
              .filter((v) => byVertical[v]?.length)
              .map((v) => (
                <VerticalSection
                  key={v}
                  label={VERTICAL_LABEL[v] ?? v}
                  results={byVertical[v]}
                  tone={VERTICAL_TONE[v] ?? "text-ink-soft"}
                />
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

function VerticalSection({
  label,
  results,
  tone,
}: {
  label: string;
  results: SearchResult[];
  tone: string;
}) {
  return (
    <div>
      <p className={`text-xs font-medium uppercase tracking-[0.2em] ${tone}`}>
        {label}
      </p>
      <ul className="mt-5 space-y-3">
        {results.map((r) => (
          <li key={`${r.href}-${r.title}`}>
            <Link
              href={r.href}
              className="group block rounded-2xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-mute">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </p>
                  <p className="mt-1 font-display text-lg text-ink group-hover:text-red">
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{r.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-red opacity-0 group-hover:opacity-100">
                  Open →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/40 p-8">
      <p className="font-display text-xl text-ink">
        Common searches
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
        <li>
          <Link href="/search?q=ferrari" className="hover:text-red">
            Ferrari →
          </Link>
        </li>
        <li>
          <Link href="/search?q=wajer" className="hover:text-marine">
            Wajer →
          </Link>
        </li>
        <li>
          <Link href="/search?q=charter" className="hover:text-marine">
            Charter →
          </Link>
        </li>
        <li>
          <Link href="/search?q=delaware llc" className="hover:text-red">
            LLC →
          </Link>
        </li>
        <li>
          <Link href="/search?q=insurance" className="hover:text-red">
            Insurance →
          </Link>
        </li>
        <li>
          <Link href="/search?q=miami" className="hover:text-red">
            Miami →
          </Link>
        </li>
      </ul>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-10 text-center">
      <p className="font-display text-2xl text-ink">No matches found.</p>
      <p className="mt-3 text-sm text-ink-soft">
        Nothing in the index matches{" "}
        <span className="font-medium text-ink">&quot;{query.trim()}&quot;</span>.
        Try a vehicle name, a brand, a topic like &quot;hurricane&quot; or
        &quot;charter,&quot; or check the{" "}
        <Link href="/help" className="text-red hover:text-red-deep">
          help center
        </Link>
        .
      </p>
    </div>
  );
}
