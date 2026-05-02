import { ImageResponse } from "next/og";

// /boats vertical OG image, marine-blue accent matching the boats
// vertical theme.

export const alt = "RYDA Boats, Co-own or charter the world's most beautiful boats";
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
        <div
          style={{
            fontSize: 28,
            letterSpacing: 7,
            color: "#4A90D9",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          RYDA Boats
        </div>
        <div
          style={{
            fontSize: 220,
            fontWeight: 300,
            marginTop: 36,
            lineHeight: 1,
            letterSpacing: -6,
            display: "flex",
            alignItems: "baseline",
          }}
        >
          <span>Boats</span>
          <span style={{ color: "#4A90D9", fontStyle: "italic" }}>.</span>
        </div>
        <div
          style={{
            fontSize: 38,
            marginTop: 48,
            maxWidth: 920,
            lineHeight: 1.3,
            fontWeight: 300,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#D4CFC4" }}>
            Floating real estate, held in an LLC —&nbsp;
          </span>
          <span style={{ color: "#4A90D9" }}>~32 days a year per share.</span>
        </div>
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
          <div>3-yr planned exit · Member-managed LLC</div>
          <div>Miami launch · Q3 2026</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
