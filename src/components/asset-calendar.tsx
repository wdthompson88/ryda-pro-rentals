"use client";

import { useEffect, useState } from "react";

// AssetCalendar — month grid that reads bookings from /api/bookings
// for a single asset (vehicle or boat). Falls back to demo badges if
// the fetch fails (auth missing, preview deploy, etc.) so the marketing
// view of /my-cars and /my-boats still demos cleanly.
//
// Each cell is one day. Up to 5 co-owners can have overlapping bookings
// on different days; the same day for the same asset can only be one
// active booking thanks to the API's conflict-detection.

type BookingRow = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "confirmed" | "in-progress" | "completed" | "canceled";
};

const ACTIVE = new Set<BookingRow["status"]>(["pending", "confirmed", "in-progress"]);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Vertical = "cars" | "boats";

export function AssetCalendar({
  vehicleSymbol,
  boatSlug,
  vertical = "cars",
  currentUserId,
}: {
  vehicleSymbol?: string;
  boatSlug?: string;
  vertical?: Vertical;
  currentUserId?: string;
}) {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (vehicleSymbol) params.set("vehicleSymbol", vehicleSymbol);
        if (boatSlug) params.set("boatSlug", boatSlug);
        params.set("upcoming", "1");
        const res = await fetch(`/api/bookings?${params.toString()}`);
        if (cancelled) return;
        if (res.ok) {
          const j = await res.json();
          if (Array.isArray(j.bookings)) setBookings(j.bookings);
        }
      } catch {
        // Silent — fall back to demo state.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleSymbol, boatSlug]);

  // Compute the month grid: current month + offset.
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = `${MONTH_LABELS[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const startWeekday = monthStart.getDay(); // 0 = Sun

  // Real cell data: for each day in the month, find any active booking.
  type CellState = { day: number; badge: BadgeState | null };
  type BadgeState = { color: string; label: string };
  const cells: CellState[] = [];
  // Empty leading cells.
  for (let i = 0; i < startWeekday; i++) cells.push({ day: 0, badge: null });

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let badge: BadgeState | null = null;

    if (bookings && bookings.length > 0) {
      // Real booking match: find any active booking covering this date.
      const hit = bookings.find((b) => {
        if (!ACTIVE.has(b.status)) return false;
        return iso >= b.start_date && iso <= b.end_date;
      });
      if (hit) {
        const isYou = currentUserId && hit.user_id === currentUserId;
        badge = isYou
          ? { color: "#DC4747", label: "You" }
          : { color: "#9A9590", label: "Other" };
      }
    } else if (loaded) {
      // Demo fallback once the fetch has resolved (and didn't return
      // any rows). Mirrors the original sample-data pattern.
      if (monthOffset === 0) {
        if (d === 12 || d === 13) badge = { color: "#DC4747", label: "You" };
        else if (d === 23 || d === 24 || d === 25)
          badge = { color: "#9A9590", label: "Other" };
        else if (d === 1) badge = { color: "#3A3A3E", label: "Service" };
      }
    }
    cells.push({ day: d, badge });
  }
  // Pad trailing cells to make the grid a clean rectangle.
  while (cells.length % 7 !== 0) cells.push({ day: 0, badge: null });

  const accent = vertical === "boats" ? "marine" : "red";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{monthLabel}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthOffset((n) => n - 1)}
            className="h-8 w-8 rounded-full border border-rule text-ink-soft hover:border-ink hover:text-ink"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((n) => n + 1)}
            className="h-8 w-8 rounded-full border border-rule text-ink-soft hover:border-ink hover:text-ink"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="grid grid-cols-7 border-b border-rule text-xs font-medium uppercase tracking-wider text-mute">
          {DAY_LABELS.map((d) => (
            <div key={d} className="px-3 py-3 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => (
            <div
              key={i}
              className="aspect-square border-b border-r border-rule p-2 text-xs last:border-r-0 [&:nth-child(7n)]:border-r-0"
            >
              {c.day > 0 && <span className="text-ink-soft">{c.day}</span>}
              {c.badge && (
                <div className="mt-1">
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-cream"
                    style={{ backgroundColor: c.badge.color }}
                  >
                    {c.badge.label}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-mute">
        {bookings && bookings.length > 0
          ? "Live calendar — bookings on this asset across all co-owners."
          : loaded
            ? "Sample calendar — sign in to see real bookings."
            : "Loading…"}
        {accent === "marine" ? " " : null}
      </p>
    </div>
  );
}
