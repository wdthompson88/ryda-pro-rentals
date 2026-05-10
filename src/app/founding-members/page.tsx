import { redirect } from "next/navigation";

// The /founding-members surface has been retired. We now route every
// "join the cohort" intent through the simpler /signup flow. This
// page exists only to redirect old inbound links (email footers, press
// mentions, search index) so nobody hits a 404.

export const metadata = {
  title: "Sign up",
  description: "Join RYDA. Miami launch Q3 2026.",
  robots: { index: false, follow: false },
};

export default function FoundingMembersRedirect() {
  redirect("/signup");
}
