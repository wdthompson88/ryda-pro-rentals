"use client";

// Member-side data hook for the owner dashboards. Fetches
// /api/account/my-asset and exposes a loading/error/data tuple plus
// a refresh function so children can re-pull after a mutation.
//
// State machine:
//   'loading' — initial network request in flight
//   'anon'    — caller is not signed in; page should bounce to /signin
//   'not-owner' — signed in but no active shares for this asset
//   'error'   — network or server failure; data may be stale-ok
//   'owner'   — real data available

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";

export type MyAssetData = {
  asset: { type: "car" | "boat"; identifier: string };
  ownership: { shares: number; acquired_at: string | null };
  llc: {
    id: string;
    name: string;
    state: string;
    status: string;
    ein: string | null;
    formation_date: string | null;
    registered_agent_name: string | null;
  } | null;
  copartners: Array<{
    user_id_short: string;
    initials: string;
    shares: number;
    is_you: boolean;
  }>;
  payments: Array<{
    id: string;
    status: string;
    shares: number;
    total_cents: number;
    currency: string;
    funding_method: string | null;
    fulfilled_at: string | null;
    updated_at: string;
    created_at: string;
  }>;
  bookings: Array<{
    id: string;
    mode: string;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
  }>;
};

export type MyAssetState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "not-owner" }
  | { status: "error"; message: string }
  | { status: "owner"; data: MyAssetData };

export function useMyAsset(
  assetParam: string,
): { state: MyAssetState; refresh: () => Promise<void> } {
  const [state, setState] = useState<MyAssetState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await authedFetch(
        `/api/account/my-asset?asset=${encodeURIComponent(assetParam)}`,
      );
      if (res.status === 401) {
        setState({ status: "anon" });
        return;
      }
      if (res.status === 404) {
        setState({ status: "not-owner" });
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setState({
          status: "error",
          message: j.error || `Lookup failed (${res.status}).`,
        });
        return;
      }
      const data = (await res.json()) as MyAssetData;
      setState({ status: "owner", data });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Network error.",
      });
    }
  }, [assetParam]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refresh: load };
}
