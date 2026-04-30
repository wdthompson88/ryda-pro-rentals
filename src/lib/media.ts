// Media config — single source of truth for hero video + poster
// imagery across the site. Each vertical (cars, boats, planes) gets a
// poster image that's confirmed water-themed (boats) / vehicle-themed
// (cars, planes) and an OPTIONAL video URL.
//
// VIDEO STATUS: empty for now. Earlier we hotlinked Pexels CDN URLs
// for ambient b-roll, but the videos rendering at run time turned out
// not to match the descriptions (wrong content, parked rather than
// in-motion, or 404). Until brand-approved owned-asset videos are
// licensed and dropped into /public/, we keep the still posters with
// the slow Ken-Burns zoom — clean and reliable.
//
// To re-enable: drop your owned video files into /public/videos/ and
// set the `video` field below to /videos/<filename>.mp4. The
// MediaBackground component handles the rest (fades video in once
// playable; falls back to poster on error).

export type MediaSlot = {
  /** Direct video URL. Empty string = poster only (current default). */
  video: string;
  /** Fallback poster image. Always required. */
  poster: string;
  /** Alt text for the poster image. */
  alt: string;
  /** Optional CSS object-position override. */
  position?: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Splitter columns (the / page)
// ─────────────────────────────────────────────────────────────────────────
// Cars: action Lambo (poster). Boats: yacht in water. Planes: jet on
// tarmac. Videos disabled until owned assets are dropped in.

export const SPLITTER_MEDIA: Record<"cars" | "boats" | "planes", MediaSlot> = {
  cars: {
    video: "",
    poster:
      "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=2400&q=85",
    alt: "Lamborghini at night",
    position: "center 55%",
  },
  boats: {
    video: "",
    // Confirmed water-themed yacht photo (same one used on the Wajer
    // listing and across boat market hero panels).
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Yacht on the water at sunset",
    position: "center 50%",
  },
  planes: {
    video: "",
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Private jet on tarmac at dusk",
    position: "center 70%",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Hero media — used on cars-home, /boats, /markets, /boats/portfolio,
// /planes. All posters confirmed; videos can be added later via
// /public/videos/* once brand-approved.
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
    video: "",
    poster:
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=2400&q=85",
    alt: "Ferrari 296 GTB",
  },
  "cars-portfolio": {
    video: "",
    poster:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=85",
    alt: "Supercar at dusk",
  },
  "boats-home": {
    video: "",
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Yacht on the water at sunset",
  },
  "boats-portfolio": {
    video: "",
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Yacht on the water at sunset",
  },
  planes: {
    video: "",
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Private jet on tarmac at dusk",
  },
};
