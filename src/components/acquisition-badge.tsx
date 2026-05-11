// AcquisitionBadge — surfaces the asset's acquisition lifecycle stage
// on the portfolio detail pages (cars + boats).
//
// Why this exists (audit Finding #5): we are pre-launch (Q3 2026
// Miami). The buy flow lets a member commit to a share of a vehicle
// that the LLC may not yet have under contract. We've moved the
// homepage off "Live · Miami" copy already; this component closes
// the loop on the listing pages by being explicit about which step
// of the acquisition pipeline each asset is in. That's both a trust
// signal (the buyer sees we're not pretending we already own it) and
// a marketing-safety guard (we don't accidentally suggest title has
// transferred when it hasn't).
//
// Design notes:
//   - Pill renders inline near the asset title. Single line, ≤30
//     chars in the label so it doesn't compete with the asset name.
//   - Color is subtle (cream + ink) for sourced/optioned to avoid
//     panicking buyers; uses positive marine for 'secured'; uses
//     amber for 'pending' (placeholder, still being curated).
//   - The 1-sentence detail (`copy.body`) is rendered as a small
//     muted line under the pill, NOT in a tooltip — a tooltip is
//     mobile-hostile + accessibility-hostile. The full sentence
//     plus optional per-asset `note` is always visible.
//
// All copy lives here so legal/marketing can tune one file.

import type { AcquisitionStatus } from "@/lib/market-data";

type Tone = {
  pill: string;     // tailwind for pill bg + text
  dot: string;      // tailwind for the leading dot color
};

type CopyBlock = {
  label: string;        // pill text, ≤30 chars
  body: string;         // 1-sentence what-it-means, always visible
  tone: Tone;
};

const COPY: Record<AcquisitionStatus, CopyBlock> = {
  pending: {
    label: "Pending curation",
    body: "Placeholder listing. RYDA is finalizing the spec, photography, and price; details may change before deposits open.",
    tone: {
      // Use the project's `gold` design-token rather than tailwind's
      // default amber palette — keeps visual identity consistent with
      // the rest of the surfaces (see globals.css @theme block).
      pill: "bg-cream-2 text-ink",
      dot: "bg-gold",
    },
  },
  sourced: {
    label: "Sourced",
    body: "RYDA has curated this asset spec and estimated market pricing. The specific unit, acquisition contract, and final pricing are confirmed once member commitments cross the deposit threshold; title transfers to the LLC at closing.",
    tone: {
      pill: "bg-cream-2 text-ink",
      dot: "bg-ink",
    },
  },
  optioned: {
    label: "Under option",
    body: "RYDA holds a refundable option on this specific unit while LLC formation and member commitments complete. Title transfers to the LLC at closing.",
    tone: {
      pill: "bg-cream-2 text-ink",
      dot: "bg-red",
    },
  },
  secured: {
    label: "Secured",
    body: "The LLC holds title and the asset is in RYDA storage, available for member use under the booking calendar.",
    tone: {
      // Bumped from bg-marine/10 to bg-marine/15 so 11px text-marine
      // hits AA contrast on dark theme too (codex round-1 caught
      // 4.49:1 on bg-marine/10, slightly under WCAG AA threshold).
      pill: "bg-marine/15 text-marine-deep",
      dot: "bg-marine",
    },
  },
};

// Centralizes the "undefined → sourced" fallback. Pre-launch we want
// every existing asset to read as 'sourced' unless explicitly tagged
// otherwise in the data file. Picking 'sourced' as the default
// (rather than 'pending') is deliberate: the existing fleet entries
// have real photos, real specs, and real prices — they're farther
// along than placeholder.
export function resolveAcquisitionStatus(
  raw: AcquisitionStatus | undefined,
): AcquisitionStatus {
  return raw ?? "sourced";
}

export function AcquisitionBadge({
  status,
  note,
  variant = "block",
}: {
  status: AcquisitionStatus | undefined;
  note?: string;
  // 'block' = stacked pill + sentence body, full block on the listing page
  // 'pill'  = just the pill, no sentence — for use in dense rows
  variant?: "block" | "pill";
}) {
  const resolved = resolveAcquisitionStatus(status);
  const copy = COPY[resolved];

  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${copy.tone.pill} px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider`}
        aria-label={`Acquisition status: ${copy.label}`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${copy.tone.dot}`} />
        {copy.label}
      </span>
    );
  }

  return (
    <div
      className="rounded-2xl border border-rule bg-surface p-5"
      role="region"
      aria-label="Acquisition status"
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full ${copy.tone.pill} px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider`}
        >
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${copy.tone.dot}`} />
          {copy.label}
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
          Acquisition status
        </p>
      </div>
      <p className="mt-3 text-sm text-ink-soft">{copy.body}</p>
      {note ? (
        <p className="mt-2 text-xs text-mute">
          <span className="font-medium text-ink">Note:</span> {note}
        </p>
      ) : null}
    </div>
  );
}
