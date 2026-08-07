"use client";

// Hero search — Mainstable pattern adapted for the rental-first landing
// page. A single compact pill under the hero CTA row: type a make, model,
// or type and submit to land on /rent with the query pre-applied.
// Client component so the landing page itself stays server-rendered;
// /rent reads ?q= and seeds RentalListings' existing query state.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/rent?q=${encodeURIComponent(q)}` : "/rent");
  }

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="flex h-11 w-full items-center rounded-full border border-rule bg-surface pl-4 pr-1.5 transition-colors focus-within:border-ink"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="mr-2.5 shrink-0 text-mute"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M9.5 9.5L13 13"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the fleet — make, model, type…"
        aria-label="Search the fleet"
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none"
      />
      <button
        type="submit"
        className="h-8 shrink-0 rounded-full bg-red px-4 text-xs font-medium text-cream transition-colors hover:bg-red-deep"
      >
        Search
      </button>
    </form>
  );
}
