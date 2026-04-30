// Media config — single source of truth for hero video + poster
// imagery across the site. Each vertical (cars, boats, planes) gets a
// stable Pexels CDN video URL and a fallback poster image.
//
// We hotlink Pexels because (1) their CDN is robust and stable for
// established videos, (2) we don't yet have brand-approved b-roll, and
// (3) the MediaBackground component falls back to the poster image if
// the video fails or is omitted, so a broken video URL never breaks
// the page. Swap these for owned-asset URLs when they're licensed.
//
// PHILOSOPHY: ambient motion only. Videos play muted, looped,
// autoplay, playsInline. No audio. No sticky-volume tricks. The
// experience should feel like watching a luxury showroom screen, not
// like an autoplay ad.

export type MediaSlot = {
  /** Direct video URL (mp4 preferred). Empty string = poster only. */
  video: string;
  /** Fallback poster image. Always required so SSR + bandwidth-aware clients render fine. */
  poster: string;
  /** Alt text for the poster image. */
  alt: string;
  /**
   * Optional CSS object-position override for awkwardly framed posters
   * (e.g. "center 65%" to bias toward the bottom of the image).
   */
  position?: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Vertical splitter media (the / page columns)
// ─────────────────────────────────────────────────────────────────────────

export const SPLITTER_MEDIA: Record<"cars" | "boats" | "planes", MediaSlot> = {
  cars: {
    // Lambo / supercar driving b-roll. Pexels ID 4434242.
    video:
      "https://videos.pexels.com/video-files/4434242/4434242-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=2400&q=85",
    alt: "Lamborghini at night",
    position: "center 55%",
  },
  boats: {
    // Aerial mega yacht in turquoise water. Pexels ID 1093662.
    video:
      "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=2400&q=85",
    alt: "Mega yacht in turquoise water from above",
    position: "center",
  },
  planes: {
    // Private jet ramp / tarmac. Pexels ID 2715418.
    video:
      "https://videos.pexels.com/video-files/2715418/2715418-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Private jet on tarmac at dusk",
    position: "center 70%",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Hero media — used on /cars hero, /boats hero, /markets hero, etc.
// Re-uses splitter posters where it makes sense; provides distinct
// editorial videos otherwise.
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
    video:
      "https://videos.pexels.com/video-files/2421545/2421545-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=85",
    alt: "Mega yacht at sunset on water",
  },
  "boats-portfolio": {
    video:
      "https://videos.pexels.com/video-files/2099595/2099595-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=2400&q=85",
    alt: "Aerial view of mega yacht in turquoise water",
  },
  planes: {
    video:
      "https://videos.pexels.com/video-files/2715418/2715418-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    alt: "Private jet on tarmac at dusk",
  },
};
