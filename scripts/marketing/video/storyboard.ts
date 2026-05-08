// storyboard.ts — produces a 3-shot, 15-second storyboard for a
// car or boat spot. Each shot is 5 seconds. Text overlays are
// timed against the shots.
//
// Why this exists separately: the prompts that go to the AI video
// model determine 80% of the output quality. Hand-tuning per
// vehicle is the difference between "generic stock footage" and
// "this looks like a RYDA spot." Centralising the prompt logic
// here means one place to iterate on style.
//
// Spot template (proven by automotive industry, e.g. Porsche /
// Lamborghini / Riva b-roll):
//   Shot 1 (0-5s):   Hero exterior. Establishing. Static or slow push-in.
//   Shot 2 (5-10s):  Detail / interior / craft moment. Macro feel.
//   Shot 3 (10-15s): Kinetic. Driving for cars, on-the-water for boats.
//
// Text overlays land in the lower third:
//   0-5s:   <vehicle name>            (e.g. "458 Italia")
//   5-10s:  <hook>                    (e.g. "$32K for 1/10")
//   10-15s: <CTA>                     (e.g. "RYDA · Q3 launch")

export type VehicleType = "car" | "boat";

/** What kind of spot are we generating?
 *
 *   brand_broll:    Cinematic 3-shot, 5s each, silent. Captions
 *                   carry the educational lift. Cheap, beautiful,
 *                   but doesn't explain RYDA without a caption read.
 *                   Used for top-of-funnel vehicle b-roll.
 *
 *   conversion_vo:  Single 15-second clip with off-camera
 *                   voice-over baked in. The VO does the
 *                   educational lift so a sound-on viewer
 *                   understands RYDA without reading the caption.
 *                   Used when the spot has to convert (member
 *                   testimonials, launch announcement, paid
 *                   promotion).
 *
 * Different downstream pipelines: brand_broll uses 3-clip concat
 * via the FFmpeg composer; conversion_vo uses single-clip path
 * that preserves source audio + optionally ducks a music bed
 * underneath.
 */
export type SpotType = "brand_broll" | "conversion_vo";

export type SpotInput = {
  /** "car" or "boat". Drives the prompt template + Shot 3 motion. */
  vehicleType: VehicleType;
  /** Display name used in Shot 1 overlay. e.g. "458 Italia",
   *  "Riva Aquariva". Keep short — it's overlaid on video. */
  name: string;
  /** Year + make. e.g. "2014 Ferrari 458 Italia in Rosso Corsa
   *  with cream interior". Used in every shot prompt. */
  vehicleDescription: string;
  /** Setting for the spot. e.g. "Wynwood industrial garage at golden hour"
   *  for cars, "Miami Beach marina at sunrise" for boats. */
  setting: string;
  /** Text shown 5-10s on brand_broll spots. e.g. "1/10 share · $22,900".
   *  Keep under 24 chars. */
  hook: string;
  /** Text shown 10-15s on brand_broll spots. e.g. "RYDA · Q3 Miami launch".
   *  Keep under 32 chars. */
  cta: string;
  /** Optional override for Shot 2 detail. Default picks a generic
   *  "interior + dashboard" / "helm + brightwork" line per type. */
  detailOverride?: string;
  /** Default brand_broll. Pick conversion_vo when the spot has to
   *  carry the RYDA explainer in 15 sec without a caption read. */
  spotType?: SpotType;
};

export type Shot = {
  /** 1-3 for brand_broll's three 5-second shots, always 1 for
   *  conversion_vo's single 15-second shot. */
  index: 1 | 2 | 3;
  /** Seconds into the spot when this shot starts. */
  startSec: number;
  /** Shot duration. Default 5s. */
  durationSec: number;
  /** Prompt sent to the AI video model. */
  prompt: string;
  /** Text overlay during this shot (lower third). null = no text. */
  overlay: string | null;
};

