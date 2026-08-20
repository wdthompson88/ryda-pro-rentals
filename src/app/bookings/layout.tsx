import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking",
  // Per-booking surface, reachable only by its two parties — the same
  // posture /partner and /account take. robots.ts cannot cover it with a
  // prefix without also catching anything else under /bookings.
  robots: { index: false, follow: false },
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
