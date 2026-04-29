"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[80vh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-10">
          <h1 className="font-display text-3xl text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Welcome back. Members only.
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/contact?type=Membership#form";
            }}
          >
            <Field label="Email" type="email" placeholder="you@email.com" />
            <Field label="Password" type="password" placeholder="••••••••" />
          </form>

          <p className="mt-6 rounded-xl border border-rule bg-cream-2/40 px-4 py-3 text-xs leading-relaxed text-ink-soft">
            Member sign-in goes live with the Miami launch. If you're a
            founding member who needs early access,{" "}
            <Link href="/contact" className="font-medium text-red hover:text-red-deep">
              reach out
            </Link>
            .
          </p>

          <div className="mt-6 flex items-center justify-between text-xs">
            <Link href="/contact" className="text-ink-soft hover:text-ink">
              Forgot password?
            </Link>
            <Link href="/" className="text-ink-soft hover:text-ink">
              Use magic link instead
            </Link>
          </div>

          <div className="mt-10 border-t border-rule pt-6 text-center text-sm text-ink-soft">
            Not a member yet?{" "}
            <Link href="/signup" className="text-red hover:text-red-deep">
              Apply for membership →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  type,
  placeholder,
}: {
  label: string;
  type: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}
