import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BoatBuyFlow } from "@/components/boat-buy-flow";
import { BOATS, getBoatBySlug, formatUSD } from "@/lib/boat-data";

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
  if (!v) return { title: "Claim a co-ownership share — RYDA" };
  return {
    title: `Claim a share, ${v.name} | RYDA`,
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

  const requestedShares = Math.max(
    1,
    Math.min(v.sharesAvailable, parseInt(sharesParam || "1", 10) || 1),
  );

  return (
    <>
      <SiteHeader />
      <BoatBuyFlow boat={v} initialShares={requestedShares} />
    </>
  );
}
