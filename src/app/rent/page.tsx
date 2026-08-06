import { permanentRedirect } from "next/navigation";

// Rental-first pivot (Aug 2026): the marketplace grid moved to the
// homepage and / is the single canonical URL for it. /rent 308s home
// so old links, bookmarks, and indexed pages consolidate rather than
// serving duplicate content. /rent/[slug] detail pages are unaffected.
export default function RentPage() {
  permanentRedirect("/");
}
