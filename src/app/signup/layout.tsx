import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create your RYDA account. Browsing is free; an account unlocks rentals, bookings, and co-ownership.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
