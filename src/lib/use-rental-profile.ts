"use client";

// Client hook for the signed-in visitor's rental history + contact
// profile, backed by GET /api/rental-inquiry (session-gated; returns
// the caller's own rows newest-first). Two consumers:
//   - RentalInquiryForm — prefills name/phone for signed-in members
//   - /account/requests — renders the request list with status chips
//
// The endpoint's shape is { inquiries: [...] } (the select deliberately
// excludes name/phone/partner_name). Contact prefill instead comes from
// the member's own rental_profiles row, read directly with the browser
// client — 0040's RLS scopes select/insert/update to user_id = auth.uid().
// Everything is read defensively — a 401 (no session), a preview deploy
// without Supabase, or a fetch failure degrades to empty data + an
// error string, never a crash.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";

export type RentalInquiryStatus = "new" | "sent" | "booked" | "lost";

export type RentalInquiry = {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  vehicle_slug: string;
  vehicle_label: string;
  fleet?: "ryda" | "partner";
  market?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  message?: string | null;
  status: RentalInquiryStatus | string;
  created_at: string;
};

export type RentalProfile = {
  name: string;
  phone: string;
  // Stored marketing consent, or null when the row predates the column
  // / holds no boolean. Callers fall back to auth user_metadata (the
  // canonical home /signup writes) and only then to the opt-out
  // default — the inquiry form must reflect a saved opt-OUT instead of
  // silently re-ticking the box.
  marketingOptIn: boolean | null;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// The member's rental_profiles row (maintained by the inquiry API on
// every authed submit). Owner-only RLS; returns null when the row
// doesn't exist yet, the table migration hasn't been applied, or
// Supabase isn't configured — callers fall back to auth user_metadata.
async function fetchProfileRow(): Promise<RentalProfile | null> {
  if (!supabase) return null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return null;
    const { data: row } = await supabase
      .from("rental_profiles")
      .select("full_name, phone, marketing_opt_in")
      .eq("user_id", uid)
      .maybeSingle();
    if (!row) return null;
    return {
      name: asString(row.full_name),
      phone: asString(row.phone),
      marketingOptIn:
        typeof row.marketing_opt_in === "boolean" ? row.marketing_opt_in : null,
    };
  } catch {
    return null;
  }
}

export function useRentalProfile(enabled: boolean): {
  loading: boolean;
  inquiries: RentalInquiry[];
  profile: RentalProfile | null;
  error: string | null;
  refresh: () => void;
} {
  const [loading, setLoading] = useState(enabled);
  const [inquiries, setInquiries] = useState<RentalInquiry[]>([]);
  const [profile, setProfile] = useState<RentalProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the fetch effect (e.g. after a new inquiry).
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      // Anon (or auth still resolving): nothing to fetch. Don't hold
      // consumers in a loading state they can't exit.
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // History + profile in parallel; a failure of either half never
        // sinks the other.
        const [res, profileRow] = await Promise.all([
          authedFetch("/api/rental-inquiry"),
          fetchProfileRow(),
        ]);
        if (cancelled) return;
        setProfile(profileRow);
        if (!res.ok) {
          // 401 = session missing/expired; anything else = server-side
          // problem. Both surface as a soft error, not a throw.
          setInquiries([]);
          setError(
            res.status === 401
              ? "Sign in to see your rental requests."
              : "Could not load your requests. Try again in a moment.",
          );
          return;
        }
        const json: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        const rows = Array.isArray((json as { inquiries?: unknown })?.inquiries)
          ? ((json as { inquiries: RentalInquiry[] }).inquiries)
          : [];
        setInquiries(rows);
      } catch {
        if (!cancelled) {
          setInquiries([]);
          setProfile(null);
          setError("Could not load your requests. Try again in a moment.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, nonce]);

  return { loading, inquiries, profile, error, refresh };
}
