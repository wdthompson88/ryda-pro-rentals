import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import BuyFlow from "@/components/shared/buy-flow";
import { VEHICLES, getVehicleBySymbol, formatUSD } from "@/lib/market-data";

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
  if (!v) return { title: "Claim a co-ownership share" };
  return {
    title: `Claim a share — ${v.name}`,
    description: `Become a co-owner of the ${v.year} ${v.name}. ${formatUSD(v.pricePerShare)} per share.`,
  };
}

export default async function BuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ shares?: string }>;
}) {
  const { symbol } = await params;
  const { shares: sharesParam } = await searchParams;
  const v = getVehicleBySymbol(symbol);
  if (!v || v.sharesAvailable <= 0) notFound();

  // 2-share minimum per person under the new doctrine. Default and
  // floor are both 2 so a buyer landing on /buy without a `?shares=`
  // param still sees a purchasable scenario.
  const requestedShares = Math.max(
    2,
    Math.min(v.sharesAvailable, parseInt(sharesParam || "2", 10) || 2),
  );
  const buyFlowConfig = {
    vertical: "cars",
    accent: "red",
    returnHref: `/portfolio/${v.symbol.toLowerCase()}`,
    returnLabel: v.ticker,
    checkoutAssetKey: "vehicleSymbol",
    checkoutAssetValue: v.symbol,
    labels: {
      asset: "Vehicle",
      assetLower: "vehicle",
      storageLabel: "Stored in",
      storageValue: v.market,
      usageDays: "Driving days",
      distanceLabel: "Mileage",
      distanceValue: `${v.milesPerYear.toLocaleString()} miles/year`,
      insuranceUse: "drive the vehicle",
      operationVerb: "drive",
      depreciationAsset: "car",
      kycUse: "vehicle",
      noteAsset: "car",
      walkthroughTitle: "Vehicle walkthrough",
      walkthroughBody:
        "A 30-minute walkthrough on the vehicle (controls, etiquette, condition baseline) before your first drive.",
      marketsHref: "/portfolio",
      marketsLabel: "Back to markets",
    },
  } as const;

  return (
    <>
      <SiteHeader />
      <BuyFlow asset={v} initialShares={requestedShares} config={buyFlowConfig} />
    </>
  );
}
