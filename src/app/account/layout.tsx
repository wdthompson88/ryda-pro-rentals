"use client";

// Shared shell for every /account/* page: SiteHeader at top, sidebar
// nav on the left (lg+) or chip-strip nav above the content (sm/md),
// and the page content in the right column. Auth-gated — anon
// visitors get bounced to /signin?next=<this path> so they return
// after auth.
//
// We keep the SiteHeader at the layout level (not in each page) so
// switching between sections doesn't re-mount the header (no flicker).
// DemoBanner stays here for the same reason.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { AccountNav } from "@/components/account-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { supabase } from "@/lib/supabase";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/account";

  // Auth gate. While we resolve the session we render a quiet
  // "checking session" state — the alternative is a flash of the
  // empty layout for half a second before the redirect kicks in.
  const [authState, setAuthState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    if (!supabase) {
      // No Supabase env (preview deploy without backend wiring).
      // Treat as "ok" in dev so the demo still renders; in production
      // bounce to /signin to match the gated UX.
      if (process.env.NODE_ENV === "production") {
        router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setAuthState("ok");
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setAuthState("ok");
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (authState === "checking") {
    return (
      <>
        <SiteHeader />
        <section className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-32">
          <div className="mx-auto h-3 w-3 animate-pulse rounded-full bg-red" />
          <p className="mt-6 font-display text-xl text-ink">
            Checking your session…
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <DemoBanner />

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
          {/* Sidebar (desktop) / chip strip (mobile). On lg+ the
              sidebar is sticky so it stays visible while the content
              scrolls — feels more like a settings app. */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <AccountNav />
            {/* Sidebar-bottom sign-out (desktop only — mobile gets
                its own sign-out on the security page). Quietly
                placed so it doesn't compete with the section nav. */}
            <div className="mt-6 hidden border-t border-rule pt-6 lg:block">
              <SignOutButton className="inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-xs font-medium text-ink-soft transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </section>
    </>
  );
}
