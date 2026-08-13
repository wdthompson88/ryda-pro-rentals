import { ImageResponse } from "next/og";

// Root-level OG image — the card that renders whenever ANY RYDA link is
// shared, so it is the single most-seen surface on the site. It says
// what the product is and nothing else: independent Miami operators'
// exotics, listed in one grid, one request away.
//
// What used to be here — "Co-own or rent the world's most coveted
// vehicles — cars, boats, planes", an "Asset-backed · LLC" footer and a
// "Luxury Vehicle Access" eyebrow — advertised a co-ownership product
// that does not exist in this repo, and two verticals (boats, planes)
// with zero inventory. Terms §2 says RYDA owns no vehicle; a shared
// link that says "asset-backed" contradicts it before the page loads.
//
// Colour literals are deliberate. Satori renders this outside the
// document and cannot read the CSS custom properties, so the values
// below are the design-system tokens written out: ink (#0E0E10),
// cream (#F4F1EC), red-bright (#DC4747, the accent tuned for ink).

export const alt =
  "RYDA — rent Miami's most-wanted exotics. One request away.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0E0E10",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          color: "#F4F1EC",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 28,
            letterSpacing: 7,
            color: "#DC4747",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Exotic Rentals · Miami
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 240,
            fontWeight: 300,
            marginTop: 36,
            lineHeight: 1,
            letterSpacing: -6,
          }}
        >
          RYDA
        </div>

        {/* Tagline — the home page's own line, verbatim. */}
        <div
          style={{
            fontSize: 38,
            marginTop: 44,
            maxWidth: 920,
            lineHeight: 1.3,
            fontWeight: 300,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#D4CFC4" }}>
            Miami&apos;s most-wanted exotics.&nbsp;
          </span>
          <span style={{ color: "#DC4747" }}>One request away.</span>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "1px solid rgba(244, 241, 236, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#9A9590",
            fontSize: 24,
            letterSpacing: 5,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <div>Independent Miami operators</div>
          <div>ryda.pro</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
