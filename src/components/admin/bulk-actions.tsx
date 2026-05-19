"use client";

// Bulk-action primitives for admin tables. The hook tracks the
// selected row ids; the toolbar renders an action menu plus a
// per-action progress bar while the batch runs.
//
// All bulk actions are implemented client-side as a controlled loop
// over the per-row endpoints we already have. That keeps server work
// idempotent and small; the loop respects a concurrency cap so we
// don't slam Stripe / Resend if an admin selects 50 rows.

import { useCallback, useState } from "react";
import type { ActionModalConfig } from "@/components/admin/action-modal";

// Selection helpers operate on plain string ids so the type stays
// invariant — the Table primitive in /admin/page.tsx doesn't need to
// know the concrete row type to wire its checkbox column.
export type BulkSelection = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: { id: string }[]) => void;
  clear: () => void;
  count: number;
  has: (id: string) => boolean;
  all: (ids: { id: string }[]) => boolean;
};

export function useBulkSelection(): BulkSelection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: { id: string }[]) => {
    setSelected((prev) => {
      const allHere = ids.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allHere) ids.forEach((r) => next.delete(r.id));
      else ids.forEach((r) => next.add(r.id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const has = useCallback((id: string) => selected.has(id), [selected]);
  const all = useCallback(
    (ids: { id: string }[]) =>
      ids.length > 0 && ids.every((r) => selected.has(r.id)),
    [selected],
  );

  return { selected, toggle, toggleAll, clear, count: selected.size, has, all };
}

export type BulkActionRunner = (
  ids: string[],
  cfg: {
    modal: ActionModalConfig;
    runOne: (id: string, note: string) => Promise<void>;
    onProgress?: (done: number, total: number) => void;
  },
) => Promise<{ ok: number; failed: number; errors: string[] }>;

export type BulkToolbarProps<T extends { id: string }> = {
  rows: T[];
  selection: BulkSelection;
  /** Render the per-action buttons. Each receives the selected ids and
   *  a runOne(id, note) callback that does the actual mutation. */
  actions: Array<{
    label: string;
    tone?: "default" | "danger";
    /** Visible only when at least one selected row matches. */
    canRun: (rows: T[]) => boolean;
    onClick: (selectedIds: string[]) => Promise<void> | void;
  }>;
};

export function BulkToolbar<T extends { id: string }>({
  rows,
  selection,
  actions,
}: BulkToolbarProps<T>) {
  if (selection.count === 0) return null;
  const selectedRows = rows.filter((r) => selection.has(r.id));

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-cream-2/60 px-4 py-2 text-xs">
      <span className="font-medium text-ink">
        {selection.count} selected
      </span>
      <button
        type="button"
        onClick={selection.clear}
        className="text-mute hover:text-ink-soft"
      >
        Clear
      </button>
      <span className="mx-1 text-mute/40">·</span>
      {actions
        .filter((a) => a.canRun(selectedRows))
        .map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() =>
              void a.onClick(Array.from(selection.selected))
            }
            className={`inline-flex h-7 items-center rounded-full border px-3 font-medium transition-colors ${
              a.tone === "danger"
                ? "border-red/40 text-red hover:bg-red hover:text-cream"
                : "border-rule text-ink-soft hover:border-ink hover:text-ink"
            }`}
          >
            {a.label}
          </button>
        ))}
    </div>
  );
}

/** Run a bulk action client-side with bounded concurrency. */
export async function runBulk(
  ids: string[],
  runOne: (id: string) => Promise<void>,
  opts: {
    concurrency?: number;
    onProgress?: (done: number, total: number, failed: number) => void;
  } = {},
): Promise<{ ok: number; failed: number; errors: string[] }> {
  const concurrency = opts.concurrency ?? 3;
  const errors: string[] = [];
  let ok = 0;
  let failed = 0;
  let done = 0;
  const queue = [...ids];

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) return;
      try {
        await runOne(id);
        ok += 1;
      } catch (e) {
        failed += 1;
        errors.push(
          `${id.slice(0, 8)}: ${e instanceof Error ? e.message : "failed"}`,
        );
      } finally {
        done += 1;
        opts.onProgress?.(done, ids.length, failed);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ids.length) }, worker),
  );
  return { ok, failed, errors };
}

/** Small inline progress strip rendered above a table during a batch. */
export function BulkProgress({
  done,
  total,
  failed,
}: {
  done: number;
  total: number;
  failed: number;
}) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="border-b border-rule bg-cream-2/60 px-4 py-2 text-xs">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-ink">
          Running {done} / {total}
          {failed > 0 && (
            <span className="ml-2 text-red">· {failed} failed</span>
          )}
        </span>
        <span className="text-mute">{pct}%</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-rule">
        <div
          className="h-1 bg-marine transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
