"use client";

// The one modal shell for renter-facing surfaces: a scrim, a panel,
// focus moved in on open and handed back on close, Tab trapped inside,
// Escape and a click on the scrim both close, body scroll locked while
// it is up. Nothing about what goes inside — children own their own
// content and buttons.
//
// admin/action-modal.tsx solves the same problems for the ops console
// with a promise-based confirm/cancel API shaped around a note. This one
// is declarative (`open` in, `onClose` out) because the request dialog
// holds a small form whose state outlives a single yes/no, and it must
// be able to refuse to close while a send is in flight (`dismissable`).
//
// Design system: rounded-2xl panel on bg-surface, bg-ink/60 scrim (a
// token-driven dark island on a light site, like the photo scrims). On
// phones the panel sits at the bottom of the screen, sheet-style; from
// `sm` up it is centred. z-[100] is the site's top layer (the photo
// lightbox lives there too): the cookie banner is z-50 and later in the
// DOM, and at z-50 it painted over the sheet's bottom button on phones.

import { useEffect, useRef, type ReactNode } from "react";

/** What Tab may reach inside the panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  labelledBy,
  dismissable = true,
  children,
}: {
  open: boolean;
  /** Escape, the scrim, and any Close/Back button the children render. */
  onClose: () => void;
  /** id of the heading inside — the dialog's accessible name. */
  labelledBy: string;
  /** False while an action is in flight: Escape and the scrim do nothing. */
  dismissable?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // The listener is installed once per open and reads the current
  // callbacks through refs, so a parent re-rendering with a new inline
  // `onClose` does not re-run focus management mid-dialog.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissableRef = useRef(dismissable);
  dismissableRef.current = dismissable;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const restoreTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

    // A child may mark the element that should take focus first (the
    // first empty field, the primary action). Otherwise the first thing
    // Tab would reach, otherwise the panel itself.
    const preferred = panel.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? focusable()[0] ?? panel).focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!dismissableRef.current) return;
        e.preventDefault();
        onCloseRef.current();
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
      document.body.style.overflow = prevOverflow;
      // A no-op when the trigger was unmounted by the action itself
      // (the booking path navigates away on success).
      restoreTo?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        // The scrim only — a press that starts inside the panel and ends
        // on the scrim (a drag-select across a field) must not close it.
        if (e.target === e.currentTarget && dismissable) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-rule bg-surface p-5 shadow-xl focus:outline-none sm:p-6"
      >
        {children}
      </div>
    </div>
  );
}
