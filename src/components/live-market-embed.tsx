// Live market-data embed for the asset detail page. Drops in a
// third-party widget (currently classic.com; could be Hagerty or
// other providers later) inside our brand-styled wrapper.
//
// The widget itself is in an iframe — same hashtag-heading
// treatment as the other Rally-anatomy sections so it reads as
// part of the editorial flow, not a bolted-on third-party badge.
//
// Renders nothing if no URL — same graceful-degradation pattern as
// the other optional anatomy sections.

export function LiveMarketEmbed({
  url,
  code,
}: {
  url: string;
  code: string;
}) {
  if (!url) return null;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-red">
          <span className="opacity-70">#</span>
          {code} · Live market data
        </p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What this car is worth, today.
          </h2>
          <p className="max-w-md text-xs text-mute">
            Live recent-sales chart from classic.com, refreshed
            continuously from public auction results.
          </p>
        </div>

        {/* iframe wrapped in a dark cinematic frame so it sits
            visually with the rest of the gallery + anatomy
            sections. Lazy-loaded so it doesn't block the page's
            initial paint. */}
        {/* sandbox: deny everything by default, then re-enable only
            what classic.com's chart needs (scripts to render the
            chart; same-origin so its API calls work; popups so the
            "view full market" link can open a new tab). Without this
            a compromised classic.com widget could redirect top.location
            or read referrer state. Audit T1-2.
            Responsive height: aspect-[16/10] sized so the widget
            scales with the container (was fixed 450px which broke
            on mobile <400px and felt cramped on desktop). */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-rule bg-ink aspect-[16/10] sm:aspect-[2/1]">
          <iframe
            src={url}
            loading="lazy"
            title={`${code} live market data`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-full w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
