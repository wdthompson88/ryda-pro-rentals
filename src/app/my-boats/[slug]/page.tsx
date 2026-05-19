import { notFound } from "next/navigation";
import { BOATS, getBoatBySlug } from "@/lib/boat-data";
import { MyBoatDashboard } from "./dashboard";

// Server shell — resolves params, generates metadata, and hands off to
// the client dashboard which fetches real ownership/LLC/bookings data
// via /api/account/my-asset. The dashboard handles its own auth + 404
// states (signed-in non-owner sees a polite empty state, anon bounces
// to /signin).
//
// We still keep generateStaticParams + valid-slug guard so guessable
// nonsense URLs return 404 instead of hitting the API.

export async function generateStaticParams() {
  return BOATS.map((b) => ({ slug: b.slug.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBoatBySlug(slug);
  return {
    title: b ? `${b.name} · My Boats` : "My Boats",
    robots: { index: false, follow: false },
  };
}

export default async function MyBoatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const boat = getBoatBySlug(slug);
  if (!boat) notFound();
  return <MyBoatDashboard boat={boat} />;
}
