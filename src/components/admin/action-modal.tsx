"use client";

// Reusable confirmation + ops-note modal for admin actions. Drop-in
// replacement for the window.confirm() + window.prompt() pattern that
// used to power every action button on /admin. Cleaner UX, multi-line
// notes, keyboard friendly (Enter confirms, Esc cancels), and matches
// the rest of the site's design system instead of looking like 1998.
//
// Usage (within a client component):
//
//   const { open, modal } = useActionModal();
//   const res = await open({
//     title: "Mark purchase as paid",
//     message: "This will flip the purchase to status=paid and trigger amendment generation.",
//     noteLabel: "Optional ops note",
//     confirmLabel: "Mark paid",
//     tone: "default",
//   });
//   if (!res.confirmed) return;
//   await fetch(..., { body: JSON.stringify({ note: res.note }) });
//
// Render `{modal}` once near the root of the page; subsequent open()
// calls reuse the same overlay.

import { useCallback, useRef, useState } from "react";

export type ActionModalConfig = {
  title: string;
  /** Rendered with `whitespace-pre-line`, so "\n\n" makes paragraphs —
   *  disclosure messages (what exactly is about to be linked/paused)
   *  need more than one sentence. */
  message: string;
  /** Label above the note textarea. Set to false to hide the textarea entirely. */
  noteLabel?: string | false;
  /** Force the note to be non-empty. Default false. */
  noteRequired?: boolean;
  /** Pre-fill the note textarea. */
  initialNote?: string;
  /** Renders an opt-in checkbox above the buttons. Use it when the
   *  action has a SECOND, separately destructive side effect that must
   *  never happen implicitly (e.g. "also pause the linked operator").
   *  Its state comes back as `checked`. */
  checkboxLabel?: string;
  /** Initial checkbox state. Defaults to false — an opt-in must start off. */
  checkboxDefault?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" gives the confirm button the red destructive treatment. */
  tone?: "default" | "danger";
};

export type ActionModalResult = {
  confirmed: boolean;
  note: string;
  /** State of the opt-in checkbox; always false when none was configured. */
  checked: boolean;
};

type Resolver = (r: ActionModalResult) => void;

export function useActionModal(): {
  open: (cfg: ActionModalConfig) => Promise<ActionModalResult>;
  modal: React.ReactNode;
} {
  const [config, setConfig] = useState<ActionModalConfig | null>(null);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const open = useCallback((cfg: ActionModalConfig) => {
    setConfig(cfg);
    setNote(cfg.initialNote ?? "");
    setChecked(cfg.checkboxDefault === true);
    setError(null);
    return new Promise<ActionModalResult>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const finish = useCallback(
    (confirmed: boolean) => {
      const cfg = config;
      if (!cfg) return;
      if (
        confirmed &&
        cfg.noteRequired &&
        cfg.noteLabel !== false &&
        note.trim().length === 0
      ) {
        setError("Note required.");
        return;
      }
      resolverRef.current?.({
        confirmed,
        note: note.trim(),
        checked: cfg.checkboxLabel ? checked : false,
      });
      resolverRef.current = null;
      setConfig(null);
      setNote("");
      setChecked(false);
      setError(null);
    },
    [config, note, checked],
  );

  const modal = config ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") finish(false);
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-6 shadow-xl">
        <h3
          id="action-modal-title"
          className="font-display text-lg font-medium text-ink"
        >
          {config.title}
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {config.message}
        </p>

        {config.noteLabel !== false && (
          <label className="mt-5 block">
            <span className="text-xs font-medium uppercase tracking-wider text-mute">
              {config.noteLabel ?? "Ops note"}
              {config.noteRequired ? " · required" : " · optional"}
            </span>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  finish(true);
                }
              }}
              rows={3}
              placeholder="What's the context for this action? Surfaces in the audit log."
              className="mt-2 w-full rounded-lg border border-rule bg-cream-2 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
            {error && (
              <span className="mt-1 block text-xs text-red">{error}</span>
            )}
          </label>
        )}

        {config.checkboxLabel && (
          <label className="mt-5 flex items-start gap-2.5 rounded-lg border border-rule bg-cream-2 px-3 py-2.5">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-red"
            />
            <span className="text-xs leading-relaxed text-ink-soft">
              {config.checkboxLabel}
            </span>
          </label>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="inline-flex h-9 items-center rounded-full border border-rule bg-cream-2 px-4 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            {config.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => finish(true)}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              config.tone === "danger"
                ? "border-red bg-red text-cream hover:bg-red-deep"
                : "border-ink bg-ink text-cream hover:bg-red hover:border-red"
            }`}
          >
            {config.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { open, modal };
}
