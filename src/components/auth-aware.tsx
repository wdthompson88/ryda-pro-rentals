"use client";

// Tiny client-side wrappers that show or hide content based on whether
// the visitor is signed in. Used to keep the public-facing "Sign up" /
// "Log in" CTAs from showing to members who are already in. Marketing
// pages are server-rendered, so wrap the auth-CTA blocks with these
// to convert just that subtree to client-side conditional rendering.
//
// During the initial 'loading' window (before getSession resolves) we
// render the anon view — that matches the SSR markup and avoids a
// layout shift. Once auth resolves to 'authed', the public CTAs are
// hidden client-side (a sub-second flicker for the rare case of a
// signed-in user landing on a marketing page).

import type { ReactNode } from "react";
import { useAuthStatus } from "@/lib/use-auth-status";

export function HiddenWhenAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus();
  if (status === "authed") return null;
  return <>{children}</>;
}

// VisibleWhenAuthed (the symmetric inverse of HiddenWhenAuthed)
// removed in the dead-code sweep (May 2026). Anyone needing the
// inverse can re-add or use AuthSwap below — that's the more
// expressive primitive when both branches need rendering.

// Render one tree for signed-in users, another for everyone else. Used
// in the site header so the desktop slot keeps the same overall shape
// (one or two pill buttons) regardless of auth state.
export function AuthSwap({
  authed,
  anon,
}: {
  authed: ReactNode;
  anon: ReactNode;
}) {
  const { status } = useAuthStatus();
  if (status === "authed") return <>{authed}</>;
  return <>{anon}</>;
}
