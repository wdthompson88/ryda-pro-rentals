// No metadata export. This file used to set title "Member onboarding"
// and a description selling "identity verification, preferences, and
// tier selection. Most members finish in under 8 minutes." There is no
// membership and no tier; STEPS in ./page.tsx is [Basic, Identity,
// Done], so there is no preferences step either; and nothing in this
// repo times a completion, so the 8 minutes had no source. Every clause
// was false, so the whole block is deleted rather than reworded — the
// tab falls back to the root layout's title, which is true. Do not
// re-add a title here without something in the code to point at.

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
