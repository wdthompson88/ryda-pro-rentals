import { notFound } from "next/navigation";
import { VEHICLES, getVehicleBySymbol } from "@/lib/market-data";
import { MyCarDashboard } from "./dashboard";

// Server shell — resolves params, generates metadata, then hands off to
// the client dashboard which fetches real ownership/LLC/bookings data
// via /api/account/my-asset. The dashboard handles its own auth + 404
// states.

export async function generateStaticParams() {
  return VEHICLES.map((v) => ({ symbol: v.symbol.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  return {
    title: v ? `${v.name} · My Cars` : "My Cars",
    robots: { index: false, follow: false },
  };
}

export default async function MyCarPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const vehicle = getVehicleBySymbol(symbol);
  if (!vehicle) notFound();
  return <MyCarDashboard vehicle={vehicle} />;
}
