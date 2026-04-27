import { SiteHeader } from "@/components/site-header";
import { HandoverFlow } from "@/components/handover-flow";

export async function generateStaticParams() {
  return [{ id: "BK-00428" }];
}

export const metadata = { title: "Check-in — RYDA" };

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <SiteHeader />
      <HandoverFlow variant="checkin" bookingId={id} vehicleName="Ferrari 296 GTB" />
    </>
  );
}
