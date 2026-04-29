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
          <h1 className="mt-3 font-display text-3xl text-ink">Start your application.</h1>
          <p className="mt-2 text-sm text-ink-soft">
            We review every applicant before Miami launch. Click below to walk
            through the full guided onboarding — identity verification,
            preferences, and a few questions about you.
          </p>

          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
          >
            Begin onboarding →
          </Link>

          <p className="mt-6 text-xs text-mute">
            Onboarding takes about 8 minutes. You can save and return at any
            point. By starting, you agree to RYDA's{" "}
            <Link href="/legal/terms" className="underline hover:text-ink">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="underline hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>

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
