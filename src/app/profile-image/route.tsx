import { ImageResponse } from "next/og";

// Square 1080×1080 wordmark logo for social profile pictures.
// Renders the RYDA wordmark in Fraunces Light on dark cream with a
// thin red rule beneath, matching the in-site brand mark.
//
// Usage:
//   1. Visit https://ryda.pro/profile-image (or /profile-image-light
//      for the inverse variant) and "Save image as".
//   2. Upload to Instagram, X, Threads, TikTok, YouTube, Pinterest,
//      Facebook, etc. 1080² covers every platform's "min profile pic"
//      requirement; platforms scale down automatically.
//
// Why Fraunces fetched at runtime: ImageResponse renders on the edge
// without access to the next/font pipeline, so we pull the TTF from
// Google Fonts CDN once per cold start. This matches the typeface used
// in <SiteHeader/> (font-display class) so the social logo and the
// site nav are visually identical.

export const runtime = "edge";
// NOTE: don't export `contentType` here — it's a metadata-image
// convention valid only on opengraph-image.tsx / icon.tsx etc.
// Route handlers infer content type from the ImageResponse body
// (next/og sets image/png automatically). Audit P1.

const SIZE = 1080;

// Cache-bust by version, bump this if the design changes and you want
// browsers / Twitter / etc. to re-fetch a fresh copy.
const VERSION = "v1";

// Fraunces — fetched dynamically via the Google Fonts CSS endpoint so
// we don't break when Google rotates their gstatic version (v36 → v38
// happened mid-2025 with no advance notice). The CSS endpoint is
// stable and parses out the real TTF URL each call.
const FRAUNCES_CSS =
  "https://fonts.googleapis.com/css2?family=Fraunces:wght@300&display=swap";

async function loadFrauncesTTF(): Promise<ArrayBuffer | null> {
  try {
    // Browsers get the modern woff2 variant; Mozilla UA forces the
    // legacy TTF source URL which is what next/og's renderer accepts.
    const cssRes = await fetch(FRAUNCES_CSS, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "force-cache",
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/);
    if (!match) return null;
    const ttfRes = await fetch(match[1], { cache: "force-cache" });
    if (!ttfRes.ok) return null;
    return await ttfRes.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET() {
  // Fetch font on the edge. If Google Fonts is unreachable we fall
  // back to a serif system stack — still readable, slightly different
  // glyph but acceptable.
  const frauncesData = await loadFrauncesTTF();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0E0E10",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Faint vignette to add depth on the otherwise-flat square,
          // keeps the wordmark from looking flat on platforms that
          // crop it into a circle.
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(244, 241, 236, 0.04) 0%, rgba(14, 14, 16, 0) 65%)",
        }}
      >
        {/* Wordmark — sized to take up about 60% of the square so a
            circle crop on TikTok/X/etc. comfortably contains it. */}
        <div
          style={{
            fontFamily: frauncesData ? "Fraunces" : "Georgia, serif",
            fontWeight: 300,
            fontSize: 380,
            lineHeight: 1,
            letterSpacing: -10,
            color: "#F4F1EC",
            display: "flex",
          }}
        >
          RYDA
        </div>

        {/* Brand-color rule, the single hit of red that signals the
            full palette without overwhelming the mark. */}
        <div
          style={{
            width: 88,
            height: 4,
            background: "#DC4747",
            marginTop: 56,
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      // Long cache, this asset rarely changes. The VERSION constant
      // above is the manual cache-bust knob.
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-RYDA-Profile-Image-Version": VERSION,
      },
      ...(frauncesData
        ? {
            fonts: [
              {
                name: "Fraunces",
                data: frauncesData,
                style: "normal",
                weight: 300,
              },
            ],
          }
        : {}),
    },
  );
}
