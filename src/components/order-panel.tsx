"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Vehicle, formatUSD } from "@/lib/market-data";

type Props = { vehicle: Vehicle };

export function OrderPanel({ vehicle }: Props) {
  const router = useRouter();
  const [seats, setSeats] = useState("1");

  const numericSeats = Math.max(1, Math.min(vehicle.sharesAvailable || 1, parseInt(seats || "1", 10) || 1));
  const buyInCost = numericSeats * vehicle.pricePerShare;
  const annualMgmtFee = numericSeats * vehicle.annualOpCost;
  const daysPerYear = numericSeats * vehicle.daysPerYear;
  const milesPerYear = numericSeats * vehicle.milesPerYear;
  const sharesPercent = ((numericSeats / vehicle.shares) * 100).toFixed(1);

  const sold = vehicle.sharesAvailable === 0;

  function handleClaim() {
    if (sold) return;
    router.push(`/markets/${vehicle.symbol.toLowerCase()}/buy?shares=${numericSeats}`);
  }

  return (
    <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        Claim a seat
      </p>
      <p className="mt-2 font-display text-xl text-ink">{vehicle.name}</p>
      <p className="mt-1 text-xs text-mute">
        {vehicle.sharesAvailable} of {vehicle.shares} seats available
      </p>

      <div className="mt-5 border-t border-rule pt-4">
        <Field label="Seats">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={vehicle.sharesAvailable || 1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            className="w-full bg-transparent text-right font-medium text-ink placeholder:text-mute focus:outline-none"
          />
        </Field>

        <Field label="Of vehicle">
          <span className="font-medium text-ink tabular-nums">{sharesPercent}%</span>
        </Field>

        <Field label="Days / year">
          <span className="font-medium text-ink tabular-nums">{daysPerYear}</span>
        </Field>

        <Field label="Miles / year">
          <span className="font-medium text-ink tabular-nums">
            {milesPerYear.toLocaleString()}
          </span>
        </Field>
      </div>

      <div className="mt-5 border-t border-rule pt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-soft">Buy-in (today)</span>
          <span className="font-medium text-ink tabular-nums">
            {formatUSD(buyInCost)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-ink-soft">Mgmt fee / year</span>
          <span className="font-medium text-ink tabular-nums">
            {formatUSD(annualMgmtFee)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleClaim}
        disabled={sold}
        className="mt-5 w-full rounded-full bg-ink px-7 py-3 text-sm font-semibold text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sold ? "All seats taken" : `Reserve ${numericSeats} seat${numericSeats > 1 ? "s" : ""} →`}
      </button>

      <p className="mt-4 text-center text-xs text-mute">
        12-month minimum hold. Transferable to other verified members.
      </p>

      <div className="mt-5 border-t border-rule pt-4 text-center text-xs text-mute">
        Vehicle stored in {vehicle.market}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-3 last:border-b-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="flex-1 pl-4">{children}</div>
    </div>
  );
}
