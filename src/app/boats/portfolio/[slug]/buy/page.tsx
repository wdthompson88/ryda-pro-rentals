import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import BuyFlow from "@/components/shared/buy-flow";
import { BOATS, getBoatBySlug, formatUSD } from "@/lib/boat-data";
import { resolveAcquisitionStatus } from "@/components/acquisition-badge";

export async function generateStaticParams() {
  return BOATS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = getBoatBySlug(slug);
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ shares?: string }>;
}) {
  const { slug } = await params;
  const { shares: sharesParam } = await searchParams;
  const v = getBoatBySlug(slug);
  if (!v || v.sharesAvailable <= 0) notFound();

  // 2-share minimum per person under the new doctrine. Default and
  // floor both 2 so the buy flow opens with a purchasable scenario.
  const requestedShares = Math.max(
    2,
    Math.min(v.sharesAvailable, parseInt(sharesParam || "2", 10) || 2),
  );
  const buyFlowConfig = {
    vertical: "boats",
    accent: "marine",
    returnHref: `/boats/portfolio/${v.slug.toLowerCase()}`,
    returnLabel: v.hullId,
    checkoutAssetKey: "boatSlug",
    checkoutAssetValue: v.slug,
    labels: {
      asset: "Boat",
      assetLower: "boat",
      // Codex round-3 catch: pre-secured hulls shouldn't claim a
      // hailing port — switch label to "Target market" until LLC
      // takes title.
      storageLabel:
        resolveAcquisitionStatus(v.acquisitionStatus) === "secured"
          ? "Hailing port"
          : "Target market",
      storageValue: v.market,
      usageDays: "Cruising days",
      distanceLabel: "Nautical miles",
      distanceValue: `${v.nmPerYear.toLocaleString()} nm/year`,
      insuranceUse: "operate the boat",
      operationVerb: "operate",
      depreciationAsset: "boat",
      kycUse: "boat",
      noteAsset: "boat",
      walkthroughTitle: "Boat walkthrough",
      walkthroughBody:
        "A 30-minute walkthrough on the boat (controls, etiquette, condition baseline) before your first cruise.",
      marketsHref: "/boats/portfolio",
      marketsLabel: "Back to markets",
    },
    extraReviewBullets: [
      {
        label: "Caribbean charter",
        value: v.captainIncluded ? "Eligible (crewed)" : "Not eligible",
      },
    ],
  } as const;

  return (
    <>
      <SiteHeader />
      <BuyFlow asset={v} initialShares={requestedShares} config={buyFlowConfig} />
    </>
  );
}
