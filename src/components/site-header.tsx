import Link from "next/link";

export function SiteHeader({ inverted }: { inverted?: boolean } = {}) {
  const tone = inverted ? "text-cream/70 hover:text-cream" : "text-ink-soft hover:text-ink";
  const brand = inverted ? "text-cream" : "text-ink";
  const ctaBase = inverted
    ? "border-cream bg-cream text-ink hover:bg-red hover:text-cream hover:border-red"
    : "border-ink bg-ink text-cream hover:bg-red hover:border-red";
  return (
    <header className={`w-full border-b ${inverted ? "border-cream/20" : "border-rule"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className={`font-display text-2xl tracking-tight ${brand}`}>
          RYDA
        </Link>
        <nav className={`hidden gap-8 text-sm font-medium sm:flex ${tone}`}>
          <Link href="/markets">Markets</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/membership">Membership</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link
          href="/#waitlist"
          className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${ctaBase}`}
        >
          Join the list
        </Link>
      </div>
    </header>
  );
}
