import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a RYDA account to keep the Miami rental requests you send in one place. Browsing and requesting a car stay open to everyone.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
