import { PlannedMarket } from "../_components/planned-market";

// Los Angeles: a city RYDA wants, not a city RYDA covers.
//
// The previous version promised a Q1 2027 launch, an inaugural
// six-car fleet ("Ferrari 296 GTB, 2024", "Rolls-Royce Spectre, 2024"
// …) that RYDA would supply, "storage and registration both work
// cleanly in California", and a priority list locking early-member
// pricing for life. RYDA supplies no cars, stores none, and has no
// members or pricing tiers; the launch quarter had no referent in the
// codebase and disagreed with the one market-data.ts printed. All of
// it is deleted. What is left says the only checkable thing: nothing
// is listed here yet.

export const metadata = {
  title: "Los Angeles",
  description:
    "RYDA does not list any cars in Los Angeles yet. Every listing on the platform today is a Miami car, run by an independent local operator.",
  alternates: { canonical: "/locations/los-angeles" },
};

export default function LosAngelesPage() {
  return (
    <PlannedMarket
      city="Los Angeles"
      state="CA"
      slug="los-angeles"
      whyParagraphs={[
        "Los Angeles makes its own case for a car worth renting. The PCH, Mulholland, Angeles Crest — the roads are the reason people book, not the errand at the end of them. Weather rarely gets a vote.",
        "It also already has what RYDA needs to be useful: a deep bench of independent operators renting out exotic inventory, spread across their own websites and social accounts, with no single place to compare them. That is the same problem we started with in Miami.",
        "None of which is a plan with a date on it. Los Angeles becomes a market on this site the day operators here are listed on it, and not before.",
      ]}
    />
  );
}
