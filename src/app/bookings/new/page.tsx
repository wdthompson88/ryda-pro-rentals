"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StepProgress } from "@/components/step-progress";

const STEPS = ["Vehicle", "Dates", "Details", "Review", "Confirmed"];

const VEHICLES = [
  { symbol: "F296", name: "Ferrari 296 GTB", daysLeft: 42, milesLeft: 3_342 },
  { symbol: "MC75", name: "McLaren 750S Spider", daysLeft: 44, milesLeft: 3_568 },
];

export default function NewBookingPage() {
  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState(VEHICLES[0]);
  const [dates, setDates] = useState({ start: "Apr 28", end: "May 1", days: 3 });
  const [details, setDetails] = useState({
    type: "standard" as "standard" | "track" | "event",
    handover: "delivery" as "delivery" | "pickup",
    notes: "",
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

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
            <PickDates dates={dates} onChange={setDates} onBack={back} onNext={next} vehicle={vehicle} />
          )}
          {step === 2 && (
            <PickDetails details={details} onChange={setDetails} onBack={back} onNext={next} vehicle={vehicle} />
          )}
          {step === 3 && (
            <Review
              vehicle={vehicle}
              dates={dates}
              details={details}
              onBack={back}
              onConfirm={next}
            />
          )}
          {step === 4 && <Confirmed vehicle={vehicle} dates={dates} />}
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

function PickDates({
  dates,
  onChange,
  onBack,
  onNext,
  vehicle,
}: {
  dates: { start: string; end: string; days: number };
  onChange: (d: { start: string; end: string; days: number }) => void;
  onBack: () => void;
  onNext: () => void;
  vehicle: { name: string; daysLeft: number };
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">When?</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {vehicle.name} · {vehicle.daysLeft} days left in your annual entitlement.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            Start
          </label>
          <input
            type="text"
            defaultValue={dates.start}
            onChange={(e) => onChange({ ...dates, start: e.target.value })}
            className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            End
          </label>
          <input
            type="text"
            defaultValue={dates.end}
            onChange={(e) => onChange({ ...dates, end: e.target.value })}
            className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          />
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-rule bg-cream-2/40 p-4 text-sm">
        <p className="text-ink">
          <span className="font-medium">{dates.days} days</span> · ~~~ 360 estimated miles
        </p>
        <p className="mt-1 text-xs text-mute">
          Uses 3 of {vehicle.daysLeft} days. Within your annual entitlement.
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
  details: { type: "standard" | "track" | "event"; handover: "delivery" | "pickup"; notes: string };
  onChange: (d: { type: "standard" | "track" | "event"; handover: "delivery" | "pickup"; notes: string }) => void;
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
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { k: "standard", t: "Standard drive", s: "Public roads" },
            { k: "track", t: "Track day", s: "+$250 + rider" },
            { k: "event", t: "Special event", s: "Wedding, gala, photo" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => onChange({ ...details, type: opt.k as "standard" | "track" | "event" })}
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
          Notes for Lead Owner / RYDA (optional)
        </label>
        <textarea
          rows={3}
          value={details.notes}
          onChange={(e) => onChange({ ...details, notes: e.target.value })}
          className="mt-2 w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          placeholder="Going to a wedding — would love a fresh detail before delivery."
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
  onBack,
  onConfirm,
}: {
  vehicle: { name: string };
  dates: { start: string; end: string; days: number };
  details: { type: string; handover: string; notes: string };
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Review your booking.</h2>
      <ul className="mt-8 divide-y divide-rule rounded-xl border border-rule bg-cream-2/40">
        <Row k="Vehicle" v={vehicle.name} />
        <Row k="Dates" v={`${dates.start} – ${dates.end}`} />
        <Row k="Duration" v={`${dates.days} days`} />
        <Row k="Type" v={details.type === "standard" ? "Standard drive" : details.type === "track" ? "Track day" : "Special event"} />
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
      <BackNext onBack={onBack} onNext={onConfirm} nextLabel="Confirm booking" />
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
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#00C805]/10 text-3xl text-[#00C805]">
        ✓
      </div>
      <h2 className="mt-6 font-display text-3xl text-ink">Booking confirmed.</h2>
      <p className="mt-3 text-base text-ink-soft">
        {vehicle.name} · {dates.start} – {dates.end}
      </p>
      <div className="mt-8 rounded-xl border border-rule bg-cream-2/40 p-5 text-left text-sm">
        <p className="font-medium text-ink">Booking #BK-00428</p>
        <ul className="mt-3 space-y-2 text-ink-soft">
          <li>· Confirmation email sent</li>
          <li>· 24h pickup-prep reminder will go out Apr 27</li>
          <li>· Pre-trip checklist available 24h before</li>
          <li>· Day-of contact: RYDA concierge in your inbox</li>
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
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
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
        className="h-12 flex-1 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
      >
        {nextLabel} →
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-baseline justify-between px-5 py-4">
      <span className="text-xs uppercase tracking-wider text-mute">{k}</span>
      <span className="ml-4 text-sm font-medium text-ink">{v}</span>
    </li>
  );
}
