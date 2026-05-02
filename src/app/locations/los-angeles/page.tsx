import { ComingSoonLocation } from "@/components/coming-soon-location";

export const metadata = {
  title: "Los Angeles — RYDA",
  description:
    "RYDA Los Angeles. Q1 2027 launch. Join the LA priority list to lock in early-member pricing.",
};

export default function LosAngelesPage() {
  return (
    <ComingSoonLocation
      city="Los Angeles"
      state="CA"
      launchQuarter="Q1 2027"
      intro="LA is the second RYDA market because the fleet is already there, every Ferrari dealership in the country has higher LA delivery rates than anywhere except Miami. The PCH, Mulholland, and Angeles Crest practically require a supercar. Storage and registration both work cleanly in California."
      whyHere={[
        "Second-largest US luxury auto market by volume after Miami.",
        "Driver-friendly geography, PCH, Mulholland, Angeles Crest. The roads themselves are the destination.",
        "Year-round driving weather (the canyon roads stay dry 9 months a year).",
        "Concentration of entertainment, tech, and finance executives, the demographic RYDA already attracts.",
        "Existing community of car culture and clubs that RYDA can plug into rather than recreate.",
      ]}
      vehiclePreview={[
        "Ferrari 296 GTB, 2024",
        "McLaren 750S Spider, 2024",
        "Lamborghini Huracán STO, 2023",
        "Porsche 911 GT3 RS, 2024",
        "Aston Martin Vantage, 2024",
        "Rolls-Royce Spectre, 2024 (electric)",
      ]}
    />
  );
}
