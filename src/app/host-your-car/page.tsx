import { redirect } from "next/navigation";

// /host-your-car has been retired. The page pitched four ways to put a
// car to work with RYDA and only one of them — "earn from rentals" —
// survives the rentals-first pivot; the other three ("lease it to a
// vehicle LLC", "bring it into a co-ownership LLC") described the old
// product. That surviving rental intent is exactly what /partners now
// serves, so this redirects rather than 404s: the inbound-link value
// from press mentions, email footers and old search results is real
// and the destination already exists.

export const metadata = {
  title: "For partners",
  description:
    "List your fleet with RYDA. We route qualified rental leads to vetted local operators.",
  robots: { index: false, follow: false },
};

export default function HostYourCarRedirect() {
  redirect("/partners");
}