/** Storyboard is a discriminated union: brand_broll = 3 separate
 *  shots, conversion_vo = a single combined shot whose prompt has
 *  voice-over instructions baked in. Common fields:
 *    - totalDurationSec: 15 always
 *    - vehicleType
 *    - caption: the post copy that ships alongside the video on
 *               IG / X. For brand_broll it carries the educational
 *               lift (since the video is silent); for conversion_vo
 *               it's secondary because the VO already explains. */
export type Storyboard =
  | {
      spotType: "brand_broll";
      totalDurationSec: 15;
      vehicleType: VehicleType;
      shots: [Shot, Shot, Shot];
      caption: string;
    }
  | {
      spotType: "conversion_vo";
      totalDurationSec: 15;
      vehicleType: VehicleType;
      /** A single shot covering the full 15s with VO embedded. */
      shots: [Shot];
      /** The voice-over script as plain text, separately stored
       *  for use cases like recording in ElevenLabs or sending to
       *  a human VO artist. The same VO is also embedded inside
       *  shots[0].prompt as a "VOICE-OVER" instruction. */
      voScript: string;
      caption: string;
    };

// Style preamble baked into every shot's prompt. Pushes the model
// toward editorial photo-real instead of CGI / illustration. The
// "no" list is what the model should NOT do; Sora and Runway both
// respect negative-style hints in plain English.
const SHOT_STYLE = `
Style: cinematic editorial commercial. 35mm film aesthetic, natural light,
shallow depth of field, restrained color grade.
No CGI look, no fake reflections, no lens flares, no rapid camera shake,
no on-screen text, no watermarks, no stock-footage feel.
`.trim();

function defaultDetail(type: VehicleType, vehicleDescription: string): string {
  if (type === "car") {
    return `Macro shot of the interior of ${vehicleDescription}: hands on the steering wheel, gear shifter, instrument cluster lit. Soft daylight through the side window. Slow lens drift across the leather and metal.`;
  }
  return `Macro shot of the helm of ${vehicleDescription}: hands on the wheel, brightwork and gauges in soft morning light. Slow drift across teak decking and chrome fittings.`;
}

function shot1HeroPrompt(input: SpotInput): string {
  if (input.vehicleType === "car") {
    return `Cinematic hero shot of ${input.vehicleDescription} parked in ${input.setting}. Slow push-in from a 3/4 front angle, 50mm lens equivalent. Soft directional light, single car visible, no people in frame. ${SHOT_STYLE}`;
  }
  return `Cinematic hero shot of ${input.vehicleDescription} moored in ${input.setting}. Slow drone push-in from above the bow at low altitude. Calm water, single boat visible, no people in frame. ${SHOT_STYLE}`;
}

function shot3KineticPrompt(input: SpotInput): string {
  if (input.vehicleType === "car") {
    return `Tracking shot of ${input.vehicleDescription} driving on a coastal road at golden hour. Camera mounted at the rear quarter panel, panning to follow the car as it accelerates away. Engine sound implied, no music. ${SHOT_STYLE}`;
  }
  return `Tracking shot of ${input.vehicleDescription} underway on open water at golden hour. Camera mounted on a follow boat, capturing the wake and the boat from the rear quarter. Spray visible, calm sea. ${SHOT_STYLE}`;
}

/** Compose the post caption. 3-paragraph structure tuned for IG +
 *  X: hook line → what-we-are paragraph → call-to-action. Stays
 *  under 220 chars before the dash so IG doesn't truncate above
 *  the fold. */
function buildCaption(input: SpotInput): string {
  // Hook line: vehicle + share economics. Front-loaded for the
  // viewer who scans without expanding.
  const hook = `${input.name} — ${input.hook}.`;

  // What-we-are: the educational beat. Different language for
  // cars vs boats. Boats program is forward-look so the language
  // is softer.
  const explainer =
    input.vehicleType === "car"
      ? `Real shared ownership. Single-purpose LLC, you're on the title. Storage, insurance, ops, and exit handled. Member-managed governance, no club, no subscription.`
      : `Member-owned, member-managed. Single-purpose LLC per asset, full transparency on ops + exit. Boat program rolling out alongside the car launch.`;

  // CTA: brand + when + where to act.
  const cta = `RYDA. Q3 2026 Miami launch. Apply at ryda.pro.`;

  return `${hook}\n\n${explainer}\n\n${cta}`;
}

