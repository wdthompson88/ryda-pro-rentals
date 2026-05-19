"use client";

// Public curtain over the boats vertical while it finishes. Admins
// (app_metadata.role === "admin") see the real pages; everyone else
// sees the coming-soon component.
//
// Client-side gate because RYDA's browser supabase client persists
// the session to localStorage (see src/lib/supabase.ts), so the
// server never sees a usable auth cookie on its own. supabase-js's
// getUser() makes a /auth/v1/user round-trip against the cached JWT
// and returns CURRENT app_metadata, not the JWT-cached copy — so a
// freshly-granted admin role takes effect without sign-out.
//
// Reverting the gate when boats ships: delete this file (and the
// BoatsComingSoon component). The /boats/* tree is untouched.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BoatsComingSoon } from "@/components/boats-coming-soon";

export default function BoatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // null = checking, false = not admin, true = admin. Default to
  // "not admin" rendering while loading so anonymous visitors don't
  // briefly see real content. Admins see a short coming-soon flash
  // before the swap — acceptable tradeoff for an early-access gate.
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAdmin(false);
      return;
    }
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data.user) {
          setAdmin(false);
          return;
        }
        const role = (data.user.app_metadata as { role?: unknown })?.role;
        setAdmin(role === "admin");
      })
      .catch(() => {
        if (!cancelled) setAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (admin === true) return <>{children}</>;
  return <BoatsComingSoon />;
}
