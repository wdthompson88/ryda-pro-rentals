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
        <div className="mt-8 overflow-hidden rounded-2xl border border-rule bg-ink">
          <iframe
            src={url}
            width="100%"
            height={450}
            loading="lazy"
            title={`${code} live market data`}
            // referrerPolicy: don't leak the full URL to the embed
            // host (just the origin), classic.com gets ryda.pro,
            // not the specific path.
            referrerPolicy="strict-origin-when-cross-origin"
            className="block w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
