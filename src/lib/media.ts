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
    // 7 luxury supercar clips — Lambo, Ferrari, McLaren in motion.
    // Random rotation on each page load keeps the front door alive.
    // No owned-asset video for cars yet; the Pexels rotation carries
    // the column. Drop a file in /public/videos/cars-*.mp4 and replace
    // this array with ["/videos/cars-yourfile.mp4"] to swap.
    videos: [
      PX("7727416", "hd_1920_1080_25fps"),  // Lamborghini speeding on city highway
      PX("8443860", "hd_1920_1080_30fps"),  // Man driving red Ferrari (interior+driving)
      PX("8443861", "hd_1920_1080_30fps"),  // Luxury sports car driving
      PX("8443781", "hd_1920_1080_30fps"),  // Red Ferrari, driver POV
      PX("16976173", "hd_1920_1080_24fps"), // Ferrari 458 in Zurich streets
      PX("14052063", "hd_1920_1080_25fps"), // Orange Lamborghini on road
      PX("5309345", "hd_1920_1080_25fps"),  // McLaren driving with driver
    ],
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Red Ferrari supercar",
    position: "center 30%",
  },
  boats: {
    // Owned-asset waves loop (CEO-provided). Single clip, no rotation
    // — matches the planes "that's it" treatment.
    // File served from /public/videos/boats-waves.mp4.
    videos: ["/videos/boats-waves.mp4"],
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Ocean waves at sunset",
    position: "center 50%",
  },
  planes: {
    // Owned-asset cloud-sunset loop (above-the-clouds, golden hour).
    // Single clip — CEO requested this exact aesthetic, no rotation.
    // File lives at /public/videos/planes-clouds.mp4 so it's served
    // from our own CDN, no external dependency or hotlink fragility.
    videos: ["/videos/planes-clouds.mp4"],
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Above the clouds at sunset",
    position: "center",
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
