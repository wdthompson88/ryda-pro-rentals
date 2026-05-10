"use client";

import { useState } from "react";
import Link from "next/link";

const PHOTO_SHOTS = [
  "Front 3/4 driver side",
  "Front 3/4 passenger side",
  "Rear 3/4 driver side",
  "Rear 3/4 passenger side",
  "Driver side full",
  "Passenger side full",
  "Front straight-on",
  "Rear straight-on",
  "Interior dashboard",
  "Interior driver seat",
  "Interior passenger seat",
  "Interior rear seats",
  "Trunk / cargo",
  "Odometer (clear reading)",
  "Fuel / charge gauge",
];

type Stage = "intro" | "photos" | "condition" | "signoff" | "done";

export type HandoverSubmitInput = {
  type: "checkin" | "return";
  odometerMiles: number;
  fuelLevelPct: number;
  conditionGood: boolean;
  conditionNotes: string;
  photosTakenCount: number;
  memberSignedName: string;
};

export function HandoverFlow({
  variant,
  bookingId,
  vehicleName,
  onSubmit,
}: {
  variant: "checkin" | "return";
  bookingId: string;
  vehicleName: string;
  // When the member confirms sign-off, fires with the captured data.
  // The page-level wrapper translates this to a POST against the
  // /api/bookings/[id]/handover route + redirects on success.
  // If undefined (e.g., the static-param demo render path), the
  // flow still runs locally but doesn't persist.
  onSubmit?: (input: HandoverSubmitInput) => Promise<void> | void;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [conditionGood, setConditionGood] = useState<boolean | null>(null);
  const [conditionNotes, setConditionNotes] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelPct, setFuelPct] = useState("");
  const [signedName, setSignedName] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const isCheckin = variant === "checkin";
  const titleVerb = isCheckin ? "Pickup" : "Return";

  return (
    <section className="mx-auto max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
      <Link
        href="/bookings"
        className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
      >
        ← Bookings
      </Link>

      <p className="mt-6 text-xs text-mute">
        Booking {bookingId} · {vehicleName}
      </p>
      <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
        {stage === "done" ? "All done." : `${titleVerb} checklist.`}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {isCheckin
          ? "Document the vehicle's condition before you drive. Takes ~3 minutes."
          : "Document the vehicle's condition before handover. Takes ~3 minutes."}
      </p>

      <div className="mt-10 rounded-2xl border border-rule bg-surface p-8 sm:p-10">
        {/* Intro */}
        {stage === "intro" && (
          <div>
            <h2 className="font-display text-2xl text-ink">What to expect</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Three quick steps. Your protection plan requires this.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <Bullet n="1" t="Photo set" d={`${PHOTO_SHOTS.length} required photos. Tap each spot, follow the on-screen guide.`} />
              <Bullet n="2" t="Condition declaration" d="Anything visibly different from the last inspection? Yes/No, with optional photo." />
              <Bullet n="3" t="Digital sign-off" d="Confirm everything looks right. RYDA receives your photos in real time." />
            </ul>
            <button
              onClick={() => setStage("photos")}
              className="mt-10 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Start →
            </button>
          </div>
        )}

        {/* Photos */}
        {stage === "photos" && (
          <div>
            <h2 className="font-display text-2xl text-ink">
              Photos · {completed.size} of {PHOTO_SHOTS.length}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PHOTO_SHOTS.map((shot, i) => {
                const done = completed.has(i);
                return (
                  <button
                    key={i}
                    onClick={() =>
                      setCompleted((s) => {
                        const n = new Set(s);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      })
                    }
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      done
                        ? "border-red bg-red/5"
                        : "border-rule bg-cream hover:border-ink-soft"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        done ? "bg-red text-cream" : "border border-rule text-mute"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="text-sm text-ink">{shot}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStage("intro")}
                className="h-12 rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
              >
                ← Back
              </button>
              <button
                onClick={() => setStage("condition")}
                disabled={completed.size < PHOTO_SHOTS.length}
                className="h-12 flex-1 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {completed.size < PHOTO_SHOTS.length
                  ? `${PHOTO_SHOTS.length - completed.size} photos remaining`
                  : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* Condition declaration */}
        {stage === "condition" && (
          <div>
            <h2 className="font-display text-2xl text-ink">Condition declaration</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Anything visibly different from the last inspection report?
              We checked it Apr 20, small stone-chip on lower bumper noted.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => setConditionGood(true)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  conditionGood === true
                    ? "border-red bg-red/5"
                    : "border-rule bg-cream hover:border-ink-soft"
                }`}
              >
                <p className="font-display text-lg text-ink">Matches the last report</p>
                <p className="mt-1 text-xs text-ink-soft">No new damage I can see.</p>
              </button>
              <button
                onClick={() => setConditionGood(false)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  conditionGood === false
                    ? "border-red bg-red/5"
                    : "border-rule bg-cream hover:border-ink-soft"
                }`}
              >
                <p className="font-display text-lg text-ink">Something is different</p>
                <p className="mt-1 text-xs text-ink-soft">I see new damage or wear.</p>
              </button>
            </div>

            {conditionGood === false && (
              <div className="mt-6 rounded-xl border border-red/30 bg-red/5 p-5">
                <label className="block text-xs font-medium uppercase tracking-wider text-red">
                  Describe what&apos;s different
                </label>
                <textarea
                  rows={3}
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                  placeholder="Small scuff on the rear-left wheel that wasn't on the Apr 20 report..."
                />
                <p className="mt-2 text-[11px] text-mute">
                  Photos here in v2 — for now describe in detail and add
                  via the in-app chat after sign-off. Ops will reconcile.
                </p>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-mute">
                  {isCheckin ? "Mileage at pickup" : "Mileage at return"}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="2,140"
                  className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-mute">
                  Fuel level (%)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={fuelPct}
                  onChange={(e) => setFuelPct(e.target.value)}
                  placeholder="100"
                  className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStage("photos")}
                className="h-12 rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
              >
                ← Back
              </button>
              <button
                onClick={() => setStage("signoff")}
                disabled={
                  conditionGood === null ||
                  mileage.trim().length === 0 ||
                  fuelPct.trim().length === 0
                }
                className="h-12 flex-1 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Sign-off */}
        {stage === "signoff" && (
          <div>
            <h2 className="font-display text-2xl text-ink">Sign-off</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {isCheckin
                ? "By signing, you confirm the vehicle was received in the condition above. RYDA receives your photos and condition declaration in real time."
                : "By signing, you confirm the vehicle was returned in the condition above. RYDA's team will inspect within 24h and post the final report."}
            </p>

            {/* Typed-name signature for v1. Drawn-signature capture
                (canvas + touch) is a follow-up; the typed name stamped
                with a server-side timestamp is the same legal weight
                under E-SIGN as a drawn one for this purpose. */}
            <div className="mt-8">
              <label className="block text-xs font-medium uppercase tracking-wider text-mute">
                Type your full legal name to sign
              </label>
              <input
                type="text"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Full name as it appears on your driver's license"
                className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
              />
            </div>

            <label className="mt-6 flex items-start gap-3 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-0.5 accent-red"
              />
              <span>
                I confirm vehicle{" "}
                {isCheckin ? "received" : "returned"} in the condition above.
              </span>
            </label>

            {submitErr && (
              <p className="mt-4 text-xs text-red">{submitErr}</p>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStage("condition")}
                disabled={submitting}
                className="h-12 rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={async () => {
                  if (
                    !signedName.trim() ||
                    !confirmChecked ||
                    !mileage ||
                    !fuelPct ||
                    conditionGood === null
                  ) {
                    setSubmitErr(
                      "Sign your name and check the confirmation box to continue.",
                    );
                    return;
                  }
                  setSubmitErr(null);
                  if (onSubmit) {
                    setSubmitting(true);
                    try {
                      await onSubmit({
                        type: variant,
                        odometerMiles: parseInt(mileage, 10),
                        fuelLevelPct: parseInt(fuelPct, 10),
                        conditionGood,
                        conditionNotes: conditionNotes.trim(),
                        photosTakenCount: completed.size,
                        memberSignedName: signedName.trim(),
                      });
                      setStage("done");
                    } catch (err) {
                      setSubmitErr(
                        err instanceof Error ? err.message : String(err),
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  } else {
                    // No onSubmit wired (e.g., the static-param demo path);
                    // local-only success state.
                    setStage("done");
                  }
                }}
                disabled={
                  submitting ||
                  !signedName.trim() ||
                  !confirmChecked
                }
                className="h-12 flex-1 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Recording…" : "Confirm and complete"}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {stage === "done" && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-2 text-3xl text-ink">
              ✓
            </div>
            <h2 className="mt-6 font-display text-3xl text-ink">
              {isCheckin ? "You're good to drive." : "Return complete."}
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              {isCheckin
                ? "Have a great trip. Keys are in the vehicle. Roadside assistance: 1-800-RYDA-NOW."
                : "RYDA will inspect within 24 hours. You'll get the post-trip report by email."}
            </p>
            <Link
              href="/bookings"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
            >
              Back to bookings →
            </Link>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-mute">
        Need help? Tap the chat icon to reach RYDA support 24/7.
      </p>
    </section>
  );
}

function Bullet({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream font-display text-sm text-red">
        {n}
      </span>
      <div>
        <p className="font-medium text-ink">{t}</p>
        <p className="mt-0.5 text-ink-soft">{d}</p>
      </div>
    </li>
  );
}
