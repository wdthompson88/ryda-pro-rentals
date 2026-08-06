import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner dashboard",
  description:
    "Track your RYDA Fleet Partner application and manage your company profile.",
  // Per-account surface — keep it out of the index.
  robots: { index: false },
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
