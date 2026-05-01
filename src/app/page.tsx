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
    label: "Cars",
    tagline: "Co-own or rent the world's most exceptional cars.",
    bullet: "Live · Miami today",
    status: "live",
    media: SPLITTER_MEDIA.cars,
    accent: "red",
  },
  {
    href: "/boats",
    label: "Boats",
    tagline: "Floating real estate, held in a Delaware LLC.",
    bullet: "Miami launch · Q3 2026",
    status: "live",
    media: SPLITTER_MEDIA.boats,
    accent: "marine",
  },
  {
    href: "/planes",
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
    <main className="relative min-h-screen overflow-hidden bg-[#0E0E10] text-[#F4F1EC]">
      <SplitterIntro />

      {/* Floating top bar — minimal, hovers over the columns */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-[#F4F1EC]"
        >
          RYDA
        </Link>
        <p className="hidden text-[11px] font-medium uppercase tracking-[0.24em] text-[#F4F1EC]/55 sm:block">
          Luxury vehicle access
        </p>
        <Link
          href="/signin"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#F4F1EC]/55 hover:text-[#F4F1EC]"
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
      pill: "bg-red/95 text-[#F4F1EC]",
    },
    marine: {
      glow: "from-marine/40",
      eyebrowHover: "group-hover:text-marine",
      pill: "bg-marine/95 text-[#F4F1EC]",
    },
    neutral: {
      glow: "from-[#F4F1EC]/15",
      eyebrowHover: "group-hover:text-[#F4F1EC]",
      pill: "border border-[#F4F1EC]/40 text-[#F4F1EC]/85 group-hover:border-[#F4F1EC] group-hover:text-[#F4F1EC]",
    },
  }[v.accent];

  return (
    <Link
      href={v.href}
      className="group relative flex min-h-[60vh] flex-1 items-end overflow-hidden border-[#F4F1EC]/10 lg:min-h-screen lg:border-r last:lg:border-r-0"
    >
      {/* Media layer — random Pexels b-roll loop on top of poster.
          MediaBackground picks one clip from the videos array on
          mount, so each visit shows different footage. Default state
          is dimmed; hover brightens the whole column. */}
      <div className="absolute inset-0 transition-all duration-700 ease-out [filter:brightness(0.55)_saturate(0.9)] group-hover:scale-[1.02] group-hover:[filter:brightness(0.95)_saturate(1.1)]">
        <MediaBackground
          videos={v.media.videos}
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

      {/* Caption */}
      <div className="relative z-10 w-full p-7 text-[#F4F1EC] sm:p-10 lg:p-12">
        <p className={`font-display text-5xl font-light italic leading-[0.95] text-[#F4F1EC] transition-transform duration-700 group-hover:-translate-y-1 sm:text-6xl lg:text-7xl ${accentClasses.eyebrowHover}`}>
          {v.label}
        </p>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#F4F1EC]/85 sm:text-base">
          {v.tagline}
        </p>
        <div className="mt-7 flex items-center justify-between border-t border-[#F4F1EC]/20 pt-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#F4F1EC]/55">
            {v.bullet}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F4F1EC] transition-transform duration-300 group-hover:translate-x-1.5">
            Enter →
          </span>
        </div>
      </div>
    </Link>
  );
}
