import type { Metadata } from "next";
import Link from "next/link";
import { SplitterIntro } from "@/components/splitter-intro";
import { MediaBackground } from "@/components/media-background";
import { SPLITTER_MEDIA, type MediaSlot } from "@/lib/media";
import { AuthSwap } from "@/components/auth-aware";
import { RevealStagger, Reveal } from "@/components/reveal";
import { BrandMarquee } from "@/components/brand-marquee";

// Splitter, three full-height columns. One ambient b-roll loop per
// vertical (Lambo / overhead yacht / private jet). Hover lights the
// column up via brightness/saturation lift + scale + red glow. On
// reduced-motion preference the videos are skipped and the poster
// images get a subtle Ken-Burns zoom instead.
//
// Columns stagger-in via framer-motion as the splitter veil dismisses.
// Below the splitter sits a single editorial band — founder voice,
// member criteria, soft cross-links to /about and /inside. This is the
// only scroll content on /; the splitter remains the page's signature.

export const metadata: Metadata = {
  title: "RYDA — Luxury vehicle access",
  description:
    "Co-own or rent the world's most coveted luxury vehicles in the US. Cars · Boats · Planes. Member-managed LLCs, professionally operated.",
};

type Accent = "red" | "marine" | "neutral";

type Vertical = {
  href: string;
  label: string;
  tagline: string;
  bullet: string;
  /** Status pill copy. "live" = operational; "early" = site live but ops
   *  start at a future date (members can join the member cohort now);
   *  "coming-soon" = in design, not capturing serious leads. */
  status: "live" | "early" | "coming-soon";
  pillLabel: string;
  media: MediaSlot;
  /** Per-vertical accent, cars use red, boats use marine, planes
   *  stay neutral until they ship. */
  accent: Accent;
};

const VERTICALS: Vertical[] = [
  {
    href: "/cars",
    label: "Cars",
    tagline: "The road, without limits.",
    bullet: "Live · Miami today",
    status: "live",
    pillLabel: "Live",
    media: SPLITTER_MEDIA.cars,
    accent: "red",
  },
  {
    href: "/boats",
    label: "Boats",
    tagline: "The sea, where the horizon opens.",
    bullet: "Live · Miami Q3 2026",
    status: "live",
    pillLabel: "Live",
    media: SPLITTER_MEDIA.boats,
    accent: "marine",
  },
  {
    href: "/planes",
    label: "Planes",
    tagline: "The sky, within reach.",
    bullet: "Coming soon",
    status: "coming-soon",
    pillLabel: "Coming soon",
    media: SPLITTER_MEDIA.planes,
    accent: "neutral",
  },
];

export default function SplitterPage() {
  return (
    <>
    <div className="relative min-h-screen overflow-hidden bg-[#0E0E10] text-[#F4F1EC]">
      <SplitterIntro />

      {/* Floating top bar, minimal, hovers over the columns. 3-column
          grid so "Luxury vehicle access" is truly centered on the page,
          not just floated between unequal-width left/right groups. */}
      <div className="absolute inset-x-0 top-0 z-30 grid grid-cols-3 items-center px-6 py-6 sm:px-10 sm:py-8">
        <Link
          href="/"
          className="justify-self-start font-display text-2xl tracking-tight text-[#F4F1EC]"
        >
          RYDA
        </Link>
        <p className="hidden justify-self-center text-sm font-medium uppercase tracking-[0.32em] text-[#F4F1EC]/75 sm:block">
          Luxury vehicle access
        </p>
        <div className="flex items-center justify-self-end gap-3 sm:gap-4">
          <Link
            href="/investors"
            className="hidden text-sm font-medium uppercase tracking-[0.18em] text-[#F4F1EC]/75 transition-colors hover:text-[#F4F1EC] lg:inline-block"
          >
            Investors
          </Link>
          {/* Paired auth CTAs in the splitter top bar. Anon members see
              Log in (soft cream-on-ink outline) next to Sign up (solid
              cream). Signed-in members see a single "Account" button
              that takes the Sign-up slot's styling. */}
          <AuthSwap
            anon={
              <>
                <Link
                  href="/signin"
                  className="hidden rounded-full border border-[#F4F1EC]/30 bg-[#F4F1EC]/10 px-5 py-2 text-sm font-medium text-[#F4F1EC] transition-colors hover:bg-[#F4F1EC] hover:text-[#0E0E10] sm:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex rounded-full border border-[#F4F1EC] bg-[#F4F1EC] px-5 py-2 text-sm font-medium text-[#0E0E10] transition-colors hover:bg-red hover:text-[#F4F1EC] hover:border-red"
                >
                  Sign up
                </Link>
              </>
            }
            authed={
              <Link
                href="/account"
                className="inline-flex rounded-full border border-[#F4F1EC] bg-[#F4F1EC] px-5 py-2 text-sm font-medium text-[#0E0E10] transition-colors hover:bg-red hover:text-[#F4F1EC] hover:border-red"
              >
                Account
              </Link>
            }
          />
        </div>
      </div>

      {/* Columns stagger-in as the splitter veil dismisses. RevealStagger
          fires immediately on mount because the columns are already in
          the viewport — `whileInView` resolves true on first paint. The
          ~80ms cascade gives Cars → Boats → Planes a left-to-right
          reveal that mirrors how the eye scans the page. */}
      <RevealStagger
        as="div"
        className="flex min-h-screen flex-col lg:flex-row"
        staggerMs={80}
        initialDelayMs={150}
        distance={20}
        durationMs={750}
      >
        {VERTICALS.map((v, i) => (
          <VerticalColumn key={v.href} v={v} index={i} />
        ))}
      </RevealStagger>
    </div>

    <BelowFoldEditorial />
    </>
  );
}

