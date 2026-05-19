"use client";

// Opt-in browser desktop notifications for the admin console. When
// the overview poll lands new pending purchases or transfers we haven't
// seen before, fire a Notification. Permission state is owned here so
// the RefreshBar can show an "Enable notifications" affordance.
//
// Notes:
//   - Notifications require user-gesture permission. We never auto-ask
//     on mount; the admin clicks the toggle which calls request().
//   - Permission state is read on every render so the UI reflects
//     OS-level changes (revoking from the browser settings, etc.).
//   - The diff is anchored to ids, not counts, so we don't double-fire
//     after a refund flips a pending purchase to refunded (different id
//     not in the new pending set).

import { useCallback, useEffect, useRef, useState } from "react";

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

export function useNewPendingNotifier(opts: {
  /** Current ids in the pending sets (purchases + transfers). */
  pendingPurchaseIds: string[];
  pendingTransferIds: string[];
  /** Only fire after this becomes true. Use to skip the first load. */
  armed: boolean;
}): {
  permission: NotifyPermission;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  request: () => Promise<void>;
} {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotifyPermission>(() =>
    detectPermission(),
  );

  const prevPurchaseIds = useRef<Set<string>>(new Set());
  const prevTransferIds = useRef<Set<string>>(new Set());
  const armedRef = useRef(false);

  // Resync permission state on focus (catches revokes from browser settings).
  useEffect(() => {
    const onFocus = () => setPermission(detectPermission());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res as NotifyPermission);
      if (res === "granted") setEnabled(true);
    } catch {
      setPermission("denied");
    }
  }, []);

  // Diff against previous pending sets, fire notifications, and update
  // the refs. Runs on every render but the ref short-circuits the
  // first armed pass and only fires for genuinely new ids.
  useEffect(() => {
    if (!opts.armed) return;

    const newPurchases = opts.pendingPurchaseIds.filter(
      (id) => !prevPurchaseIds.current.has(id),
    );
    const newTransfers = opts.pendingTransferIds.filter(
      (id) => !prevTransferIds.current.has(id),
    );

    if (armedRef.current && enabled && permission === "granted") {
      if (newPurchases.length > 0) {
        fire(
          `${newPurchases.length} new pending purchase${newPurchases.length === 1 ? "" : "s"}`,
          "Pending purchases need admin review.",
        );
      }
      if (newTransfers.length > 0) {
        fire(
          `${newTransfers.length} new pending transfer${newTransfers.length === 1 ? "" : "s"}`,
          "Share transfer awaiting RYDA review.",
        );
      }
    }

    prevPurchaseIds.current = new Set(opts.pendingPurchaseIds);
    prevTransferIds.current = new Set(opts.pendingTransferIds);
    armedRef.current = true;
  }, [
    opts.armed,
    opts.pendingPurchaseIds,
    opts.pendingTransferIds,
    enabled,
    permission,
  ]);

  return {
    permission,
    enabled,
    setEnabled,
    request,
  };
}

function detectPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotifyPermission;
}

function fire(title: string, body: string) {
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "ryda-admin", // reuse tag so OS coalesces a burst
    });
  } catch {
    // Some browsers throw if invoked outside the secure context or
    // with a malformed icon. Swallow.
  }
}
