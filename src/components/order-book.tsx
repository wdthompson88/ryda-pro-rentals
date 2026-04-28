import { Vehicle, formatUSD } from "@/lib/market-data";

type Order = { price: number; size: number };

// Deterministic order book per vehicle. Real liquidity is sparse on a
// 6-share LLC — we show 3 ask levels (sell side) and 3 bid levels (buy
// side) clustered around the current price. Same vehicle always produces
// the same book, so reloading doesn't reshuffle.
function buildOrderBook(v: Vehicle): { asks: Order[]; bids: Order[] } {
  const mid = v.pricePerShare;
  const seed = symbolSeed(v.symbol);

  // Spreads vary per vehicle (0.4% – 1.2% from mid)
  const askJitter = 0.001 + jitter(seed, 1) * 0.003;
  const bidJitter = 0.001 + jitter(seed, 2) * 0.003;

  const asks: Order[] = [
    { price: roundPrice(mid * (1 + askJitter)), size: 1 },
    { price: roundPrice(mid * (1 + askJitter + 0.006)), size: 1 },
    { price: roundPrice(mid * (1 + askJitter + 0.014)), size: pickSize(seed, 3) },
  ];

  const bids: Order[] = [
    { price: roundPrice(mid * (1 - bidJitter)), size: 1 },
    { price: roundPrice(mid * (1 - bidJitter - 0.006)), size: 1 },
    { price: roundPrice(mid * (1 - bidJitter - 0.014)), size: pickSize(seed, 4) },
  ];

  return { asks, bids };
}

export function OrderBook({ vehicle }: { vehicle: Vehicle }) {
  const { asks, bids } = buildOrderBook(vehicle);
  const lowestAsk = asks[0].price;
  const highestBid = bids[0].price;
  const spread = lowestAsk - highestBid;
  const spreadPct = (spread / lowestAsk) * 100;

  // Max size across both sides drives the relative depth bar widths.
  const maxSize = Math.max(...asks.map((a) => a.size), ...bids.map((b) => b.size));

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule bg-cream-2/40 px-5 py-3">
        <p className="font-display text-base text-ink">Order book</p>
        <div className="flex items-center gap-3 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00C805]" />
            Live · member-to-member
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 border-b border-rule px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-mute">
        <div className="col-span-4">Price</div>
        <div className="col-span-3 text-right">Shares</div>
        <div className="col-span-5 text-right">Total</div>
      </div>

      {/* Asks (sell side) — high → low so the lowest ask sits next to the spread */}
      <div className="divide-y divide-rule/60">
        {[...asks].reverse().map((o, i) => (
          <BookRow
            key={`a-${i}`}
            order={o}
            side="ask"
            depthPct={(o.size / maxSize) * 100}
          />
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-between border-y border-rule bg-cream-2/40 px-5 py-3 text-[11px]">
        <span className="font-medium uppercase tracking-wider text-mute">Spread</span>
        <span className="tabular-nums text-ink-soft">
          {formatUSD(Math.round(spread))} ({spreadPct.toFixed(2)}%)
        </span>
      </div>

      {/* Bids (buy side) — high → low so the highest bid sits next to the spread */}
      <div className="divide-y divide-rule/60">
        {bids.map((o, i) => (
          <BookRow
            key={`b-${i}`}
            order={o}
            side="bid"
            depthPct={(o.size / maxSize) * 100}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="border-t border-rule bg-cream-2/40 px-5 py-3 text-[11px] text-mute">
        {asks.reduce((n, o) => n + o.size, 0)} share{asks.reduce((n, o) => n + o.size, 0) !== 1 ? "s" : ""} offered ·{" "}
        {bids.reduce((n, o) => n + o.size, 0)} bid · 12-month minimum hold applies to new buyers.
      </div>
    </div>
  );
}

function BookRow({
  order,
  side,
  depthPct,
}: {
  order: Order;
  side: "ask" | "bid";
  depthPct: number;
}) {
  const total = order.price * order.size;
  const color = side === "ask" ? "#DC2626" : "#00A300";
  const tintColor = side === "ask" ? "rgba(220, 38, 38, 0.08)" : "rgba(0, 200, 5, 0.08)";

  return (
    <div className="relative grid grid-cols-12 items-center gap-2 px-5 py-2 text-sm">
      {/* Depth bar — anchored to the right, expands left */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0"
        style={{ width: `${depthPct}%`, background: tintColor }}
      />
      <div className="relative col-span-4 font-medium tabular-nums" style={{ color }}>
        {formatUSD(order.price)}
      </div>
      <div className="relative col-span-3 text-right tabular-nums text-ink-soft">
        {order.size}
      </div>
      <div className="relative col-span-5 text-right tabular-nums text-ink-soft">
        {formatUSD(total)}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function roundPrice(p: number): number {
  // Round to nearest $50 — feels like a real exchange tick size for assets
  // priced at $50K+ per share.
  return Math.round(p / 50) * 50;
}

function pickSize(seed: number, salt: number): number {
  // Sometimes 1, sometimes 2 — keeps the deepest level a touch bigger.
  return ((seed + salt * 7) % 3 === 0) ? 2 : 1;
}

function symbolSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Returns a deterministic value in [0, 1) given a seed and salt.
function jitter(seed: number, salt: number): number {
  const v = Math.sin(seed * 9301 + salt * 49297) * 233280;
  return v - Math.floor(v);
}
