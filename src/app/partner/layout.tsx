import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner dashboard",
  description:
    "Track your RYDA Fleet Partner application and manage your company profile.",
  // Per-account surface — keep it out of the index. Same shape as
  // every other private surface (founding-members, my-cars, …).
  // robots.ts can't cover this route: a "Disallow: /partner" prefix
  // would also block the public /partners marketing page.
  robots: { index: false, follow: false },
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
