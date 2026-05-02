import { redirect } from "next/navigation";

// /investors/deck, no longer publicly accessible. The pitch deck
// is confidential and emailed (as PDF) to qualified investors who
// submit an inquiry on /investors. This route 308-redirects there.

export const metadata = {
  title: "Investor deck, request access",
  description: "RYDA's investor deck is confidential. Request access on the investor inquiry page.",
  robots: { index: false, follow: false },
};

export default function DeckPage() {
  redirect("/investors#request-deck");
}
