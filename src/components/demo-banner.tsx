// Visible banner for member-area pages that are not yet behind real
// authentication, keeps the public, journalist, and SEC views from
// mistaking a demo dashboard for live member data.
//
// Gated by NEXT_PUBLIC_DEMO_MODE — the banner only renders when this
// env var is "true". Once real production data is flowing (post-
// launch), set NEXT_PUBLIC_DEMO_MODE="false" (or unset) on Vercel
// and the banner disappears across every member surface that uses
// this component, with no code change needed.
//
// Default policy: banner ON unless explicitly disabled. That keeps
// preview / dev / unset-env environments showing the banner; only
// the production deploy with a real launch flips it off.

export function DemoBanner({
  message = "Sample view, member-area features ship with the Miami launch. No real co-ownership data is shown here.",
}: {
  message?: string;
}) {
  // Read at render time. process.env.NEXT_PUBLIC_* is inlined at
  // build time so the conditional here lives in the client bundle
  // — no runtime fetch needed.
  const explicitlyOff = process.env.NEXT_PUBLIC_DEMO_MODE === "false";
  if (explicitlyOff) return null;

  return (
    <div className="border-b border-red/30 bg-red/10 px-6 py-2 text-center text-xs text-red sm:px-10">
      <span className="mr-1 font-medium uppercase tracking-wider">Demo</span>
      <span className="text-ink-soft">{message}</span>
    </div>
  );
}
