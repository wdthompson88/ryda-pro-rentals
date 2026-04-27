"use client";

import { useState } from "react";
import { Vehicle, formatUSD } from "@/lib/market-data";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "stop";
type BuyIn = "shares" | "dollars";

type Props = { vehicle: Vehicle };

export function OrderPanel({ vehicle }: Props) {
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [buyIn, setBuyIn] = useState<BuyIn>("shares");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");

  const numericAmount = parseFloat(amount) || 0;
  const numericLimit = parseFloat(limitPrice) || vehicle.pricePerShare;
  const effectivePrice = orderType === "market" ? vehicle.pricePerShare : numericLimit;

  const estimatedShares = buyIn === "shares" ? numericAmount : numericAmount / effectivePrice;
  const estimatedCost = buyIn === "shares" ? numericAmount * effectivePrice : numericAmount;

  const sideAccent = side === "buy" ? "#00C805" : "#DC2626";

  return (
    <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
      {/* Side switcher */}
      <div className="mb-5 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setSide("buy")}
          className={`relative pb-2 transition-colors ${
            side === "buy" ? "text-ink" : "text-mute hover:text-ink-soft"
          }`}
        >
          Buy {vehicle.ticker}
          {side === "buy" && (
            <span
              className="absolute -bottom-px left-0 h-0.5 w-full"
              style={{ backgroundColor: sideAccent }}
            />
          )}
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`relative pb-2 transition-colors ${
            side === "sell" ? "text-ink" : "text-mute hover:text-ink-soft"
          }`}
        >
          Sell {vehicle.ticker}
          {side === "sell" && (
            <span
              className="absolute -bottom-px left-0 h-0.5 w-full"
              style={{ backgroundColor: sideAccent }}
            />
          )}
        </button>
      </div>

      <Field label="Order type">
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
          className="w-full bg-transparent text-right font-medium text-ink focus:outline-none"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
        </select>
      </Field>

      <Field label={side === "buy" ? "Buy in" : "Sell in"}>
        <select
          value={buyIn}
          onChange={(e) => setBuyIn(e.target.value as BuyIn)}
          className="w-full bg-transparent text-right font-medium text-ink focus:outline-none"
        >
          <option value="shares">Shares</option>
          <option value="dollars">Dollars</option>
        </select>
      </Field>

      <Field label="Amount">
        <input
          type="number"
          inputMode="decimal"
          placeholder={buyIn === "shares" ? "0" : "$0.00"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent text-right font-medium text-ink placeholder:text-mute focus:outline-none"
        />
      </Field>

      {orderType !== "market" && (
        <Field label={orderType === "limit" ? "Limit price" : "Stop price"}>
          <input
            type="number"
            inputMode="decimal"
            placeholder={formatUSD(vehicle.pricePerShare)}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-transparent text-right font-medium text-ink placeholder:text-mute focus:outline-none"
          />
        </Field>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-ink-soft">
          Estimated {buyIn === "shares" ? "cost" : "shares"}
        </span>
        <span className="font-medium text-ink">
          {buyIn === "shares"
            ? formatUSD(estimatedCost)
            : estimatedShares.toFixed(4)}
        </span>
      </div>

      <button
        className="mt-5 w-full rounded-full px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: sideAccent }}
      >
        Review order
      </button>

      <p className="mt-4 text-center text-xs text-mute">
        {formatUSD(354_445)} buying power available
      </p>

      <div className="mt-5 border-t border-rule pt-4 text-center text-xs text-mute">
        RYDA Markets · {vehicle.market}
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
