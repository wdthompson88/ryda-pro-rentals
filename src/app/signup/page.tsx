import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Apply — RYDA" };

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[80vh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Apply for membership
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">Create your account.</h1>
          <p className="mt-2 text-sm text-ink-soft">
            We review every application. Expect a response within 5 business days.
          </p>

          <form className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" type="text" />
              <Field label="Last name" type="text" />
            </div>
            <Field label="Email" type="email" placeholder="you@email.com" />
            <Field label="Phone" type="tel" placeholder="+1 (xxx) xxx-xxxx" />
            <Field label="Password" type="password" placeholder="At least 12 characters" />
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-mute">
                Market interest
              </label>
              <select className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20">
                <option>Miami (launching Q3 2026)</option>
                <option>Los Angeles (Q1 2027)</option>
                <option>New York (Q3 2027)</option>
                <option>Other</option>
              </select>
            </div>
            <label className="flex items-start gap-3 text-xs text-ink-soft">
              <input type="checkbox" className="mt-0.5 accent-red" />
              <span>
                I agree to RYDA's{" "}
                <Link href="/legal/terms" className="underline hover:text-ink">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
                I confirm I am 28 years or older.
              </span>
            </label>
            <button
              type="button"
              className="mt-2 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              Submit application
            </button>
          </form>

          <div className="mt-10 border-t border-rule pt-6 text-center text-sm text-ink-soft">
            Already a member?{" "}
            <Link href="/signin" className="text-red hover:text-red-deep">
              Sign in →
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
