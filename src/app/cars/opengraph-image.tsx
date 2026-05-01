import { ImageResponse } from "next/og";

// /cars vertical OG image — same root template but anchored on the
// supercar brand (red accent).

export const alt = "RYDA Cars — Co-own or rent the world's most exceptional cars";
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
            color: "#DC4747",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          RYDA Cars
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
          <span>Cars</span>
          <span style={{ color: "#DC4747", fontStyle: "italic" }}>.</span>
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
            Co-own a curated CPO Ferrari, Lamborghini, or McLaren —&nbsp;
          </span>
          <span style={{ color: "#DC4747" }}>~30 days a year per share.</span>
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
          <div>2-yr planned exit · Member-managed Delaware LLC</div>
          <div>Miami today</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
