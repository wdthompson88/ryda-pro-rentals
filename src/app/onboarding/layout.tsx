import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for membership",
  description:
    "RYDA's guided onboarding, identity verification, preferences, and tier selection. Most applications take under 8 minutes.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
