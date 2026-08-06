import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member onboarding",
  description:
    "RYDA's guided onboarding, identity verification, preferences, and tier selection. Most members finish in under 8 minutes.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
