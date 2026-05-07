// Site-wide search index. Compiles all searchable surfaces (cars,
// boats, journal posts, vs/* pages, FAQ topics, key marketing pages)
// into a single flat list so the /search page can rank+filter cheaply
// without a backend.
//
// All sources pull from existing typed data, adding a new vehicle to
// VEHICLES, a new boat to BOATS, or a new published journal post
// surfaces in search automatically.

import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
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
  // Cars
  {
    href: "/portfolio",
    title: "RYDA Portfolio",
    subtitle: "Cars · The full fleet, organized by market",
    vertical: "cars",
    type: "page",
    haystack: "portfolio fleet cars supercars co-own ferrari lamborghini mclaren",
  },
  {
    href: "/rent",
    title: "Rent",
    subtitle: "Cars · By the day · Miami fleet + partners",
    vertical: "cars",
    type: "page",
    haystack: "rent rental daily charter try before you buy partners gm luxe",
  },
  {
    href: "/how-it-works",
    title: "How it works",
    subtitle: "Cars · The 5-step lifecycle + comparisons",
    vertical: "cars",
    type: "page",
    haystack: "how it works lifecycle 5 steps compare delaware llc",
  },
  {
    href: "/membership",
    title: "Membership tiers",
    subtitle: "Cars · Core / Blue / Black",
    vertical: "cars",
    type: "page",
    haystack: "membership tiers core blue black early",
  },
  {
    href: "/sample-documents",
    title: "Sample documents",
    subtitle: "Cars · Operating Agreement, MSA, PPI, and more",
    vertical: "cars",
    type: "doc",
    haystack: "sample documents operating agreement msa management services pre-purchase inspection ppi insurance",
  },
  {
    href: "/faq",
    title: "FAQ",
    subtitle: "Cars · Common questions",
    vertical: "cars",
    type: "faq",
    haystack: "faq questions answers cars co-ownership",
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
    href: "/inside",
    title: "Inside RYDA",
    subtitle: "Member app preview",
    vertical: "general",
    type: "page",
    haystack: "inside member app preview portal dashboard",
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

  // Boats
  {
    href: "/boats",
    title: "RYDA Boats",
    subtitle: "Boats · Co-own or charter the world's most beautiful boats",
    vertical: "boats",
    type: "page",
    haystack: "boats yacht sailboat catamaran co-ownership",
  },
  {
    href: "/boats/portfolio",
    title: "Boats Portfolio",
    subtitle: "Boats · The full fleet by market",
    vertical: "boats",
    type: "page",
    haystack: "boats portfolio fleet wajer pershing riva lagoon",
  },
  {
    href: "/boats/rent",
    title: "Boat Charter",
    subtitle: "Boats · Crewed yacht charter by the day",
    vertical: "boats",
    type: "page",
    haystack: "boat charter rent yacht crewed daily",
  },
  {
    href: "/boats/how-it-works",
    title: "How RYDA Boats works",
    subtitle: "Boats · 5-step lifecycle + FAQ",
    vertical: "boats",
    type: "page",
    haystack: "boats how it works lifecycle delaware llc captain hurricane",
  },
  {
    href: "/boats/membership",
    title: "Boats Membership",
    subtitle: "Boats · Tiers + perks",
    vertical: "boats",
    type: "page",
    haystack: "boats membership tiers early",
  },
  {
    href: "/boats/sample-documents",
    title: "Boats Sample Documents",
    subtitle: "Boats · Operating Agreement, MSA, marine survey, USCG documentation",
    vertical: "boats",
    type: "doc",
    haystack: "boats sample documents operating agreement marine survey uscg coast guard captain",
  },
  {
    href: "/boats/faq",
    title: "Boats FAQ",
    subtitle: "Boats · Common questions",
    vertical: "boats",
    type: "faq",
    haystack: "boats faq questions slip captain hurricane charter",
  },
  {
    href: "/boats/about",
    title: "About RYDA Boats",
    subtitle: "Boats · Story + founder's letter",
    vertical: "boats",
    type: "page",
    haystack: "about boats founder letter ryan story",
  },

  // Planes
  {
    href: "/planes",
    title: "RYDA Planes",
    subtitle: "Planes · Coming soon · Member cohort outreach in 2027",
    vertical: "planes",
    type: "page",
    haystack: "planes private jet aviation fractional coming soon",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Vehicle entries (cars portfolio + rental)
// ─────────────────────────────────────────────────────────────────────────

const VEHICLE_ENTRIES: SearchEntry[] = VEHICLES.flatMap((v) => {
  const baseHaystack = [
    v.name,
    v.brand,
    v.symbol,
    v.ticker,
    v.year,
    v.market,
    v.category,
    v.specs.engine,
    v.specs.power,
    v.specs.color,
    v.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const portfolio: SearchEntry = {
    href: `/portfolio/${v.symbol.toLowerCase()}`,
    title: v.name,
    subtitle: `Cars · ${v.year} · ${v.market} · ${v.specs.power}`,
    vertical: "cars",
    type: "vehicle",
    haystack: baseHaystack,
  };

  const rental: SearchEntry | null = v.rentalAvailable
    ? {
        href: `/rent/${v.symbol.toLowerCase()}`,
        title: `${v.name}, rental`,
        subtitle: `Cars · ${v.year} · From $${v.rentalDailyRate.toLocaleString()}/day`,
        vertical: "cars",
        type: "vehicle",
        haystack: `${baseHaystack} rent rental charter daily`,
      }
    : null;

  return rental ? [portfolio, rental] : [portfolio];
});

// ─────────────────────────────────────────────────────────────────────────
// Boat entries (boats portfolio + charter)
// ─────────────────────────────────────────────────────────────────────────

const BOAT_ENTRIES: SearchEntry[] = BOATS.flatMap((b) => {
  const baseHaystack = [
    b.name,
    b.brand,
    b.model,
    b.hullId,
    b.year,
    b.market,
    b.hailingPort,
    b.category,
    b.engines,
    b.specs.engine,
    b.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const portfolio: SearchEntry = {
    href: `/boats/portfolio/${b.slug}`,
    title: b.name,
    subtitle: `Boats · ${b.year} · ${b.lengthFt}' · ${b.market}`,
    vertical: "boats",
    type: "boat",
    haystack: baseHaystack,
  };

  const charter: SearchEntry | null = b.rentalAvailable
    ? {
        href: `/boats/rent/${b.slug}`,
        title: `${b.name}, charter`,
        subtitle: `Boats · ${b.year} · From $${b.rentalDailyRate.toLocaleString()}/day`,
        vertical: "boats",
        type: "boat",
        haystack: `${baseHaystack} charter rent daily yacht`,
      }
    : null;

  return charter ? [portfolio, charter] : [portfolio];
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
  ...BOAT_ENTRIES,
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
