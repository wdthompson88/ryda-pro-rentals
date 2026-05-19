import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin-auth";
import { BoatsComingSoon } from "@/components/boats-coming-soon";

// Public curtain over the boats vertical while it finishes. Admins
// (app_metadata.role === "admin") see the real pages so we can keep
// building; everyone else sees the coming-soon component.
//
// We reuse requireAdmin from src/lib/admin-auth.ts via a synthetic
// Request constructed from the incoming cookie/authorization headers.
// Zero duplicated auth logic; if the admin contract changes there,
// it changes here.
//
// `headers()` makes this layout dynamic — every request re-runs the
// admin check. Unauthenticated visitors short-circuit inside
// getUserFromRequest before any Supabase call, so the cost only lands
// on signed-in users.
//
// Reverting the gate when boats ships: delete this file (and the
// BoatsComingSoon component). The /boats/* tree is untouched.
export default async function BoatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const gateReq = new Request("https://gate.local/boats", {
    headers: {
      cookie: hdrs.get("cookie") ?? "",
      authorization: hdrs.get("authorization") ?? "",
    },
  });

  const admin = await requireAdmin(gateReq);
  if (admin) {
    return <>{children}</>;
  }

  return <BoatsComingSoon />;
}
