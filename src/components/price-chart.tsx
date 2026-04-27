"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  Vehicle,
  Timeframe,
  generateHistory,
  formatUSD,
  changeFromPrev,
} from "@/lib/market-data";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y", "MAX"];

const UP_COLOR = "#00C805";   // Robinhood green
const DOWN_COLOR = "#DC2626"; // strong red

const TF_LABEL: Record<Timeframe, string> = {
  "1D": "Today",
  "1W": "Past week",
  "1M": "Past month",
  "3M": "Past 3 months",
  "YTD": "Year to date",
  "1Y": "Past year",
  "5Y": "Past 5 years",
  "MAX": "All time",
};

type Props = {
  vehicle: Vehicle;
  /** When set, renders a Robinhood-style price header above the chart. */
  showHeader?: boolean;
};

export function PriceChart({ vehicle, showHeader = false }: Props) {
  const [tf, setTf] = useState<Timeframe>("1D");
  const [hover, setHover] = useState<{ price: number; t: string } | null>(null);

  const history = useMemo(() => generateHistory(vehicle, tf), [vehicle, tf]);
  const first = history[0]?.price ?? vehicle.pricePerShare;
  const last = history[history.length - 1]?.price ?? vehicle.pricePerShare;

  // The value the user is "looking at": hovered point or the current price.
  const displayPrice = hover?.price ?? last;

  // Change is always relative to the start of the selected timeframe.
  const baseline = tf === "1D" ? vehicle.prevClose : first;
  const { diff, pct, isUp } = changeFromPrev(displayPrice, baseline);

  const lineColor = changeFromPrev(last, baseline).isUp ? UP_COLOR : DOWN_COLOR;

  return (
    <div className="w-full">
      {showHeader && (
        <div className="mb-6">
          <p className="font-display text-5xl font-light text-ink tabular-nums sm:text-6xl">
            {formatUSD(displayPrice)}
          </p>
          <p
            className="mt-2 text-base font-medium tabular-nums"
            style={{ color: isUp ? UP_COLOR : DOWN_COLOR }}
          >
            {isUp ? "▲" : "▼"} {formatUSD(Math.abs(diff))} ({pct.toFixed(2)}%){" "}
            <span className="font-normal text-ink-soft">{TF_LABEL[tf]}</span>
          </p>
        </div>
      )}

      <div className="h-[280px] w-full sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const payload = (e as unknown as {
                activePayload?: Array<{ payload?: { price: number; t: string } }>;
              })?.activePayload;
              if (payload && payload[0]?.payload) {
                setHover(payload[0].payload);
              }
            }}
          >
            <YAxis domain={["dataMin - 100", "dataMax + 100"]} hide />
            <ReferenceLine y={baseline} stroke="#D8D2C8" strokeDasharray="3 3" />
            <Tooltip
              cursor={{ stroke: "#8B857C", strokeDasharray: "3 3" }}
              content={() => null}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-t border-rule pt-4 text-sm">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={`min-w-[44px] rounded-md px-3 py-1.5 font-medium transition-colors ${
              t === tf
                ? `text-white`
                : "text-ink-soft hover:text-ink"
            }`}
            style={t === tf ? { backgroundColor: lineColor } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-2 text-xs text-mute">
        Range: {formatUSD(Math.min(...history.map((h) => h.price)))} —{" "}
        {formatUSD(Math.max(...history.map((h) => h.price)))}
      </div>
    </div>
  );
}
