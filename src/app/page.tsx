import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SplitterIntro } from "@/components/splitter-intro";

// Splitter — three full-height columns. One image per vertical:
//   01 · Lamborghini → /cars
//   02 · overhead yacht → /boats
//   03 · private jet → /planes (coming soon)
//
// Default state is dim (bright copy reads cleanly over a darkened
// image). On hover the column lights up — the dim overlay drops, the
// caption nudges up, and a soft red glow appears on the eyebrow.
//
// On mobile the columns stack vertically; on desktop they live as a
// single 3-up row taking the full viewport height.

export const metadata: Metadata = {
  title: "RYDA — Luxury vehicle access",
  description:
    "Co-own or rent the world's most coveted luxury vehicles in the US. Cars · Boats · Planes. Member-managed Delaware LLCs, concierge operated.",
};

const VERTICALS = [
  {
    href: "/cars",
    eyebrow: "01",
    label: "Cars",
    tagline: "Co-own or rent the world's most exceptional cars.",
    bullet: "Live · Miami today",
    status: "live" as const,
    image:
      "https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=2400&q=85",
    imageAlt: "Lamborghini Aventador at night",
    imagePosition: "center 55%",
  },
  {
    href: "/boats",
    eyebrow: "02",
    label: "Boats",
    tagline: "Floating real estate, held in a Delaware LLC.",
    bullet: "Miami launch · Q3 2026",
    status: "live" as const,
    image:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=2400&q=85",
    imageAlt: "Overhead view of a yacht in turquoise water",
    imagePosition: "center",
  },
  {
    href: "/planes",
    eyebrow: "03",
    label: "Planes",
    tagline: "Fractional access to private aviation. In design.",
    bullet: "Coming soon",
    status: "coming-soon" as const,
    image:
      "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=2400&q=85",
    imageAlt: "Private jet on tarmac at dusk",
    imagePosition: "center 70%",
  },
];

export default function SplitterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-cream">
      <SplitterIntro />

      {/* Floating top bar — minimal, hovers over the images */}
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

      {/* Three columns. lg:flex makes them full-height side-by-side; on
          mobile they stack as 3 stacked images with their captions. */}
      <div className="flex min-h-screen flex-col lg:flex-row">
        {VERTICALS.map((v, i) => (
          <VerticalColumn key={v.href} v={v} index={i} />
        ))}
      </div>
    </main>
  );
}

function VerticalColumn({
  v,
  index,
}: {
  v: (typeof VERTICALS)[number];
  index: number;
}) {
  const isComingSoon = v.status === "coming-soon";
  return (
    <Link
      href={v.href}
      className="group relative flex min-h-[60vh] flex-1 items-end overflow-hidden border-cream/10 lg:min-h-screen lg:border-r last:lg:border-r-0"
      style={{
        // Stagger the fade-in past the splitter veil so the columns
        // animate in left-to-right.
        animationDelay: `${index * 120}ms`,
      }}
    >
      {/* Image — slightly desaturated/dimmed at rest, lights up on hover */}
      <Image
        src={v.image}
        alt={v.imageAlt}
        fill
        sizes="(min-width: 1024px) 33vw, 100vw"
        priority={index === 0}
        className="object-cover transition-all duration-700 ease-out [filter:brightness(0.55)_saturate(0.9)] group-hover:scale-[1.04] group-hover:[filter:brightness(0.95)_saturate(1.1)]"
        style={{ objectPosition: v.imagePosition }}
      />

      {/* Subtle dark gradient — heavier at bottom for caption legibility,
          lifts on hover for the lighten effect to read. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15 transition-opacity duration-700 group-hover:from-black/55 group-hover:via-black/15 group-hover:to-transparent"
      />

      {/* Subtle red glow on hover — only visible at the bottom, ties
          the column to the RYDA red without drowning the photo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-red/35 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
      />

      {/* Status pill, top */}
      <span
        className={`absolute right-5 top-24 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur transition-colors duration-300 sm:top-28 ${
          isComingSoon
            ? "border border-cream/40 text-cream/85 group-hover:border-cream group-hover:text-cream"
            : "bg-red/95 text-cream"
        }`}
      >
        {isComingSoon ? "Coming soon" : "Live"}
      </span>

      {/* Caption */}
      <div className="relative z-10 w-full p-7 text-cream sm:p-10 lg:p-12">
        <p className="font-display text-sm text-cream/55 transition-colors duration-300 group-hover:text-red">
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
