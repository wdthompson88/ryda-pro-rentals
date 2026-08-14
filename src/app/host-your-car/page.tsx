import { redirect } from "next/navigation";

// /host-your-car has been retired. The page pitched four ways to put a
// car to work with RYDA and only one of them — "earn from rentals" —
// survives the rentals-first pivot; the other three ("lease it to a
// vehicle LLC", "bring it into a co-ownership LLC") described the old
// product. That surviving rental intent is exactly what /partners now
// serves, so this redirects rather than 404s: the inbound-link value
// from press mentions, email footers and old search results is real
// and the destination already exists.

// The description is deleted rather than rewritten. It said "We route
// qualified rental leads to vetted local operators", which packed three
// claims into one sentence: nothing qualifies a lead (they arrive in
// RYDA's inbox and are forwarded by hand), "operators" plural asserted a
// roster, and "vetted" appeared with no route to the single definition
// at /trust-and-safety#vetting — which a metadata string cannot link to.
// This route is noindex and redirects to /partners, so the description
// was doing no work worth keeping.
export const metadata = {
  title: "For partners",
  robots: { index: false, follow: false },
};

export default function HostYourCarRedirect() {
  redirect("/partners");
}
