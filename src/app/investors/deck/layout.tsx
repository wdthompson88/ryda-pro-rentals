import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investor deck — RYDA",
  description:
    "RYDA investor deck, confidential. Member-managed supercar co-ownership; seed round open.",
};

export default function DeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
