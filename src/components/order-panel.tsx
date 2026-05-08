"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Vehicle, formatUSD } from "@/lib/market-data";

type Props = { vehicle: Vehicle };

export function OrderPanel({ vehicle }: Props) {
  const router = useRouter();
  // 2-share minimum per person (10 shares per LLC, up to 5 members,
  // 2 shares each = 10 total). Default and floor are both 2.
  const [shares, setShares] = useState("2");

  const numericShares = Math.max(2, Math.min(vehicle.sharesAvailable || 2, parseInt(shares || "2", 10) || 2));
  const buyInCost = numericShares * vehicle.pricePerShare;
  const annualContribution = numericShares * vehicle.annualOpCost;
  const daysPerYear = numericShares * vehicle.daysPerYear;
  const milesPerYear = numericShares * vehicle.milesPerYear;
  const sharesPercent = ((numericShares / vehicle.shares) * 100).toFixed(1);

  const sold = vehicle.sharesAvailable === 0;

  function handleClaim() {
    if (sold) return;
    // Browsing is open, but transacting requires an account. Route
    // through /signup with a `next=` so post-signup we land back at the
    // exact buy flow with the chosen share count preserved. The user's
    // intent ("buy") drives the signup copy.
    const buyHref = `/portfolio/${vehicle.symbol.toLowerCase()}/buy?shares=${numericShares}`;
    router.push(
      `/signup?next=${encodeURIComponent(buyHref)}&reason=buy`,
    );
  }

  return (
    <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        Claim a share
      </p>
      <p className="mt-2 font-display text-xl text-ink">{vehicle.name}</p>
      <p className="mt-1 text-xs text-mute">
        {vehicle.sharesAvailable} of {vehicle.shares} shares available
      </p>

      <div className="mt-5 border-t border-rule pt-4">
        <Field label="Shares" htmlFor={`shares-${vehicle.symbol}`}>
          <input
            id={`shares-${vehicle.symbol}`}
            type="number"
            inputMode="numeric"
            min={2}
            max={vehicle.sharesAvailable || 2}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            aria-label={`Shares to claim, between 2 and ${vehicle.sharesAvailable || 2}`}
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
          <span className="text-ink-soft">Annual contribution</span>
          <span className="font-medium text-ink tabular-nums">
            {formatUSD(annualContribution)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleClaim}
        disabled={sold}
        className="mt-5 w-full rounded-full bg-ink px-7 py-3 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sold ? "All shares taken" : `Reserve ${numericShares} share${numericShares > 1 ? "s" : ""} →`}
      </button>

      <p className="mt-4 text-center text-xs text-mute">
        12-month minimum hold. Transferable to other verified members.
      </p>

      {/* Payment options, Pacaso surfaces these up-front rather than
          burying them in the buy flow. Each option is referral-style:
          we don't underwrite credit; we hand off to the right partner.
          Crypto is supported via a regulated exchange partner with the
          actual transfer settled in USD to the LLC's escrow account. */}
      <div className="mt-5 border-t border-rule pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
          Ways to pay
        </p>
        <ul className="mt-3 space-y-2 text-xs">
          <PayMethod label="Wire / ACH" sub="Default, same-day or next-day to LLC escrow" />
          <PayMethod
            label="Liquidity line"
            sub="HELOC, SBLOC, or pledged-asset line via your bank"
          />
          <PayMethod
            label="Financing partner"
            sub="Referral to specialty lender; subject to underwriting"
          />
          <PayMethod
            label="Crypto"
            sub="BTC / ETH / USDC via regulated exchange; settles USD"
          />
        </ul>
      </div>

      <div className="mt-5 border-t border-rule pt-4 text-center text-xs text-mute">
        Vehicle stored in {vehicle.market}
      </div>
    </div>
  );
}

function PayMethod({ label, sub }: { label: string; sub: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="font-medium text-ink">{label}</span>
      <span className="text-right text-mute">{sub}</span>
    </li>
  );
}

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-3 last:border-b-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm text-ink-soft">
          {label}
        </label>
      ) : (
        <span className="text-sm text-ink-soft">{label}</span>
      )}
      <div className="flex-1 pl-4">{children}</div>
    </div>
  );
}
