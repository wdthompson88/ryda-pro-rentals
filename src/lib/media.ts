// Media config — single source of truth for hero video + poster
// imagery across the site. Each vertical (cars, boats, planes) gets a
// curated list of Pexels CDN clip URLs and a fallback poster image.
// MediaBackground rotates through the list on each visit so the
// splitter never feels static.
//
// All Pexels URLs below were probed live and confirmed to return 200
// (predictable filename pattern: {ID}/{ID}-{spec}.mp4). License: each
// clip is royalty-free under Pexels' standard license, free for
// commercial use, no attribution required (attribution appreciated).
//
// To swap to owned-asset videos: drop files into /public/videos/ and
// replace the URL strings below with `/videos/<filename>.mp4`.

export type MediaSlot = {
  /** List of video URLs to rotate through. First entry is used during
   *  SSR / initial paint; client picks a random one on mount. Empty
   *  array = poster only. */
  videos: string[];
  /** Fallback poster image. Always required. */
  poster: string;
  /** Alt text for the poster image. */
  alt: string;
  /** Optional CSS object-position override. */
  position?: string;
};

const PX = (id: string, spec: string) =>
  `https://videos.pexels.com/video-files/${id}/${id}-${spec}.mp4`;

// ─────────────────────────────────────────────────────────────────────────
// Splitter columns (the / page)
// ─────────────────────────────────────────────────────────────────────────

export const SPLITTER_MEDIA: Record<"cars" | "boats" | "planes", MediaSlot> = {
  cars: {
    // Mix: 6 Pexels supercar clips (camera locked on vehicle) + 3
    // CEO-provided owned-asset clips (Koenigsegg Jesko, Ferrari,
    // Aventador SVJ). The SVJ uses Media Fragment URI #t=1.5,11.5
    // to trim the YouTube-short intro/outro (road-only frames the
    // CEO flagged). Browser plays only the trimmed window natively.
    // Dropped Aventador-Lisbon (17051328) — the "trails off to
    // skyline" clip the CEO called out in the screenshot.
    videos: [
      // Owned-asset, brand-approved
      "/videos/cars-koenigsegg-jesko.mp4",
      "/videos/cars-ferrari.mp4",
      "/videos/cars-aventador-svj.mp4#t=1.5,11.5",
      // Pexels — camera-locked supercar shots
      PX("8443860", "hd_1920_1080_30fps"),  // Driver-side interior of red Ferrari, in motion
      PX("8443861", "hd_1920_1080_30fps"),  // Luxury sports car interior, driving
      PX("8443781", "hd_1920_1080_30fps"),  // Red Ferrari driver POV
      PX("5309345", "hd_1920_1080_25fps"),  // Man driving McLaren (interior)
      PX("7727416", "hd_1920_1080_25fps"),  // Lamborghini speeding (tracking, car centered)
      PX("16976173", "hd_1920_1080_24fps"), // Ferrari 458 in Zurich (tracking)
    ],
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Red Ferrari supercar",
    position: "center 30%",
  },
  boats: {
    // Mix: 4 Pexels superyacht clips + 5 CEO-provided owned-asset
    // yacht clips (LOON, Eclipse, Superyacht-in-London, Untitled,
    // vtMyG3i7TvI). Dropped the Haulover Bay clip (19867146) — the
    // "yacht too small at horizon" one the CEO called out.
    videos: [
      // Owned-asset, brand-approved (named superyachts: LOON, ECLIPSE)
      "/videos/boats-my-loon.mp4",
      "/videos/boats-eclipse.mp4",
      "/videos/boats-london.mp4",
      "/videos/boats-vtmyg3.mp4",
      "/videos/boats-untitled.mp4",
      // Pexels — superyacht only. Dropped 14037398 (yacht-too-far-from-
      // -camera against an LA-coast-style coastline — CEO flagged the
      // screenshot a second time) and 14037403 (similar wide-establishing
      // shot). Kept the marina + docked-at-port shots where the yacht
      // fills more of the frame.
      PX("13878618", "hd_1920_1080_30fps"), // Yacht sailing out of marina
      PX("15288018", "hd_1920_1080_30fps"), // Drone video of luxury yacht docked at port
    ],
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Superyacht on the water at sunset",
    position: "center 50%",
  },
  planes: {
    // Single owned-asset private-jet edit. CEO replaced the
    // turboprop / commercial-airliner Pexels clips entirely.
    videos: ["/videos/planes-jet-edit.mp4"],
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Private jet on tarmac at dusk",
    position: "center 70%",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Hero media — single-clip slots for cinematic hero sections on the
// non-splitter pages. Same Pexels URLs as the splitter rotations.
// ─────────────────────────────────────────────────────────────────────────

export const HERO_MEDIA: Record<
  "cars-home"
  | "cars-portfolio"
  | "boats-home"
  | "boats-portfolio"
  | "planes",
  MediaSlot
> = {
  "cars-home": {
    videos: [PX("8443860", "hd_1920_1080_30fps")],
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Red Ferrari 296 GTB",
  },
  "cars-portfolio": {
    videos: [PX("16976173", "hd_1920_1080_24fps")],
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Red Ferrari supercar",
    position: "center 30%",
  },
  "boats-home": {
    videos: [PX("14037398", "hd_1920_1080_30fps")],
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Yacht on the water at sunset",
  },
  "boats-portfolio": {
    videos: [PX("7555069", "hd_1920_1080_25fps")],
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Yacht on the water at sunset",
  },
  planes: {
    videos: ["/videos/planes-clouds.mp4"],
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Above the clouds at sunset",
  },
};
