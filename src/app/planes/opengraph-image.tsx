import { ImageResponse } from "next/og";

// /planes vertical OG image — neutral cream accent (the column's
// styling on the splitter), since the vertical is in design.

export const alt = "RYDA Planes — Fractional access to private aviation. In design.";
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
            color: "#D4CFC4",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          RYDA Planes · In design
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
          <span>Planes</span>
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
            Fractional access to private aviation —&nbsp;
          </span>
          <span style={{ color: "#DC4747" }}>structured the same way.</span>
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
          <div>Member-managed Delaware LLC</div>
          <div>Member cohort · 2027</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
