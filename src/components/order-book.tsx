import { Vehicle, formatUSD } from "@/lib/market-data";

type Order = { price: number; size: number };

// Deterministic order book per vehicle. Real liquidity is sparse on a
// 6-share LLC — we show 4 ask levels and 4 bid levels clustered around
// the current price. Same vehicle always produces the same book, so
// reloading doesn't reshuffle.
function buildOrderBook(v: Vehicle): { asks: Order[]; bids: Order[]; last: number } {
  const mid = v.pricePerShare;
  const seed = symbolSeed(v.symbol);

  // Spreads vary per vehicle (0.4% – 1.2% from mid)
  const askJitter = 0.001 + jitter(seed, 1) * 0.003;
  const bidJitter = 0.001 + jitter(seed, 2) * 0.003;

  const asks: Order[] = [
    { price: roundPrice(mid * (1 + askJitter)), size: 1 },
    { price: roundPrice(mid * (1 + askJitter + 0.005)), size: 1 },
    { price: roundPrice(mid * (1 + askJitter + 0.012)), size: pickSize(seed, 3) },
    { price: roundPrice(mid * (1 + askJitter + 0.022)), size: pickSize(seed, 4) },
  ];

  const bids: Order[] = [
    { price: roundPrice(mid * (1 - bidJitter)), size: 1 },
    { price: roundPrice(mid * (1 - bidJitter - 0.005)), size: 1 },
    { price: roundPrice(mid * (1 - bidJitter - 0.012)), size: pickSize(seed, 5) },
    { price: roundPrice(mid * (1 - bidJitter - 0.022)), size: pickSize(seed, 6) },
  ];

  return { asks, bids, last: v.pricePerShare };
}

export function OrderBook({ vehicle }: { vehicle: Vehicle }) {
  const { asks, bids, last } = buildOrderBook(vehicle);
  const lowestAsk = asks[0].price;
  const highestBid = bids[0].price;
  const spread = lowestAsk - highestBid;

  // Max total$ across both sides drives the relative depth bar widths.
  const allTotals = [...asks, ...bids].map((o) => o.price * o.size);
  const maxTotal = Math.max(...allTotals);

  // Render asks high → low so the lowest ask sits next to the spread.
  const askRows = [...asks].reverse();
  const bidRows = bids;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-rule bg-surface">
      {/* Live status strip */}
      <div className="flex items-center justify-between border-b border-rule px-5 py-2.5">
        <p className="font-display text-sm text-ink">Order book</p>
        <span className="flex items-center gap-2 text-[11px] text-mute">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C805]/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C805]" />
          </span>
          Live · member-to-member
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 border-b border-rule px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-mute">
        <div className="col-span-4">Price</div>
        <div className="col-span-4 text-right">Shares</div>
        <div className="col-span-4 text-right">Total</div>
      </div>

      {/* Asks */}
      <div className="relative">
        {/* Asks pill — floating on the left edge, vertically centered on the
            row group, near the spread (bottom of the asks block). */}
        <div className="pointer-events-none absolute bottom-2 left-3 z-10">
          <span className="rounded-full bg-[#DC2626] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Asks
          </span>
        </div>
        {askRows.map((o, i) => (
          <BookRow
            key={`a-${i}`}
            order={o}
            side="ask"
            depthPct={((o.price * o.size) / maxTotal) * 100}
          />
        ))}
      </div>

      {/* Spread / last */}
      <div className="grid grid-cols-3 items-center border-y border-rule bg-cream-2/40 px-5 py-2.5 text-[11px] tracking-wider text-mute">
        <span className="text-left">
          Last: <span className="text-ink-soft tabular-nums">{formatUSD(last)}</span>
        </span>
        <span className="text-center">
          Spread:{" "}
          <span className="text-ink-soft tabular-nums">{formatUSD(Math.round(spread))}</span>
        </span>
        <span />
      </div>

      {/* Bids */}
      <div className="relative">
        {/* Bids pill — floating on the left edge, near the spread (top of the
            bids block). */}
        <div className="pointer-events-none absolute left-3 top-2 z-10">
          <span className="rounded-full bg-[#00A300] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Bids
          </span>
        </div>
        {bidRows.map((o, i) => (
          <BookRow
            key={`b-${i}`}
            order={o}
            side="bid"
            depthPct={((o.price * o.size) / maxTotal) * 100}
          />
        ))}
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
  const tintColor =
    side === "ask" ? "rgba(220, 38, 38, 0.10)" : "rgba(0, 200, 5, 0.10)";

  return (
    <div className="relative grid grid-cols-12 items-center px-5 py-2.5 text-sm">
      {/* Depth bar — anchored LEFT, expands right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0"
        style={{ width: `${depthPct}%`, background: tintColor }}
      />
      <div
        className="relative col-span-4 pl-12 font-medium tabular-nums"
        style={{ color }}
      >
        {formatUSD(order.price)}
      </div>
      <div className="relative col-span-4 text-right tabular-nums text-ink-soft">
        {order.size.toFixed(0)}.00
      </div>
      <div className="relative col-span-4 text-right tabular-nums text-ink-soft">
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
