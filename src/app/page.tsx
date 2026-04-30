import type { Metadata } from "next";
import Link from "next/link";
import { SplitterIntro } from "@/components/splitter-intro";
import { MediaBackground } from "@/components/media-background";
import { SPLITTER_MEDIA, type MediaSlot } from "@/lib/media";

// Splitter — three full-height columns. One ambient b-roll loop per
// vertical (Lambo / overhead yacht / private jet). Hover lights the
// column up via brightness/saturation lift + scale + red glow. On
// reduced-motion preference the videos are skipped and the poster
// images get a subtle Ken-Burns zoom instead.

export const metadata: Metadata = {
  title: "RYDA — Luxury vehicle access",
  description:
    "Co-own or rent the world's most coveted luxury vehicles in the US. Cars · Boats · Planes. Member-managed Delaware LLCs, concierge operated.",
};

type Accent = "red" | "marine" | "neutral";

type Vertical = {
  href: string;
  eyebrow: string;
  label: string;
  tagline: string;
  bullet: string;
  status: "live" | "coming-soon";
  media: MediaSlot;
  /** Per-vertical accent — cars use red, boats use marine, planes
   *  stay neutral until they ship. */
  accent: Accent;
};

const VERTICALS: Vertical[] = [
  {
    href: "/cars",
    eyebrow: "01",
    label: "Cars",
    tagline: "Co-own or rent the world's most exceptional cars.",
    bullet: "Live · Miami today",
    status: "live",
    media: SPLITTER_MEDIA.cars,
    accent: "red",
  },
  {
    href: "/boats",
    eyebrow: "02",
    label: "Boats",
    tagline: "Floating real estate, held in a Delaware LLC.",
    bullet: "Miami launch · Q3 2026",
    status: "live",
    media: SPLITTER_MEDIA.boats,
    accent: "marine",
  },
  {
    href: "/planes",
    eyebrow: "03",
    label: "Planes",
    tagline: "Fractional access to private aviation. In design.",
    bullet: "Coming soon",
    status: "coming-soon",
    media: SPLITTER_MEDIA.planes,
    accent: "neutral",
  },
];

export default function SplitterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-cream">
      <SplitterIntro />

      {/* Floating top bar — minimal, hovers over the columns */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-cream"
        >
          RYDA
        </Link>
        <p className="hidden text-[11px] font-medium uppercase tracking-[0.24em] text-cream/55 sm:block">
          Luxury vehicle access
        </p>
        <Link
          href="/signin"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-cream/55 hover:text-cream"
        >
          Sign in
        </Link>
      </div>

      <div className="flex min-h-screen flex-col lg:flex-row">
        {VERTICALS.map((v, i) => (
          <VerticalColumn key={v.href} v={v} index={i} />
        ))}
      </div>
    </main>
  );
}

function VerticalColumn({ v, index }: { v: Vertical; index: number }) {
  const isComingSoon = v.status === "coming-soon";

  // Per-vertical accent classes. Tailwind needs these spelled out
  // explicitly (no string interpolation) so the JIT can pick them up.
  const accentClasses = {
    red: {
      glow: "from-red/35",
      eyebrowHover: "group-hover:text-red",
      pill: "bg-red/95 text-cream",
    },
    marine: {
      glow: "from-marine/40",
      eyebrowHover: "group-hover:text-marine",
      pill: "bg-marine/95 text-cream",
    },
    neutral: {
      glow: "from-cream/15",
      eyebrowHover: "group-hover:text-cream",
      pill: "border border-cream/40 text-cream/85 group-hover:border-cream group-hover:text-cream",
    },
  }[v.accent];

  return (
    <Link
      href={v.href}
      className="group relative flex min-h-[60vh] flex-1 items-end overflow-hidden border-cream/10 lg:min-h-screen lg:border-r last:lg:border-r-0"
    >
      {/* Media layer — video b-roll on top of poster image. Default
          state is dimmed; hover brightens the whole column. */}
      <div className="absolute inset-0 transition-all duration-700 ease-out [filter:brightness(0.55)_saturate(0.9)] group-hover:scale-[1.02] group-hover:[filter:brightness(0.95)_saturate(1.1)]">
        <MediaBackground
          video={v.media.video}
          poster={v.media.poster}
          alt={v.media.alt}
          position={v.media.position}
          priority={index === 0}
          sizes="(min-width: 1024px) 33vw, 100vw"
          kenBurns={true}
        />
      </div>

      {/* Dark gradient — heavier at bottom for caption legibility */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15 transition-opacity duration-700 group-hover:from-black/55 group-hover:via-black/15 group-hover:to-transparent"
      />

      {/* Per-vertical accent glow at the bottom on hover */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t ${accentClasses.glow} to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100`}
      />

      {/* Status pill */}
      <span
        className={`absolute right-5 top-24 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur transition-colors duration-300 sm:top-28 ${accentClasses.pill}`}
      >
        {isComingSoon ? "Coming soon" : "Live"}
      </span>

      {/* Eyebrow */}
      <span className="absolute left-5 top-5 font-display text-sm text-cream/55">
        {v.eyebrow}
      </span>

      {/* Caption */}
      <div className="relative z-10 w-full p-7 text-cream sm:p-10 lg:p-12">
        <p className={`font-display text-sm text-cream/55 transition-colors duration-300 ${accentClasses.eyebrowHover}`}>
          {v.eyebrow}
        </p>
        <p className="mt-3 font-display text-5xl font-light italic leading-[0.95] text-cream transition-transform duration-700 group-hover:-translate-y-1 sm:text-6xl lg:text-7xl">
          {v.label}
        </p>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/85 sm:text-base">
          {v.tagline}
        </p>
        <div className="mt-7 flex items-center justify-between border-t border-cream/20 pt-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-cream/55">
            {v.bullet}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-cream transition-transform duration-300 group-hover:translate-x-1.5">
            Enter →
          </span>
        </div>
      </div>
    </Link>
  );
}
