"use client";

// The at-the-kerb handover form (build loop 4C).
//
// This runs on a phone, outdoors, next to a car, probably in a hurry, and
// often on one bar of signal. Every decision below follows from that:
//
//   PHOTOS UPLOAD AS THEY ARE TAKEN, not on submit. A submit that has to
//   push eight 10MB images before it records anything is a submit that
//   fails at the kerb and loses the readings with it. Each photo lands in
//   the bucket immediately and the form holds only its path, so the final
//   POST is a few hundred bytes and succeeds on a bad connection.
//
//   THE READINGS ARE THE REQUIRED PART. Odometer and fuel gate the
//   button; photos and notes never do. 0053 makes the readings NOT NULL
//   and photos an empty array by default, and that ordering is
//   deliberate — a handover with readings and no photos is a usable
//   record, a handover with photos and no odometer is not.
//
//   ONE IRREVERSIBLE ACTION, STATED PLAINLY. Submitting a return
//   completes the booking, which is what makes the operator's payout
//   payable and releases the deposit. The confirm step says so in those
//   words rather than "are you sure".
//
// The readings are write-once at the database (0053), so there is no edit
// affordance here on purpose: the form's job is to get them right the
// first time, and offering an edit that the server would refuse is worse
// than offering none.

import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { FOCUS_RING } from "@/lib/rental-booking-display";
import {
  HANDOVER_PHOTOS_MAX,
  ODOMETER_MAX_MILES,
  type RentalHandoverType,
} from "@/lib/rental-handover";

export const HANDOVER_BUCKET = "rental-handover-photos";

/** `<bookingId>/<type>/<file>` — the convention 0054's policies match on. */
export function handoverPhotoPath(
  bookingId: string,
  type: RentalHandoverType,
  fileName: string,
): string {
  return `${bookingId}/${type}/${fileName}`;
}

/** Strip anything the path regex would reject, and keep it unique. */
function safeFileName(original: string): string {
  const ext = (original.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] ?? "jpg").toLowerCase();
  // No Date.now()/random in the module scope of a server file, but this is
  // a client component and a collision would silently overwrite evidence.
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}.${ext}`;
}

type Uploaded = { path: string; previewUrl: string; name: string };

export function RentalHandoverForm({
  bookingId,
  type,
  vehicleName,
  onRecorded,
}: {
  bookingId: string;
  type: RentalHandoverType;
  vehicleName: string;
  onRecorded?: (bookingStatus: string) => void;
}) {
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isReturn = type === "return";

  const odometerNum = Number.parseInt(odometer, 10);
  const fuelNum = Number.parseInt(fuel, 10);
  const readingsValid =
    Number.isSafeInteger(odometerNum) &&
    odometerNum >= 0 &&
    odometerNum <= ODOMETER_MAX_MILES &&
    Number.isSafeInteger(fuelNum) &&
    fuelNum >= 0 &&
    fuelNum <= 100;

  const upload = useCallback(
    async (files: FileList) => {
      if (!supabase) {
        setError("Photo upload isn't available right now.");
        return;
      }
      const room = HANDOVER_PHOTOS_MAX - photos.length;
      if (room <= 0) {
        setError(`That's the maximum of ${HANDOVER_PHOTOS_MAX} photos.`);
        return;
      }
      const batch = Array.from(files).slice(0, room);
      setError(null);
      setUploading((n) => n + batch.length);

      await Promise.all(
        batch.map(async (file) => {
          try {
            const path = handoverPhotoPath(bookingId, type, safeFileName(file.name));
            const { error: upErr } = await supabase!.storage
              .from(HANDOVER_BUCKET)
              .upload(path, file, { contentType: file.type, upsert: false });
            if (upErr) {
              // One photo failing must not discard the others, and must
              // never block the readings.
              setError("A photo didn't upload. The rest are saved.");
              return;
            }
            setPhotos((p) => [
              ...p,
              { path, previewUrl: URL.createObjectURL(file), name: file.name },
            ]);
          } finally {
            setUploading((n) => n - 1);
          }
        }),
      );
    },
    [bookingId, type, photos.length],
  );

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await authedFetch(
        `/api/rental-bookings/${encodeURIComponent(bookingId)}/handover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            odometerMiles: odometerNum,
            fuelLevelPct: fuelNum,
            conditionNotes: notes.trim() || undefined,
            photoPaths: photos.map((p) => p.path),
          }),
        },
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json as { error?: string })?.error ?? "Could not record that.");
        setConfirming(false);
        return;
      }
      const status = (json as { bookingStatus?: string }).bookingStatus ?? "";
      setDone(status);
      onRecorded?.(status);
    } catch {
      setError("Could not record that. Check your signal and try again.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <p className="font-display text-xl text-ink">
          {isReturn ? "Return recorded." : "Picked up."}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {isReturn
            ? "The booking is complete. Nothing further is needed here."
            : "The car is checked out. Record the return when it comes back."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          {isReturn ? "Return" : "Pickup"}
        </p>
        <h2 className="mt-2 font-display text-2xl text-ink">{vehicleName}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {isReturn
            ? "Record the car as it comes back. These readings settle any mileage or fuel difference."
            : "Record the car as it goes out. These readings are what any later difference is measured against."}
        </p>
      </header>

      {/* Readings — the required half. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wider text-mute">
            Odometer (miles)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={ODOMETER_MAX_MILES}
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            placeholder="12345"
            className={`mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-base tabular-nums text-ink placeholder:text-mute ${FOCUS_RING}`}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wider text-mute">
            Fuel level (%)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
            placeholder="80"
            className={`mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-base tabular-nums text-ink placeholder:text-mute ${FOCUS_RING}`}
          />
        </label>
      </div>

      {/* Photos — optional, and uploaded as they are taken. */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-mute">
            Photos
          </span>
          <span className="text-xs text-mute tabular-nums">
            {photos.length}/{HANDOVER_PHOTOS_MAX}
          </span>
        </div>

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.path}
                src={p.previewUrl}
                alt={p.name}
                className="aspect-square w-full rounded-lg border border-rule object-cover"
              />
            ))}
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          // `capture` opens the camera directly on a phone, which is where
          // this form is used.
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading > 0 || photos.length >= HANDOVER_PHOTOS_MAX}
          className={`mt-3 inline-flex h-11 items-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
        >
          {uploading > 0 ? `Uploading ${uploading}…` : "Add photos"}
        </button>
        <p className="mt-2 text-[11px] text-mute">
          Optional, but they&apos;re the record if there&apos;s a dispute later.
          Saved as you take them.
        </p>
      </div>

      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-mute">
          Condition notes{" "}
          <span className="normal-case tracking-normal">(optional)</span>
        </span>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scuff on the nearside rear bumper…"
          className={`mt-2 w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-mute ${FOCUS_RING}`}
        />
      </label>

      {error && (
        <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}

      {/* The irreversible step, named. */}
      {!confirming ? (
        <button
          type="button"
          disabled={!readingsValid || uploading > 0}
          onClick={() => setConfirming(true)}
          className={`inline-flex h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
        >
          {isReturn ? "Record the return" : "Record the pickup"}
        </button>
      ) : (
        <div className="rounded-2xl border border-rule bg-cream-2/50 p-5">
          <p className="text-sm text-ink">
            {isReturn
              ? "This completes the booking. The readings can't be changed afterwards."
              : "This checks the car out and can't be undone. The readings can't be changed afterwards."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className={`inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red disabled:opacity-60 ${FOCUS_RING}`}
            >
              {saving ? "Recording…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              className={`text-sm text-mute underline transition-colors hover:text-ink ${FOCUS_RING}`}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
