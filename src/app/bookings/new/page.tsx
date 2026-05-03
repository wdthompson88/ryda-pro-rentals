"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StepProgress } from "@/components/step-progress";
import { BOOKING_POLICY } from "@/lib/market-data";
import { supabase } from "@/lib/supabase";

// Booking mode is the first decision after vehicle selection, it sets
// the calendar validation rules (advance window, consecutive cap,
// active-reservation cap). Inspired by Pacaso SmartStay's two-tier
// short-notice / general split.
type BookingMode = "short-notice" | "planned";

const STEPS = ["Vehicle", "Mode", "Dates", "Details", "Review", "Confirmed"];

const VEHICLES = [
  {
    symbol: "F296",
    name: "Ferrari 296 GTB",
    daysLeft: 42,
    milesLeft: 3_342,
    activePlanned: 1, // already booked planned drives this share has live
  },
  {
    symbol: "MC75",
    name: "McLaren 750S Spider",
    daysLeft: 44,
    milesLeft: 3_568,
    activePlanned: 0,
  },
];

export default function NewBookingPage() {
  const router = useRouter();
  // Auth gate. Booking is a member-only action, the rental policy (28+
  // driver, member-managed LLC ownership check, KYC complete) lives on
  // top of an authenticated session. Unauthenticated visitors get
  // bounced to /signin with `?next=/bookings/new&reason=checkout` so
  // they return to this exact step after sign-in. While the check is
  // pending we render a minimal "checking session" state to avoid
  // flashing the booking UI to non-members.
  const [authState, setAuthState] = useState<"checking" | "ok">("checking");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) {
          // Fail-closed in production (env misconfig should not let
          // anyone reach a member-only page). In dev / preview, fall
          // through so the demo still works without Supabase wired.
          if (process.env.NODE_ENV === "production") {
            if (!cancelled) router.replace("/signin?reason=unavailable");
            return;
          }
          if (!cancelled) setAuthState("ok");
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          router.replace(
            "/signin?next=" + encodeURIComponent("/bookings/new") + "&reason=checkout",
          );
          return;
        }
        setAuthState("ok");
      } catch {
        // getSession() can throw on a corrupt localStorage token. Treat
        // any auth-probe failure as "not signed in" rather than locking
        // the user on the spinner.
        if (cancelled) return;
        router.replace(
          "/signin?next=" + encodeURIComponent("/bookings/new") + "&reason=checkout",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState(VEHICLES[0]);
  const [mode, setMode] = useState<BookingMode>("planned");
  // ISO YYYY-MM-DD canonical so we can POST directly to /api/bookings
  // and `new Date(d.start)` reparses safely. Display formatting is
  // derived where shown (Review step + Confirmed step).
  const [dates, setDates] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() + 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 2); // 3-day inclusive range = +2 to end
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { start: iso(start), end: iso(end), days: 3 };
  });
  const [details, setDetails] = useState({
    type: "standard" as "standard" | "event",
    handover: "delivery" as "delivery" | "pickup",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Persist the booking on confirm. The conflict-detection lives on
  // the server (the API returns 409 if dates overlap an existing
  // booking on the same vehicle); we surface the error inline.
  async function submitBooking() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleSymbol: vehicle.symbol,
          mode,
          startDate: dates.start,
          endDate: dates.end,
          type: details.type,
          handover: details.handover,
          notes: details.notes,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Booking failed (${res.status}).`);
      }
      next();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit booking.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authState === "checking") {
    return (
      <>
        <SiteHeader />
        <section className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-32">
          <div className="mx-auto h-3 w-3 animate-pulse rounded-full bg-red" />
          <p className="mt-6 font-display text-xl text-ink">
            Checking your session…
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
        <Link
          href="/bookings"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← Bookings
        </Link>

        <h1 className="mt-6 font-display text-3xl text-ink sm:text-4xl">
          {step === STEPS.length - 1 ? "Booking confirmed." : "Book time."}
        </h1>

        <div className="mt-10 rounded-2xl border border-rule bg-surface p-8 sm:p-10">
          <StepProgress steps={STEPS} current={step} />

          {step === 0 && (
            <PickVehicle
              selected={vehicle.symbol}
              onSelect={(s) => setVehicle(VEHICLES.find((v) => v.symbol === s)!)}
              onNext={next}
            />
          )}
          {step === 1 && (
            <PickMode
              mode={mode}
              onChange={setMode}
              vehicle={vehicle}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 2 && (
            <PickDates
              dates={dates}
              onChange={setDates}
              onBack={back}
              onNext={next}
              vehicle={vehicle}
              mode={mode}
            />
          )}
          {step === 3 && (
            <PickDetails details={details} onChange={setDetails} onBack={back} onNext={next} vehicle={vehicle} />
          )}
          {step === 4 && (
            <Review
              vehicle={vehicle}
              dates={dates}
              details={details}
              mode={mode}
              onBack={back}
              onConfirm={submitBooking}
              submitting={submitting}
              error={submitError}
            />
          )}
          {step === 5 && <Confirmed vehicle={vehicle} dates={dates} />}
        </div>
      </section>
    </>
  );
}

// ── Steps ─────────────────────────────────────────────────────────

function PickVehicle({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (s: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Which vehicle?</h2>
      <p className="mt-2 text-sm text-ink-soft">
        You have shares in 2 vehicles.
      </p>
      <div className="mt-8 space-y-3">
        {VEHICLES.map((v) => (
          <button
            key={v.symbol}
            onClick={() => onSelect(v.symbol)}
            className={`w-full rounded-xl border p-5 text-left transition-colors ${
              selected === v.symbol
                ? "border-red bg-red/5"
                : "border-rule bg-cream hover:border-ink-soft"
            }`}
          >
            <p className="font-display text-lg text-ink">{v.name}</p>
            <p className="mt-1 text-xs text-mute">
              {v.daysLeft} days left · {v.milesLeft.toLocaleString()} mi left this year
            </p>
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        className="mt-10 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
      >
        Continue →
      </button>
    </div>
  );
}

function PickMode({
  mode,
  onChange,
  vehicle,
  onBack,
  onNext,
}: {
  mode: BookingMode;
  onChange: (m: BookingMode) => void;
  vehicle: { name: string; activePlanned: number };
  onBack: () => void;
  onNext: () => void;
}) {
  const plannedRemaining =
    (BOOKING_POLICY.planned.activeLimitPerShare ?? 0) - vehicle.activePlanned;
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">What kind of drive?</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Pick the booking mode, it sets your date window and how many
        active reservations you can hold for {vehicle.name}.
      </p>

      <div className="mt-8 space-y-3">
        <ModeOption
          active={mode === "short-notice"}
          onClick={() => onChange("short-notice")}
          tag="Short-notice drive"
          headline="1–7 days out · unlimited count · max 3 consecutive days"
          example="It's sunny this weekend, you're in the car Saturday."
          subline={`No active-reservation cap. Consumes annual days/miles like any other booking.`}
        />
        <ModeOption
          active={mode === "planned"}
          onClick={() => onChange("planned")}
          tag="Planned drive"
          headline="8–365 days out · max 4 active per share · 7 days peak / 14 off-peak"
          example="The August Hamptons trip you're booking in March."
          subline={`You currently have ${vehicle.activePlanned} of ${BOOKING_POLICY.planned.activeLimitPerShare} active planned reservations on this share. ${plannedRemaining} more available.`}
        />
      </div>

      <div className="mt-6 rounded-xl border border-red/30 bg-red/5 p-4 text-xs">
        <p className="font-medium text-red">Peak protection</p>
        <p className="mt-1 text-ink-soft">
          Each share gets one protected peak window before any co-owner
          can book a second. Peak weekends in Miami: F1 GP, Art Basel,
          Spring Break, Holiday week.
        </p>
      </div>

      <BackNext onBack={onBack} onNext={onNext} />
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  tag,
  headline,
  example,
  subline,
}: {
  active: boolean;
  onClick: () => void;
  tag: string;
  headline: string;
  example: string;
  subline: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-5 text-left transition-colors ${
        active
          ? "border-red bg-red/5"
          : "border-rule bg-cream hover:border-ink-soft"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-red">
        {tag}
      </p>
      <p className="mt-2 font-display text-lg text-ink">{headline}</p>
      <p className="mt-2 text-sm italic text-ink-soft">{example}</p>
      <p className="mt-2 text-xs text-mute">{subline}</p>
    </button>
  );
}

function PickDates({
  dates,
  onChange,
  onBack,
  onNext,
  vehicle,
  mode,
}: {
  dates: { start: string; end: string; days: number };
  onChange: (d: { start: string; end: string; days: number }) => void;
  onBack: () => void;
  onNext: () => void;
  vehicle: { name: string; daysLeft: number };
  mode: BookingMode;
}) {
  const policy =
    mode === "short-notice"
      ? BOOKING_POLICY.shortNotice
      : BOOKING_POLICY.planned;
  const maxConsecutive =
    mode === "short-notice"
      ? BOOKING_POLICY.shortNotice.maxConsecutiveDays
      : BOOKING_POLICY.planned.maxConsecutiveDaysOffPeak;
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">When?</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {vehicle.name} · {vehicle.daysLeft} days left in your annual entitlement.
      </p>
      <div className="mt-4 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs text-ink-soft">
        <span className="font-medium text-ink">
          {mode === "short-notice" ? "Short-notice" : "Planned"} drive
        </span>{" "}
        · {policy.minDaysAdvance}–{policy.maxDaysAdvance} days advance · max{" "}
        {maxConsecutive} consecutive days
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            Start
          </label>
          <input
            type="date"
            value={dates.start}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              const start = e.target.value;
              const end = dates.end < start ? start : dates.end;
              const days = computeDays(start, end);
              onChange({ start, end, days });
            }}
            className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            End
          </label>
          <input
            type="date"
            value={dates.end}
            min={dates.start}
            onChange={(e) => {
              const end = e.target.value;
              const days = computeDays(dates.start, end);
              onChange({ ...dates, end, days });
            }}
            className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          />
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-rule bg-cream-2/40 p-4 text-sm">
        <p className="text-ink">
          <span className="font-medium">{dates.days} days</span> · ~
          {(dates.days * 100).toLocaleString()} estimated miles included
        </p>
        <p className="mt-1 text-xs text-mute">
          Uses {dates.days} of {vehicle.daysLeft} days. Within your annual
          entitlement.
        </p>
      </div>
      <BackNext onBack={onBack} onNext={onNext} />
    </div>
  );
}

function PickDetails({
  details,
  onChange,
  onBack,
  onNext,
  vehicle,
}: {
  details: { type: "standard" | "event"; handover: "delivery" | "pickup"; notes: string };
  onChange: (d: { type: "standard" | "event"; handover: "delivery" | "pickup"; notes: string }) => void;
  onBack: () => void;
  onNext: () => void;
  vehicle: { name: string };
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Trip details.</h2>
      <p className="mt-2 text-sm text-ink-soft">{vehicle.name}</p>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          Booking type
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { k: "standard", t: "Standard drive", s: "Public roads" },
            { k: "event", t: "Special event", s: "Wedding, gala, photo" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => onChange({ ...details, type: opt.k as "standard" | "event" })}
              className={`rounded-xl border p-3 text-left transition-colors ${
                details.type === opt.k
                  ? "border-red bg-red/5"
                  : "border-rule bg-cream hover:border-ink-soft"
              }`}
            >
              <p className="text-sm font-medium text-ink">{opt.t}</p>
              <p className="text-xs text-mute">{opt.s}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          Handover
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { k: "delivery", t: "White-glove delivery", s: "$0 (Blue tier · 1 included/yr remaining)" },
            { k: "pickup", t: "Self-pickup", s: "RYDA Miami facility" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => onChange({ ...details, handover: opt.k as "delivery" | "pickup" })}
              className={`rounded-xl border p-3 text-left transition-colors ${
                details.handover === opt.k
                  ? "border-red bg-red/5"
                  : "border-rule bg-cream hover:border-ink-soft"
              }`}
            >
              <p className="text-sm font-medium text-ink">{opt.t}</p>
              <p className="text-xs text-mute">{opt.s}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-medium uppercase tracking-wider text-mute">
          Notes for Proposal Coordinator / RYDA (optional)
        </label>
        <textarea
          rows={3}
          value={details.notes}
          onChange={(e) => onChange({ ...details, notes: e.target.value })}
          className="mt-2 w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          placeholder="Going to a wedding, would love a fresh detail before delivery."
        />
      </div>

      <BackNext onBack={onBack} onNext={onNext} />
    </div>
  );
}

function Review({
  vehicle,
  dates,
  details,
  mode,
  onBack,
  onConfirm,
  submitting,
  error,
}: {
  vehicle: { name: string };
  dates: { start: string; end: string; days: number };
  details: { type: string; handover: string; notes: string };
  mode: BookingMode;
  onBack: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  error?: string | null;
}) {
  // Render ISO dates as short month/day strings without dropping the
  // canonical state we POST to the API.
  const fmt = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Review your booking.</h2>
      <ul className="mt-8 divide-y divide-rule rounded-xl border border-rule bg-cream-2/40">
        <Row k="Vehicle" v={vehicle.name} />
        <Row
          k="Mode"
          v={mode === "short-notice" ? "Short-notice drive" : "Planned drive"}
        />
        <Row k="Dates" v={`${fmt(dates.start)} – ${fmt(dates.end)}`} />
        <Row k="Duration" v={`${dates.days} days`} />
        <Row k="Type" v={details.type === "standard" ? "Standard drive" : "Special event"} />
        <Row k="Handover" v={details.handover === "delivery" ? "White-glove delivery" : "Self-pickup"} />
        {details.notes && <Row k="Notes" v={details.notes} />}
      </ul>
      <div className="mt-6 rounded-xl border border-rule bg-surface p-5 text-sm">
        <p className="font-medium text-ink">Cancellation policy</p>
        <p className="mt-2 text-ink-soft">
          Free cancellation 30+ days before. 25% retained 4-7 days before.
          0% refund within 3 days.{" "}
          <Link href="/faq" className="text-red hover:text-red-deep">
            See full policy
          </Link>
          .
        </p>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </p>
      ) : null}
      <BackNext
        onBack={onBack}
        onNext={onConfirm}
        nextLabel={submitting ? "Submitting…" : "Confirm booking"}
        nextDisabled={submitting}
      />
    </div>
  );
}

function Confirmed({
  vehicle,
  dates,
}: {
  vehicle: { name: string };
  dates: { start: string; end: string };
}) {
  const fmt = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-2 text-3xl text-red">
        ✓
      </div>
      <h2 className="mt-6 font-display text-3xl text-ink">Booking confirmed.</h2>
      <p className="mt-3 text-base text-ink-soft">
        {vehicle.name} · {fmt(dates.start)} – {fmt(dates.end)}
      </p>
      <div className="mt-8 rounded-xl border border-rule bg-cream-2/40 p-5 text-left text-sm">
        <p className="font-medium text-ink">Booking confirmation</p>
        <ul className="mt-3 space-y-2 text-ink-soft">
          <li>· Confirmation email sent</li>
          <li>· 24h pickup-prep reminder goes out the day before</li>
          <li>· Pre-trip checklist available 24h before</li>
          <li>· Day-of contact: RYDA service team in your inbox</li>
        </ul>
      </div>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/bookings"
          className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
        >
          See all bookings
        </Link>
        <Link
          href="/account"
          className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
        >
          My account
        </Link>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function BackNext({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-10 flex gap-3">
      <button
        onClick={onBack}
        className="h-12 rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="h-12 flex-1 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {nextLabel} →
      </button>
    </div>
  );
}

// Inclusive day count between two ISO YYYY-MM-DD dates. Used by
// PickDates to keep the "X days · Y miles" summary in sync with the
// actual range as the user adjusts inputs.
function computeDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const s = new Date(startIso + "T00:00:00Z").getTime();
  const e = new Date(endIso + "T00:00:00Z").getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-baseline justify-between px-5 py-4">
      <span className="text-xs uppercase tracking-wider text-mute">{k}</span>
      <span className="ml-4 text-sm font-medium text-ink">{v}</span>
    </li>
  );
}
