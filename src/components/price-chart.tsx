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
  type ServiceEvent,
} from "@/lib/market-data";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y", "MAX"];

const UP_COLOR = "#00C805";   // Robinhood green
const DOWN_COLOR = "#DC2626"; // strong red
const HIGHWAY_BLACK = "#1C1C1C";
const HIGHWAY_YELLOW = "#F2C200";

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

const SERVICE_TYPE_LABEL: Record<ServiceEvent["type"], string> = {
  "oil-change": "Oil + Filter",
  "tires": "Tires",
  "brakes": "Brakes",
  "annual": "Annual Service",
  "inspection": "Inspection",
  "detailing": "Detailing",
  "track-prep": "Track Prep",
};

type Props = {
  vehicle: Vehicle;
  /** When set, renders a Robinhood-style price header above the chart. */
  showHeader?: boolean;
};

type HoverPayload = {
  price: number;
  t: string;
  miles?: number;
  service?: ServiceEvent | null;
};

export function PriceChart({ vehicle, showHeader = false }: Props) {
  const [tf, setTf] = useState<Timeframe>("1Y");
  const [hover, setHover] = useState<HoverPayload | null>(null);

  const history = useMemo(() => generateHistory(vehicle, tf), [vehicle, tf]);
  const first = history[0]?.price ?? vehicle.pricePerShare;
  const last = history[history.length - 1]?.price ?? vehicle.pricePerShare;

  const displayPrice = hover?.price ?? last;
  const displayMiles = hover?.miles ?? vehicle.currentMiles;

  const baseline = tf === "1D" ? vehicle.prevClose : first;
  const { diff, pct, isUp } = changeFromPrev(displayPrice, baseline);

  const lineColor = changeFromPrev(last, baseline).isUp ? UP_COLOR : DOWN_COLOR;

  // Pre-compute the max mileage in the visible window for axis scaling.
  const maxMiles = Math.max(...history.map((h) => h.miles ?? 0), vehicle.currentMiles);

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
          <p className="mt-1 text-xs text-ink-soft">
            <span className="font-mono">●</span> {displayMiles.toLocaleString()} mi{" "}
            <span className="text-mute">on the odometer</span>
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
                activePayload?: Array<{ payload?: HoverPayload }>;
              })?.activePayload;
              if (payload && payload[0]?.payload) {
                setHover(payload[0].payload);
              }
            }}
          >
            {/* Price axis (left, hidden) */}
            <YAxis yAxisId="price" domain={["dataMin - 100", "dataMax + 100"]} hide />
            {/* Mileage axis (right, hidden — different scale) */}
            <YAxis yAxisId="miles" orientation="right" domain={[0, maxMiles * 1.1]} hide />

            <ReferenceLine y={baseline} yAxisId="price" stroke="#D8D2C8" strokeDasharray="3 3" />

            <Tooltip
              cursor={{ stroke: "#8B857C", strokeDasharray: "3 3" }}
              content={(props) => (
                <ServiceTooltip
                  active={props.active}
                  payload={props.payload as unknown as Array<{ payload?: HoverPayload }>}
                />
              )}
            />

            {/* Price line — thick, colored by performance */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Mileage — highway styling: thick black solid base + yellow dashes overlay */}
            <Line
              yAxisId="miles"
              type="monotone"
              dataKey="miles"
              stroke={HIGHWAY_BLACK}
              strokeWidth={4}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              yAxisId="miles"
              type="monotone"
              dataKey="miles"
              stroke={HIGHWAY_YELLOW}
              strokeWidth={2}
              strokeDasharray="10 12"
              dot={(props) => <ServiceDot {...props} />}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
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
              t === tf ? `text-white` : "text-ink-soft hover:text-ink"
            }`}
            style={t === tf ? { backgroundColor: lineColor } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-mute">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded" style={{ backgroundColor: lineColor }} />
          Seat reference value
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-1 w-6 rounded"
            style={{
              background: `repeating-linear-gradient(90deg, ${HIGHWAY_BLACK} 0 4px, ${HIGHWAY_YELLOW} 4px 8px)`,
            }}
          />
          Odometer
        </span>
        <span className="flex items-center gap-2">
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#F2C200] text-[8px] font-bold text-black">
            ⚙
          </span>
          Service event — hover for details
        </span>
      </div>
    </div>
  );
}

// ── Service marker on the chart ────────────────────────────────────

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: HoverPayload;
};

function ServiceDot(props: DotProps) {
  const { cx, cy, payload } = props;
  if (!payload?.service || cx == null || cy == null) {
    // Recharts requires a return value — return invisible 0×0 SVG element.
    return <g />;
  }
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill={HIGHWAY_YELLOW}
        stroke={HIGHWAY_BLACK}
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fontWeight="700"
        fill={HIGHWAY_BLACK}
      >
        ⚙
      </text>
    </g>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: HoverPayload }>;
};

function ServiceTooltip(props: TooltipProps) {
  const point = props.active && props.payload?.[0]?.payload;
  if (!point) return null;
  if (!point.service) return null;

  const e = point.service;
  const date = new Date(e.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-xs rounded-lg border border-rule bg-surface px-4 py-3 text-xs shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm text-ink">{e.title}</span>
        <span className="rounded-full bg-[#F2C200] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-black">
          {SERVICE_TYPE_LABEL[e.type]}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-soft">
        <span className="text-mute">Date</span>
        <span className="text-right tabular-nums">{date}</span>
        <span className="text-mute">Odometer</span>
        <span className="text-right tabular-nums">{e.miles.toLocaleString()} mi</span>
        <span className="text-mute">Cost</span>
        <span className="text-right tabular-nums">{formatUSD(e.cost)}</span>
      </div>
      <p className="mt-3 leading-relaxed text-ink-soft">{e.detail}</p>
    </div>
  );
}
