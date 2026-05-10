import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New booking",
  description: "Book time on a vehicle you co-own. Pick the dates, trip type, and handover.",
};

export default function NewBookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
