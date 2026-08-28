"use client";

// Client hook for the signed-in visitor's rental history + contact
// profile, backed by GET /api/rental-inquiry (session-gated; returns
// the caller's own rows newest-first). Two consumers:
//   - RentalInquiryForm — prefills name/phone for signed-in members
//   - /account/requests — renders the request list with status chips
//
// The endpoint's shape is { inquiries: [...] } (the select deliberately
// excludes name/phone/partner_name). Contact prefill instead comes from
// the member's own rows, read directly with the browser client:
// user_profiles (0014, what /account/profile saves) and rental_profiles
// (0040, what the inquiry API upserts), then auth user_metadata. Both
// tables' RLS scope select to user_id = auth.uid(). Which source wins
// is decided in renter-contact.ts, not here.
// Everything is read defensively — a 401 (no session), a preview deploy
// without Supabase, or a fetch failure degrades to empty data + an
// error string, never a crash.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { resolveRenterContact } from "@/lib/renter-contact";
import type { RenterDetails } from "@/lib/renter-details";

export type RentalInquiryStatus = "new" | "sent" | "booked" | "lost";

export type RentalInquiry = {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  vehicle_slug: string;
  vehicle_label: string;
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
  /** 'YYYY-MM-DD' from user_profiles.date_of_birth, or "" — the confirm
   *  dialog's third required field. Lives in user_profiles alone. */
  dateOfBirth: string;
  // Stored marketing consent, or null when the row predates the column
  // / holds no boolean. Callers fall back to auth user_metadata (the
  // canonical home /signup writes) and only then to the opt-out
  // default — the inquiry form must reflect a saved opt-OUT instead of
  // silently re-ticking the box.
  marketingOptIn: boolean | null;
};

// The member's stored contact details, resolved across every place they
// get written (see renter-contact.ts for the list and the precedence).
// Owner-only RLS on both tables; either one missing on a fresh database
// reads as "no row", not a failure. Returns null when there is no
// session, Supabase isn't configured, the reads throw, or nothing at
// all is on file — callers treat null and empty strings the same way.
async function fetchProfileRow(): Promise<RentalProfile | null> {
  if (!supabase) return null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const sessionUser = sess.session?.user;
    const uid = sessionUser?.id;
    if (!uid) return null;
    // Two independent reads; a failure of one never sinks the other.
    const [rental, profile] = await Promise.all([
      supabase
        .from("rental_profiles")
        .select("full_name, phone, marketing_opt_in")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("full_name, phone, date_of_birth")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    const rentalRow = rental.data ?? null;
    const profileRow = profile.data ?? null;
    const dateOfBirth = asString(profileRow?.date_of_birth);
    const contact = resolveRenterContact({
      userProfile: profileRow,
      rentalProfile: rentalRow,
      metadata: sessionUser.user_metadata,
    });
    const marketingOptIn =
      typeof rentalRow?.marketing_opt_in === "boolean"
        ? rentalRow.marketing_opt_in
        : null;
    if (!rentalRow && !profileRow && !contact.name && !contact.phone) {
      return null;
    }
    return { name: contact.name, phone: contact.phone, dateOfBirth, marketingOptIn };
  } catch {
    return null;
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Write a renter's confirmed details to their profile. The confirm
 * dialog calls this before every send, so "you must fill in your
 * details to request" is a row on file — the one POST /api/rental-bookings
 * reads back — rather than a box that was once non-empty.
 *
 * user_profiles is canonical (what /account/profile reads); the upsert
 * names only these three columns, so the address on the same row is
 * untouched. rental_profiles is synced best-effort for the operator-
 * facing lead, mirroring the profile page's own save.
 */
export async function saveRenterDetails(
  details: RenterDetails,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const signIn = { ok: false as const, error: "Sign in to send a request." };
  if (!supabase) return signIn;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return signIn;
    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: uid,
        full_name: details.fullName,
        phone: details.phone,
        date_of_birth: details.dateOfBirth,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.warn("[rental-profile · save]", error.message);
      return {
        ok: false,
        error: "We couldn't save your details. Try again in a moment.",
      };
    }
    void supabase
      .from("rental_profiles")
      .upsert(
        {
          user_id: uid,
          full_name: details.fullName,
          phone: details.phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .then(() => {
        /* advisory sync — outcome intentionally ignored */
      });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "We couldn't save your details. Try again in a moment.",
    };
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
