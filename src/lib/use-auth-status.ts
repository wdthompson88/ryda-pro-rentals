"use client";

// Single source of truth for "is the visitor signed in?" on the
// client. Used by the header, footer, marketing-page CTAs, and the
// account page so the auth-CTA UI stays in sync across surfaces.
//
// Returns 'loading' on the first render (before getSession resolves)
// and after that 'anon' or 'authed'. We render the anon state during
// 'loading' so the SSR markup doesn't shift — server-rendered pages
// always paint the public CTAs first, then we hide them post-hydration
// if a session exists.

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AuthStatus = "loading" | "anon" | "authed";

// isAdmin reads app_metadata.role from the cached JWT — that's
// service-role-only writable, so users can't self-promote. The cached
// value can lag a server-side role change until the next session
// refresh; that's OK for UI affordances (showing a link to /admin).
// Anything load-bearing still re-checks server-side in requireAdmin.
function readIsAdmin(user: User | null): boolean {
  if (!user) return false;
  const meta = user.app_metadata as { role?: unknown } | undefined;
  return meta?.role === "admin";
}

// isPartner reads partner_intent from user_metadata — which IS
// user-editable, so unlike isAdmin this is purely a UI affordance
// (showing the /partner header pill). The dashboard itself is gated
// by /api/partner/me against the server-owned partner_accounts table,
// so a self-set flag buys nothing but a link to a sign-in-walled page.
function readIsPartner(user: User | null): boolean {
  if (!user) return false;
  const meta = user.user_metadata as { partner_intent?: unknown } | undefined;
  return meta?.partner_intent === true;
}

export function useAuthStatus(): {
  status: AuthStatus;
  user: User | null;
  isAdmin: boolean;
  isPartner: boolean;
} {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      // No backend wired (preview deploy without Supabase env). Treat
      // as anon so marketing UX still works and there's nothing to
      // listen to.
      setStatus("anon");
      return;
    }

    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) {
          setUser(data.session.user);
          setStatus("authed");
        } else {
          setUser(null);
          setStatus("anon");
        }
      })
      .catch(() => {
        // getSession() can throw on a corrupt local token; fall back
        // to anon rather than locking the UI in 'loading'.
        if (!cancelled) {
          setUser(null);
          setStatus("anon");
        }
      });

    // Keep the UI in sync with sign-in / sign-out events that happen
    // in this tab (form submits) or in another tab (storage event).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setUser(session.user);
        setStatus("authed");
      } else {
        setUser(null);
        setStatus("anon");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    status,
    user,
    isAdmin: readIsAdmin(user),
    isPartner: readIsPartner(user),
  };
}
