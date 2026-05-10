import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Member sign-in for RYDA. Goes live with the Miami launch.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
