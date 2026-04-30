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
    // 7 supercar clips where the camera stays LOCKED on the car —
    // either interior/cockpit POV (guaranteed lock) or external
    // tracking shots that follow the vehicle. No clips that trail
    // off to landscape, road, or environment.
    videos: [
      PX("8443860", "hd_1920_1080_30fps"),  // Driver-side interior of red Ferrari, in motion
      PX("8443861", "hd_1920_1080_30fps"),  // Luxury sports car interior, driving
      PX("8443781", "hd_1920_1080_30fps"),  // Red Ferrari driver POV
      PX("5309345", "hd_1920_1080_25fps"),  // Man driving McLaren (interior)
      PX("7727416", "hd_1920_1080_25fps"),  // Lamborghini speeding (tracking shot, car centered)
      PX("16976173", "hd_1920_1080_24fps"), // Ferrari 458 in Zurich (tracking)
      PX("17051328", "hd_1920_1080_24fps"), // Lamborghini Aventador in Lisbon (tracking)
    ],
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Red Ferrari supercar",
    position: "center 30%",
  },
  boats: {
    // 5 SUPERYACHT clips — large luxury vessels only. Dropped the
    // generic motorboat tracking shots (4337674/4337675) that didn't
    // read as luxury. Every clip features a 100ft+ yacht.
    videos: [
      PX("14037403", "hd_1920_1080_30fps"), // White yacht sailing (aerial)
      PX("14037398", "hd_1920_1080_30fps"), // Drone aerial of white motor yacht along coastal city
      PX("13878618", "hd_1920_1080_30fps"), // Yacht sailing out of marina
      PX("19867146", "hd_1920_1080_30fps"), // White yacht in Haulover Bay, Miami
      PX("15288018", "hd_1920_1080_30fps"), // Drone video of luxury yacht docked at port
    ],
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Superyacht on the water at sunset",
    position: "center 50%",
  },
  planes: {
    // PRIVATE JETS only — Gulfstream/Bombardier/Citation-class
    // business jets. Dropped the commercial-airliner clips
    // (12086908 "Airplane landing over trees", 3678380 "Montreal
    // landing") that read as Boeing/Airbus.
    videos: [
      PX("13278455", "hd_1920_1080_30fps"), // Private jet landing at airport
      PX("13278451", "hd_1920_1080_30fps"), // Private jet landing at Prague airport
    ],
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
