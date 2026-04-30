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
    // Owned-asset road-travel sunset loop (CEO-provided). Single clip,
    // no rotation — matches the planes treatment so each vertical has
    // its own signature backdrop.
    // File served from /public/videos/cars-sunset-road.mp4.
    videos: ["/videos/cars-sunset-road.mp4"],
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Red Ferrari supercar",
    position: "center 30%",
  },
  boats: {
    // 6 yacht-PROMINENT clips. Earlier rotation included 3 wide-ocean
    // panoramas where the yacht was a small dot on the horizon — a
    // splitter column that plays "open water with no boat" reads as
    // broken to a buyer. Replaced with tracking shots, close marina
    // shots, and a Miami Haulover Bay yacht — boat fills the frame in
    // every clip.
    videos: [
      PX("14037398", "hd_1920_1080_30fps"), // Drone aerial of white motor yacht along coastal city
      PX("4337674", "hd_1920_1080_30fps"),  // Tracking shot of motor boat on water
      PX("4337675", "hd_1920_1080_30fps"),  // Tracking shot, alternate angle
      PX("13878618", "hd_1920_1080_30fps"), // Yacht sailing out of marina
      PX("19867146", "hd_1920_1080_30fps"), // White yacht in Haulover Bay, Miami
      PX("4115781", "hd_1920_1080_25fps"),  // Motor boat traversing open sea
    ],
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Yacht on the water at sunset",
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
