import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Sign in — RYDA" };

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

          <form className="mt-8 space-y-4">
            <Field label="Email" type="email" placeholder="you@email.com" />
            <Field label="Password" type="password" placeholder="••••••••" />
            <button
              type="button"
              className="mt-2 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs">
            <Link href="/forgot-password" className="text-ink-soft hover:text-ink">
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
