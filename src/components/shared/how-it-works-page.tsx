import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StickyToc } from "@/components/sticky-toc";

export type TocItem = { id: string; label: string };
export type StepIcon = "search" | "signature" | "key";

export function HowItWorksPageTemplate({
  accent,
  hero,
  tocItems,
  children,
}: {
  accent: "red" | "marine";
  hero: {
    eyebrow: string;
    title: React.ReactNode;
    body: React.ReactNode;
  };
  tocItems?: TocItem[];
  children: React.ReactNode;
}) {
  const accentText = accent === "marine" ? "text-marine" : "text-red";

  return (
    <>
      <SiteHeader />
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {hero.title}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {hero.body}
          </p>
        </div>
      </section>
      {tocItems && <StickyToc items={tocItems} />}
      {children}
    </>
  );
}

export function Step({
  n,
  title,
  body,
  accent = "red",
}: {
  n: string;
  title: string;
  body: string;
  accent?: "red" | "marine";
}) {
  const accentText = accent === "marine" ? "text-marine" : "text-red";
  return (
    <div>
      <p className={`font-display text-2xl ${accentText}`}>{n}</p>
      <p className="mt-2 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

export function SimpleStep({
  n,
  title,
  body,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: StepIcon;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-5">
        <p className="font-display text-6xl font-light leading-none text-red sm:text-7xl">
          {n}
        </p>
        <span className="text-ink/40" aria-hidden>
          <StepGlyph kind={icon} />
        </span>
      </div>
      <p className="mt-5 font-display text-2xl text-ink">{title}</p>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function StepGlyph({ kind }: { kind: StepIcon }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 28 28",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "search") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="23" y2="23" />
      </svg>
    );
  }
  if (kind === "signature") {
    return (
      <svg {...common} aria-hidden>
        <path d="M3 21c2-1 4-7 6-7s2 4 4 4 3-9 5-9 2 6 4 6 3-2 3-2" />
        <line x1="3" y1="25" x2="25" y2="25" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="9" cy="14" r="4.5" />
      <line x1="13.5" y1="14" x2="25" y2="14" />
      <line x1="20" y1="14" x2="20" y2="18" />
      <line x1="24" y1="14" x2="24" y2="17" />
    </svg>
  );
}

export function Take({
  title,
  good,
  tradeoff,
  highlight,
}: {
  title: string;
  good: string;
  tradeoff: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "border-red bg-red/5" : "border-rule bg-surface"}`}>
      <p className={`font-display text-xl ${highlight ? "text-red" : "text-ink"}`}>{title}</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-mute">Right for you if</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{good}</p>
      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-mute">The trade-off</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{tradeoff}</p>
    </div>
  );
}

export function Reason({
  n,
  title,
  body,
  accent = "red",
  card = true,
}: {
  n: string;
  title: string;
  body: string;
  accent?: "red" | "marine";
  card?: boolean;
}) {
  const accentText = accent === "marine" ? "text-marine" : "text-red";
  const content = (
    <>
      <p className={`font-display ${card ? "text-2xl" : "text-sm"} ${accentText}`}>{n}</p>
      <p className={`mt-2 font-display ${card ? "text-lg" : "text-lg"} text-ink`}>{title}</p>
      <p className={`${card ? "mt-3" : "mt-2"} text-sm leading-relaxed text-ink-soft`}>{body}</p>
    </>
  );
  return card ? <div className="rounded-2xl border border-rule bg-surface p-6">{content}</div> : <div>{content}</div>;
}

export function Pillar({
  label,
  body,
  accent = "red",
  card = true,
}: {
  label: string;
  body: string;
  accent?: "red" | "marine";
  card?: boolean;
}) {
  const accentText = accent === "marine" ? "text-marine" : "text-red";
  return (
    <div className={card ? "rounded-xl border border-rule bg-surface p-4" : ""}>
      <p className={card ? `text-xs font-medium uppercase tracking-wider ${accentText}` : "font-display text-base text-ink"}>
        {label}
      </p>
      <p className={card ? "mt-1.5 text-xs leading-relaxed text-ink-soft" : "mt-2 text-sm leading-relaxed text-ink-soft"}>
        {body}
      </p>
    </div>
  );
}

export function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-2xl border border-rule bg-surface p-6 open:bg-cream-2/40">
      <summary className="cursor-pointer text-base font-medium text-ink">{q}</summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{a}</p>
    </details>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/40 p-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
    </div>
  );
}

export function BoatRow({
  label,
  a,
  b,
  c,
  d,
  emphasis,
}: {
  label: string;
  a: string;
  b: string;
  c: string;
  d: string;
  emphasis?: boolean;
}) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className={`px-6 py-4 ${emphasis ? "font-medium text-ink" : "text-ink"}`}>{label}</td>
      <td className="bg-marine/5 px-6 py-4 text-center text-ink">{d}</td>
      <td className="px-6 py-4 text-center text-ink-soft">{a}</td>
      <td className="px-6 py-4 text-center text-ink-soft">{b}</td>
      <td className="px-6 py-4 text-center text-ink-soft">{c}</td>
    </tr>
  );
}

export function Stance({
  title,
  detail,
  fit,
}: {
  title: string;
  detail: string;
  fit: "great" | "good" | "not-us";
}) {
  const ribbon =
    fit === "great"
      ? { label: "Great fit", cls: "bg-marine text-cream" }
      : fit === "good"
        ? { label: "Good fit", cls: "border border-marine text-marine" }
        : { label: "Not our fit", cls: "border border-rule text-mute" };
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-lg text-ink">{title}</p>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${ribbon.cls}`}>
          {ribbon.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

export function HowItWorksCta({
  title,
  body,
  links,
  accent = "red",
}: {
  title: string;
  body: string;
  links: { href: string; label: string; variant?: "primary" | "secondary" }[];
  accent?: "red" | "marine";
}) {
  const hover = accent === "marine" ? "hover:bg-marine" : "hover:bg-red";
  return (
    <section className="bg-ink py-20 text-cream">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
        <h2 className="font-display text-3xl sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.variant === "secondary"
                  ? "inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
                  : `inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink ${hover} hover:text-cream`
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
