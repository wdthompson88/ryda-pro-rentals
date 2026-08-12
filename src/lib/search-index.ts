// Site-wide search index. Compiles all searchable surfaces (rental
// listings, journal posts, FAQ topics, key marketing pages) into a
// single flat list so the /search page can rank+filter cheaply
// without a backend.
//
// All sources pull from existing typed data: adding a car to
// PARTNER_VEHICLES, or a new published journal post, surfaces in search
// automatically.

import { PARTNER_VEHICLES } from "@/lib/partner-fleet";
import { POSTS as JOURNAL } from "@/lib/journal-content";

export type SearchEntry = {
  /** URL the result links to. */
  href: string;
  /** Headline shown to the user. */
  title: string;
  /** Short subtitle / detail line. */
  subtitle: string;
  /** Vertical bucket, drives the badge color. */
  vertical: "cars" | "boats" | "planes" | "general";
  /** Result type, drives the small label next to the title. */
  type:
    | "vehicle"
    | "boat"
    | "journal"
    | "page"
    | "doc"
    | "faq";
  /** Additional searchable text, concatenated and lowercased for matching. */
  haystack: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Static page entries (high-traffic surfaces buyers may search for by name)
// ─────────────────────────────────────────────────────────────────────────

const STATIC_PAGES: SearchEntry[] = [
  // Rentals
  {
    href: "/rent",
    title: "Rent",
    subtitle: "Cars · By the day · Miami fleet + partners",
    vertical: "cars",
    type: "page",
    haystack: "rent rental daily hire exotic supercar luxury miami partners fleet",
  },
  {
    href: "/how-it-works",
    title: "How it works",
    subtitle: "Cars · Browse, request your dates, the operator confirms",
    vertical: "cars",
    type: "page",
    haystack: "how it works request dates operator confirms referral commission",
  },
  {
    href: "/faq",
    title: "FAQ",
    subtitle: "Cars · Common questions",
    vertical: "cars",
    type: "faq",
    haystack: "faq questions answers cars rental",
  },
  {
    href: "/about",
    title: "About RYDA",
    subtitle: "Founders, mission, story",
    vertical: "general",
    type: "page",
    haystack: "about founders ryan dave stefano team mission story",
  },
  {
    href: "/journal",
    title: "Journal",
    subtitle: "Long-form notes from the team",
    vertical: "general",
    type: "page",
    haystack: "journal blog posts notes long-form",
  },
  {
    href: "/contact",
    title: "Contact",
    subtitle: "Get in touch",
    vertical: "general",
    type: "page",
    haystack: "contact email phone schedule call",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Vehicle entries (rental detail pages only)
// ─────────────────────────────────────────────────────────────────────────

// One entry per operator listing — the only rental inventory there is.
// This index is shipped to the browser, so the operator's name is
// deliberately NOT in the title, subtitle, or haystack: operators are
// never named on a customer-facing surface.
const VEHICLE_ENTRIES: SearchEntry[] = PARTNER_VEHICLES.map((v) => {
  const name = `${v.make} ${v.model}`;
  const haystack = [v.make, v.model, v.year, v.market, v.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    href: `/rent/${v.slug}`,
    title: `${name}, rental`,
    subtitle: `Cars · ${v.year ? `${v.year} · ` : ""}From $${v.dailyRate.toLocaleString()}/day`,
    vertical: "cars" as const,
    type: "vehicle" as const,
    haystack: `${haystack} rent rental daily`,
  };
});

// ─────────────────────────────────────────────────────────────────────────
// Journal entries (published posts only)
// ─────────────────────────────────────────────────────────────────────────

const JOURNAL_ENTRIES: SearchEntry[] = JOURNAL.filter(
  (p) => p.status === "published",
).map((p) => {
  // Determine vertical from tag, journal posts use a "Boats" suffix
  // when they're boat-themed.
  const isBoats = /boats|yacht|marine|charter|captain/i.test(
    `${p.tag} ${p.title} ${p.excerpt}`,
  );
  return {
    href: `/journal/${p.slug}`,
    title: p.title,
    subtitle: `Journal · ${p.tag} · ${p.date}`,
    vertical: isBoats ? "boats" : "cars",
    type: "journal",
    haystack: [
      p.title,
      p.excerpt,
      p.tag,
      p.author,
      p.body?.slice(0, 6).join(" ") ?? "",
    ]
      .join(" ")
      .toLowerCase(),
  };
});

// ─────────────────────────────────────────────────────────────────────────
// Final flat index
// ─────────────────────────────────────────────────────────────────────────

export const SEARCH_INDEX: SearchEntry[] = [
  ...STATIC_PAGES,
  ...VEHICLE_ENTRIES,
  ...JOURNAL_ENTRIES,
];

// ─────────────────────────────────────────────────────────────────────────
// Search ranking
// ─────────────────────────────────────────────────────────────────────────

export type SearchResult = SearchEntry & { score: number };

/**
 * Score an entry against a query. Higher = better match.
 * Simple weighted scoring:
 *   - Exact title match (case-insensitive): 100
 *   - Title contains all query tokens: 50 + bonus per token
 *   - Subtitle contains tokens: 10 per token hit
 *   - Haystack contains tokens: 1 per token hit
 *   - Vehicle/boat type bonus when query looks like a model name
 */
function scoreEntry(entry: SearchEntry, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return 0;

  const title = entry.title.toLowerCase();
  const subtitle = entry.subtitle.toLowerCase();
  const haystack = entry.haystack;

  let score = 0;

  // Exact full-query match in title
  if (title === q) score += 200;
  else if (title.includes(q)) score += 100;

  // Token coverage in title
  let titleHits = 0;
  for (const t of tokens) {
    if (title.includes(t)) {
      titleHits++;
      score += 30;
    }
  }
  if (titleHits === tokens.length) score += 40; // all tokens in title bonus

  // Subtitle hits
  for (const t of tokens) {
    if (subtitle.includes(t)) score += 8;
  }

  // Haystack hits
  for (const t of tokens) {
    if (haystack.includes(t)) score += 2;
  }

  return score;
}

export function searchSite(query: string, limit = 30): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  return SEARCH_INDEX.map((entry) => ({
    ...entry,
    score: scoreEntry(entry, q),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
