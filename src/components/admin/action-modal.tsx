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

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * What Tab is allowed to reach inside the dialog. Deliberately narrow —
 * everything this modal renders is a button, a textarea or a checkbox.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The dialog's buttons are now genuinely reachable by keyboard, so they
 * need to be visible when they are reached. An outline rather than a
 * ring, and never beside `focus:outline-none` — the same treatment
 * rental-booking-display.ts's FOCUS_RING documents, inlined so this
 * admin component takes no rental import.
 */
const MODAL_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red";

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

  /**
   * FOCUS, ESCAPE AND TAB — none of which the dialog used to manage.
   *
   * The only focus management here was `autoFocus` on the ops-note
   * textarea, and Escape was bound to the overlay div's own onKeyDown.
   * That held for as long as every caller passed a note label. It stops
   * holding the moment one passes `noteLabel: false` (the operator's
   * Approve / Decline / Propose doors): the dialog renders with nothing
   * but two buttons, no focus ever moves into it, and because the
   * keydown originates on the element that still has focus — the trigger
   * BEHIND the overlay — Escape never fires. Worse, `{modal}` is
   * typically rendered above the list it belongs to, so tabbing forward
   * from the trigger walks into the page rather than into the dialog.
   *
   * So: move focus in on open, trap Tab inside, listen for Escape on the
   * document, and hand focus back to whatever opened it on close. The
   * textarea keeps `autoFocus`, and it is the first focusable element
   * when it is rendered, so nothing changes for the admin callers.
   */
  const panelRef = useRef<HTMLDivElement | null>(null);
  // finish() closes over `note` and `checked`, so it changes identity on
  // every keystroke. The listener below is installed once per open and
  // reads the current one through this.
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!config) return;
    const panel = panelRef.current;
    if (!panel) return;

    const restoreTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

    // The textarea's autoFocus already did this when it is rendered;
    // this is what covers the dialogs that have no textarea.
    if (!panel.contains(document.activeElement)) {
      (focusable()[0] ?? panel).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finishRef.current(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const inside = !!active && panel.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // A no-op when the trigger was unmounted by the action itself.
      restoreTo?.focus?.();
    };
  }, [config]);

  const modal = config ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-rule bg-surface p-6 shadow-xl focus:outline-none"
      >
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
            className={`inline-flex h-9 items-center rounded-full border border-rule bg-cream-2 px-4 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink ${MODAL_FOCUS}`}
          >
            {config.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => finish(true)}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${MODAL_FOCUS} ${
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
