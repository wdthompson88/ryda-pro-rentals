import { ComingSoonLocation } from "@/components/coming-soon-location";

export const metadata = {
  title: "New York — RYDA",
  description:
    "RYDA New York. Q3 2027 launch. Join the NY priority list to lock in founding-member pricing.",
};

export default function NewYorkPage() {
  return (
    <ComingSoonLocation
      city="New York"
      state="NY"
      launchQuarter="Q3 2027"
      intro="New York is RYDA's third market — and the most operationally interesting one. The cars don't live in Manhattan; they live in vetted upstate facilities, two hours from the city, with white-glove delivery to your weekend home in the Hamptons or your country house upstate. NY membership skews toward the GT and Grand Tourer, not track cars."
      whyHere={[
        "Highest concentration of US wealth — the densest density of accredited investors in the country.",
        "RYDA's Black-tier services (concierge, white-glove, member events) match how NY UHNW families already buy services.",
        "Driving culture is weekend-and-summer, not daily — fits the share model perfectly.",
        "F1 returns to NJ in 2027 (announced); RYDA programming ties to Miami GP, F1 NJ, and Pebble Beach.",
        "Insurance carriers price NY-stored, not NY-driven; significant savings vs. Manhattan-resident exotic policies.",
      ]}
      vehiclePreview={[
        "Rolls-Royce Cullinan Black Badge — 2024",
        "Bentley Continental GT Speed — 2024",
        "Aston Martin DB12 — 2024",
        "Ferrari Roma — 2023",
        "Mercedes-AMG SL 63 — 2024",
        "Porsche 911 Turbo S — 2024",
      ]}
    />
  );
}
