// /compare has been folded into /how-it-works (which now contains the
// 4-way comparison table, "when each option makes sense" cards, and the
// honest-math sections). The calculator that used to live here is now
// embedded on every share-car listing at /markets/[symbol]#calculator,
// so per-vehicle math runs in context instead of as a generic anchor.
//
// We keep this route as a server-side redirect so any external links
// (press, decks, emails) still resolve.

import { redirect } from "next/navigation";

export default function ComparePage() {
  redirect("/how-it-works");
}
