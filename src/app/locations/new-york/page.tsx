import { PlannedMarket } from "../_components/planned-market";

// New York: a city RYDA wants, not a city RYDA covers.
//
// The previous version had RYDA keeping cars "in vetted upstate
// facilities, two hours from the city, with white-glove delivery to
// your weekend home in the Hamptons", promised a Q3 2027 launch, an
// inaugural fleet RYDA would supply, "Black-tier services", insurance
// savings from NY-stored policies, and early-member pricing locked for
// life. RYDA stores no vehicle, delivers nothing, insures nothing, and
// has no tiers or members — and the launch quarter had no referent in
// the codebase and disagreed with the one market-data.ts printed. All
// of it is deleted rather than restated.

export const metadata = {
  title: "New York",
  description:
    "RYDA does not list any cars in New York yet. Every listing on the platform today is a Miami car, run by an independent local operator.",
  alternates: { canonical: "/locations/new-york" },
};

export default function NewYorkPage() {
  return (
    <PlannedMarket
      city="New York"
      state="NY"
      slug="new-york"
      whyParagraphs={[
        "New York drives out of the city rather than through it. The East End in July, upstate in October, the odd clear winter weekend — the car is for the trip, and the rest of the year it would be a parking problem.",
        "That is a renting pattern rather than an owning one, which is the pattern RYDA is built around: you want the car for the days you will actually use it, from someone whose business is having it ready.",
        "There are no New York operators listed here yet, so there is nothing to browse and no date to promise. When operators in the city list with us, their cars appear in the same grid as everything else.",
      ]}
    />
  );
}
