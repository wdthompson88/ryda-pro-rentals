import { ImageResponse } from "next/og";

export const alt = "RYDA — Supercar co-ownership and rentals";
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
            fontSize: 32,
            letterSpacing: 7,
            color: "#DC4747",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Supercar Co-Ownership &amp; Rentals
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 240,
            fontWeight: 300,
            marginTop: 40,
            lineHeight: 1,
            letterSpacing: -6,
          }}
        >
          RYDA
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 38,
            marginTop: 48,
            maxWidth: 880,
            lineHeight: 1.3,
            fontWeight: 300,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#D4CFC4" }}>
            Co-own or rent a Ferrari, Lamborghini, or McLaren —&nbsp;
          </span>
          <span style={{ color: "#DC4747" }}>for a fraction of the cost.</span>
        </div>

        {/* Footer rule + meta */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 28,
            borderTop: "1px solid rgba(244, 241, 236, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#9A9590",
            fontSize: 26,
            letterSpacing: 5,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <div>Asset-backed · Delaware LLC</div>
          <div>Miami launch · Q3 2026</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
