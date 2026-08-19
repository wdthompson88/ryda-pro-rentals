import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to RYDA to see the rental requests you've sent and where each one stands.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
