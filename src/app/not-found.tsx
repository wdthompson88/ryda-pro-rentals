import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Not found — RYDA" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[70vh] items-center justify-center px-6 py-20">
        <div className="text-center">
          <p className="font-display text-8xl text-red sm:text-9xl">404</p>
          <h1 className="mt-6 font-display text-3xl text-ink sm:text-4xl">
            That page took the long way home.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-soft">
            We can't find what you were looking for. Could be moved, could be
            renamed, could be a typo. Here's what we'd suggest instead:
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
            >
              Back to home →
            </Link>
            <Link
              href="/markets"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              See the fleet
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