function VerticalColumn({ v, index }: { v: Vertical; index: number }) {

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
      {/* Media layer, random Pexels b-roll loop on top of poster.
          MediaBackground picks one clip from the videos array on
          mount, so each visit shows different footage. Default state
          is dimmed; hover brightens the whole column. */}
      <div className="absolute inset-0 transition-all duration-700 ease-out [filter:brightness(0.7)_saturate(0.92)] group-hover:scale-[1.02] group-hover:[filter:brightness(0.92)_saturate(1.08)]">
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

      {/* Dark gradient, heavier at bottom for caption legibility */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15 transition-opacity duration-700 group-hover:from-black/55 group-hover:via-black/15 group-hover:to-transparent"
      />

      {/* Per-vertical accent glow at the bottom on hover */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t ${accentClasses.glow} to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100`}
      />

      {/* Status pill, "Live" uses the vertical accent (red for cars).
          "Coming soon" verticals (boats + planes) use the same neutral
          outlined style so they read consistently as "not open yet"
          rather than a solid blue button that suggests an action. */}
      <span
        className={`absolute right-5 top-24 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur transition-colors duration-300 sm:top-28 ${
          v.status === "coming-soon"
            ? "border border-[#F4F1EC]/40 text-[#F4F1EC]/85 group-hover:border-[#F4F1EC] group-hover:text-[#F4F1EC]"
            : accentClasses.pill
        }`}
      >
        {v.pillLabel}
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

// One editorial band below the splitter. Three jobs:
//   1. Anchor the brand voice — pull-quote from Ryan's founder note
//      (same paragraph that opens /about's founder letter, lightly
//      compressed) so the very first words a scroller reads are the
//      same words the about page speaks in.
//   2. Telegraph member criteria — four short specs so a serious
//      visitor can self-qualify without clicking through. We don't sell
//      from this band; it's a filter, not a funnel.
//   3. Hand off — soft links into /about (full founder letter) and
//      /inside (sample member view). No "Sign up" CTA on the homepage;
//      that lives in the splitter top bar already.
//
// Single section, ~70vh on desktop. Cream surface so it visually breaks
// from the dark splitter. RevealStagger on the criteria grid so each
// spec arrives in sequence as the visitor scrolls into it.
function BelowFoldEditorial() {
  const criteria: { label: string; value: string }[] = [
    { label: "Age", value: "28 or older" },
    { label: "License", value: "Valid US driver's license, clean recent record" },
    { label: "Minimum stake", value: "2 shares per member" },
    { label: "Verification", value: "Identity check before any wire" },
  ];

  return (
    <section className="border-t border-rule bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left column: pull-quote in the founder's voice. */}
          <Reveal as="div" className="lg:col-span-7">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              From the founders
            </p>
            <p className="mt-6 font-display text-3xl font-light leading-[1.15] text-ink sm:text-4xl">
              <span className="italic">&ldquo;Buying outright sits idle.</span>{" "}
              <span className="italic">Renting is hollow.</span>{" "}
              Co-ownership is the third option — a real stake in a real
              car, professionally operated, with a clean LLC underneath.&rdquo;
            </p>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-mute">
              Ryan Galli · Co-founder, RYDA
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 font-medium text-ink underline-offset-4 hover:text-red hover:underline"
              >
                Read the founder&apos;s notes
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/inside"
                className="inline-flex items-center gap-2 font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                See what members see
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>

          {/* Right column: member criteria as a small spec grid. Not a
              feature list — a filter. Anyone who can't tick all four
              shouldn't apply, and we'd rather they self-select out
              here than waste a sales cycle. */}
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                Membership criteria
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                A short filter so you can self-qualify before you reach
                out. RYDA is a 100-member founding cohort, not an
                open-signup platform.
              </p>
            </Reveal>
            <RevealStagger
              as="div"
              className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2"
              staggerMs={80}
              distance={12}
            >
              {criteria.map((c) => (
                <div
                  key={c.label}
                  className="bg-surface p-5"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                    {c.label}
                  </p>
                  <p className="mt-2 text-sm leading-snug text-ink">
                    {c.value}
                  </p>
                </div>
              ))}
            </RevealStagger>
          </div>
        </div>

        {/* Quiet curation strip beneath the editorial. Wordmarks, not
            logos — luxury houses signal taste through letterforms,
            not third-party marks. The marquee is incidental, almost
            decorative; it sits behind the editorial weight above and
            answers an unstated question ("which marques?") without
            shouting it. */}
        <div className="mt-16 border-t border-rule pt-12 sm:mt-20 sm:pt-14">
          <Reveal>
            <BrandMarquee
              eyebrow="Curated from"
              items={[
                "Ferrari",
                "Lamborghini",
                "Porsche",
                "McLaren",
                "Aston Martin",
                "Wajer",
                "Pershing",
                "Riva",
              ]}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