/** Generate the off-camera narration script for a conversion spot.
 *  ~25-30 words to fit comfortably in 12-13 seconds at conversational
 *  pace. Cars + boats get different scripts.
 *
 *  Cars: lead with price, hit the four trust signals (real title,
 *  LLC, no club, no subscription), close with brand + when + URL.
 *
 *  Legal-safer phrasing: "buys a one-tenth share of" not "owns
 *  one-tenth of" — the share is in the LLC that owns the car,
 *  not the chassis itself. */
export function buildVoScript(input: SpotInput): string {
  if (input.vehicleType === "car") {
    // Pull the share price out of the hook string for natural
    // narration. Hook format: "1/10 share · $22,900".
    const priceMatch = input.hook.match(/\$([0-9,]+)/);
    const priceWords = priceMatch
      ? formatPriceForVo(priceMatch[1])
      : "This amount";
    return `${capitalize(priceWords)} buys a one-tenth share of this ${input.name}. Real title. Single-purpose LLC. No club, no subscription. RYDA launches in Miami Q3. Apply at ryda.pro.`;
  }
  return `RYDA's boat program is coming Q4. Member-owned ${input.name}. Single-purpose LLC, full transparency on ops and exit. Apply at ryda.pro.`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Convert "$22,900" -> "Twenty-two thousand nine hundred dollars".
 *  Voice models read digits poorly; spelling out leads to cleaner
 *  TTS output. Falls back to the digit form if parsing fails. */
function formatPriceForVo(digits: string): string {
  const n = parseInt(digits.replace(/,/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return `${digits} dollars`;
  return `${spellOutNumber(n)} dollars`;
}

/** Tiny number-to-words for prices up to $999,999. Sufficient for
 *  every share price in LAUNCH_INVENTORY. */
function spellOutNumber(n: number): string {
  const ones = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const under100 = (x: number): string => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const o = x % 10;
    return o === 0 ? tens[t] : `${tens[t]}-${ones[o]}`;
  };
  const under1000 = (x: number): string => {
    if (x < 100) return under100(x);
    const h = Math.floor(x / 100);
    const r = x % 100;
    return r === 0
      ? `${ones[h]} hundred`
      : `${ones[h]} hundred ${under100(r)}`;
  };
  if (n < 1000) return under1000(n);
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    const kPart = `${under1000(k)} thousand`;
    return r === 0 ? kPart : `${kPart} ${under1000(r)}`;
  }
  // Fallback for numbers we don't expect in inventory.
  return String(n);
}

/** Build the single 15-second prompt for a conversion_vo spot. The
 *  VO is embedded inline so Seedance/Dreamina's voice-control
 *  feature renders it. The "OFF-CAMERA NARRATION ONLY" line is
 *  important — without it the model sometimes inserts a visible
 *  presenter character speaking the lines.
 *
 *  Three implied beats inside the single shot, paced so the VO
 *  has room to land each one. */
function buildConversionVoPrompt(input: SpotInput): string {
  const voScript = buildVoScript(input);

  if (input.vehicleType === "car") {
    return `15-second cinematic commercial for RYDA, a Miami fractional luxury vehicle co-ownership platform.

OFF-CAMERA NARRATION ONLY. No visible speaker, no lips, no presenter.
Male American voice, calm and confident, age 30s:
"${voScript}"

VISUAL — three implied beats, smooth cuts, ~5 seconds each:

BEAT 1 (0-5s): Hero exterior. ${input.vehicleDescription} parked in ${input.setting}. Slow push-in from a 3/4 front angle, 50mm lens equivalent. Soft directional light, no people in frame.

BEAT 2 (5-10s): Close detail of the cockpit — steering wheel, gear selector, instrument cluster softly lit, leather and metal in shallow focus. No driver, no hands.

BEAT 3 (10-15s): Tracking shot of the car driving away on a coastal road at golden hour. Camera at the rear quarter panel, panning to follow as it accelerates. Tail lights warm against the light.

AUDIO: subtle engine purr in the background, ambient ocean breeze. Voice-over sits cleanly above the engine — no music bed (added in post if desired).

Style: cinematic editorial commercial. 35mm film aesthetic, natural light, shallow depth of field, restrained color grade. No CGI feel, no lens flares, no rapid camera shake, no on-screen text or watermarks (text overlays added in post).`;
  }

  // Boat variant
  return `15-second cinematic commercial for RYDA's boat program (Q4 2026 launch).

OFF-CAMERA NARRATION ONLY. No visible speaker, no lips, no presenter.
Male American voice, calm and confident, age 30s:
"${voScript}"

VISUAL — three implied beats, smooth cuts, ~5 seconds each:

BEAT 1 (0-5s): Hero shot of ${input.vehicleDescription} moored in ${input.setting}. Slow drone push-in from above the bow at low altitude. Calm water, no people.

BEAT 2 (5-10s): Close detail of the helm — wheel, gauges, brightwork, teak decking. Soft morning light, no captain visible.

BEAT 3 (10-15s): Tracking shot underway on open water at golden hour. Camera on a follow boat, capturing the wake and the rear quarter. Spray visible.

AUDIO: low engine rumble, water against the hull. Voice-over clean above ambient sound.

Style: cinematic editorial commercial. 35mm film aesthetic, natural light, restrained color grade. No CGI feel, no lens flares, no rapid camera shake, no on-screen text or watermarks.`;
}

export function buildStoryboard(input: SpotInput): Storyboard {
  const spotType: SpotType = input.spotType ?? "brand_broll";

  if (spotType === "conversion_vo") {
    return {
      spotType: "conversion_vo",
      totalDurationSec: 15,
      vehicleType: input.vehicleType,
      shots: [
        {
          index: 1,
          startSec: 0,
          durationSec: 15,
          prompt: buildConversionVoPrompt(input),
          // One small overlay at the end so the URL is visible to
          // sound-off viewers. The VO is doing the educational
          // work; this is just a confirmation/safety net.
          overlay: "RYDA · ryda.pro",
        },
      ],
      voScript: buildVoScript(input),
      caption: buildCaption(input),
    };
  }

  // brand_broll (default)
  const detailPrompt =
    input.detailOverride ?? defaultDetail(input.vehicleType, input.vehicleDescription);

  return {
    spotType: "brand_broll",
    totalDurationSec: 15,
    vehicleType: input.vehicleType,
    shots: [
      {
        index: 1,
        startSec: 0,
        durationSec: 5,
        prompt: shot1HeroPrompt(input),
        overlay: input.name,
      },
      {
        index: 2,
        startSec: 5,
        durationSec: 5,
        prompt: `${detailPrompt} ${SHOT_STYLE}`,
        overlay: input.hook,
      },
      {
        index: 3,
        startSec: 10,
        durationSec: 5,
        prompt: shot3KineticPrompt(input),
        overlay: input.cta,
      },
    ],
    caption: buildCaption(input),
  };
}

/** Pre-built storyboards for the launch inventory.
 *
 *  Overlay strategy (each overlay must do work in 5 sec of screen time):
 *    Shot 1 — `name`:  identify the asset. The hero shot is the
 *                      visual sell; the overlay just confirms what
 *                      they're seeing.
 *    Shot 2 — `hook`:  explain the model. Always cost + "1/10 share"
 *                      so a viewer who scrolls in mid-spot still
 *                      gets the fractional-ownership concept.
 *    Shot 3 — `cta`:   brand + when. Always mentions "RYDA" and
 *                      "Q3 2026 Miami" so the spot terminates with
 *                      a clear way to learn more, not a feature
 *                      detail. (The richer "what is RYDA" lift
 *                      happens in the caption, not the overlay.)
 *
 *  Caption strategy: the post caption (auto-generated from these
 *  fields by buildStoryboard) carries the educational copy that
 *  doesn't fit on a 15-second video — what RYDA is, why fractional
 *  ownership matters, where to learn more. */
export const LAUNCH_INVENTORY: SpotInput[] = [
  {
    vehicleType: "car",
    name: "458 Italia",
    vehicleDescription:
      "2014 Ferrari 458 Italia in Rosso Corsa with cream leather interior",
    setting: "a sunlit Wynwood industrial garage with polished concrete floor",
    hook: "1/10 share · $32,000",
    cta: "RYDA · Q3 Miami launch",
  },
  {
    vehicleType: "car",
    name: "GT3 RS",
    vehicleDescription:
      "2023 Porsche 911 GT3 RS in matte grey with the swan-neck rear wing",
    setting: "a Miami industrial garage with fluorescent overheads at night",
    hook: "1/10 share · $37,500",
    cta: "RYDA · Q3 Miami launch",
  },
  {
    vehicleType: "car",
    name: "Lamborghini Urus",
    vehicleDescription:
      "2023 Lamborghini Urus in Grigio Lynx with black wheels and red brake calipers",
    setting: "a Miami beach causeway at sunset, palm shadows on the body",
    hook: "1/10 share · $16,100",
    cta: "RYDA · Q3 Miami launch",
  },
  {
    vehicleType: "car",
    name: "Huracán Spyder",
    vehicleDescription:
      "2020 Lamborghini Huracán EVO Spyder in Nero Noctis with red interior",
    setting: "Miami's MacArthur Causeway at golden hour, top down",
    hook: "1/10 share · $22,900",
    cta: "RYDA · Q3 Miami launch",
  },
  {
    vehicleType: "car",
    name: "Corvette Z06",
    vehicleDescription:
      "2023 Chevrolet Corvette Z06 in Hypersonic Grey with carbon-fiber wing",
    setting: "a Miami industrial garage with morning sun through skylights",
    hook: "1/10 share · $10,500",
    cta: "RYDA · Q3 Miami launch",
  },
  {
    vehicleType: "car",
    name: "911 Carrera",
    vehicleDescription:
      "2024 Porsche 911 Carrera in GT Silver Metallic with black wheels",
    setting: "Wynwood arts district, brick wall behind, late afternoon light",
    hook: "1/10 share · $13,200",
    cta: "RYDA · Q3 Miami launch",
  },
  // Boat templates — kept ready for when boats ship. Hooks are
  // placeholders; replace with real share economics when announced.
  {
    vehicleType: "boat",
    name: "Riva Aquariva",
    vehicleDescription:
      "Riva Aquariva Super 33ft mahogany runabout, classic Riva curves",
    setting: "Miami Beach marina at sunrise, calm water, no other boats",
    hook: "Member-owned · Q4 2026",
    cta: "RYDA boats · soon",
  },
  {
    vehicleType: "boat",
    name: "Axopar 37",
    vehicleDescription:
      "Axopar 37 Sun Top in Ice Grey with twin Mercury 350 outboards",
    setting: "Biscayne Bay at golden hour, light chop on the water",
    hook: "Member-owned · Q4 2026",
    cta: "RYDA boats · soon",
  },
];

/** Pick today's vehicle deterministically from the inventory so the
 *  same machine running the script multiple times in a day picks
 *  the same vehicle (idempotent). Day-of-year mod inventory length. */
export function pickTodaysVehicle(now: Date = new Date()): SpotInput {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return LAUNCH_INVENTORY[dayOfYear % LAUNCH_INVENTORY.length];
}
