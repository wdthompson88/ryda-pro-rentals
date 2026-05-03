"use client";

// Client island for the account page. Calls supabase.auth.signOut(),
// which clears the local session and emits an auth-state-change event
// that the rest of the app listens to (header swaps the Account button
// back to Log in / Sign up, marketing CTAs reappear). After sign-out
// we route to the splitter home — that's the "logged out" landing.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function SignOutButton({
  className,
  redirectTo = "/",
  children,
}: {
  className?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      // Replace (not push) so the back button doesn't bring the user
      // back to /account in a half-authed state.
      router.replace(redirectTo);
      // Force a hard refresh of any server components that may have
      // baked in auth state — belt-and-suspenders since most of our
      // auth-dependent UI is client-rendered.
      router.refresh();
    } catch (err) {
      console.error("[sign-out]", err);
      // If sign-out failed, at least clear the loading state so the
      // button is clickable again.
      setSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className={
        className ??
        "inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {signingOut ? "Signing out…" : (children ?? "Sign out")}
    </button>
  );
}
