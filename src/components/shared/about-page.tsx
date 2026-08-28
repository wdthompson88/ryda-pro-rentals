import Image from "next/image";
import Link from "next/link";
import { HiddenWhenAuthed } from "@/components/auth-aware";

export type AboutPerson = {
  name: string;
  role: string;
  bio: string;
  image?: string;
};

export type AboutFact = {
  label: string;
  value: string;
};

export type AboutPageData = {
  accent: "red" | "marine";
  hero: {
    eyebrow: string;
    title: React.ReactNode;
    body: string;
  };
  story: {
    title: string;
    paragraphs: string[];
  };
  founderLetter: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    signer: AboutPerson;
    links: { href: string; label: string; authedHidden?: boolean }[];
  };
  mission: {
    eyebrowClassName?: string;
    quote: string;
    tinted?: boolean;
    values: { title: string; body: string }[];
  };
  team:
    | {
        mode: "cards";
        title: string;
        body: string;
        people: AboutPerson[];
      }
    | {
        mode: "link";
        title: string;
        body: string;
        href: string;
        label: string;
      };
  hq: {
    title: string;
    facts: AboutFact[];
  };
  cta: {
    title: string;
    body: string;
    links: { href: string; label: string; variant?: "primary" | "secondary"; authedHidden?: boolean }[];
  };
};

export function AboutPageTemplate({ data }: { data: AboutPageData }) {
  const accentText = data.accent === "marine" ? "text-marine" : "text-red";
  const accentHover = data.accent === "marine" ? "hover:bg-marine" : "hover:bg-red";
  const inverseHover = data.accent === "marine" ? "hover:bg-marine" : "hover:bg-red";

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
            {data.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {data.hero.title}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {data.hero.body}
          </p>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">{data.story.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            {data.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accentText}`}>
            {data.founderLetter.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
            {data.founderLetter.title}
          </h2>
          <div className="mt-10 space-y-5 text-base leading-relaxed text-ink-soft">
            {data.founderLetter.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-4">
            {data.founderLetter.signer.image && (
              <Image
                src={data.founderLetter.signer.image}
                alt={data.founderLetter.signer.name}
                width={56}
                height={56}
                className="rounded-full object-cover"
                style={{ filter: "grayscale(100%) contrast(1.05)" }}
              />
            )}
            <div>
              <p className="font-display text-base text-ink">{data.founderLetter.signer.name}</p>
              <p className="text-xs uppercase tracking-wider text-mute">
                {data.founderLetter.signer.role}
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {data.founderLetter.links.map((link) => {
              const node = (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    link.authedHidden
                      ? `inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream ${accentHover}`
                      : "inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
                  }
                >
                  {link.label}
                </Link>
              );
              return link.authedHidden ? <HiddenWhenAuthed key={link.href}>{node}</HiddenWhenAuthed> : node;
            })}
          </div>
        </div>
      </section>

      <section className={`border-b border-rule ${data.mission.tinted ? "bg-cream-2" : ""}`}>
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className={`text-xs font-medium uppercase tracking-[0.2em] ${data.mission.eyebrowClassName ?? accentText}`}>
            Mission
          </p>
          <p className="mt-4 max-w-3xl font-display text-2xl leading-tight text-ink sm:text-3xl">
            {data.mission.quote}
          </p>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.mission.values.map((value, i) => (
              <div key={value.title} className="rounded-2xl border border-rule bg-surface p-6">
                <p className={`font-display text-2xl ${accentText}`}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 font-display text-xl text-ink">{value.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id={data.team.mode === "cards" ? "founders" : undefined} className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">{data.team.title}</h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">{data.team.body}</p>
          {data.team.mode === "cards" ? (
            <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
              {data.team.people.map((person) => (
                <Founder key={person.name} person={person} accentText={accentText} />
              ))}
            </div>
          ) : (
            <Link
              href={data.team.href}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-ink px-7 text-sm font-medium text-ink hover:bg-ink hover:text-cream"
            >
              {data.team.label}
            </Link>
          )}
        </div>
      </section>

      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">{data.hq.title}</h2>
          <dl className="mt-8 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2">
            {data.hq.facts.map((fact) => (
              <Fact key={fact.label} fact={fact} />
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">{data.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">{data.cta.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {data.cta.links.map((link) => {
              const node = (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    link.variant === "secondary"
                      ? "inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
                      : `inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink ${inverseHover} hover:text-cream`
                  }
                >
                  {link.label}
                </Link>
              );
              return link.authedHidden ? <HiddenWhenAuthed key={link.href}>{node}</HiddenWhenAuthed> : node;
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function Founder({ person, accentText }: { person: AboutPerson; accentText: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-8">
      <div className="relative aspect-square w-32 overflow-hidden rounded-full bg-ink/10">
        {person.image && (
          <Image
            src={person.image}
            alt={person.name}
            fill
            sizes="128px"
            className="object-cover"
            style={{ filter: "grayscale(100%) contrast(1.05)" }}
          />
        )}
      </div>
      <p className="mt-6 font-display text-xl text-ink">{person.name}</p>
      <p className={`mt-1 text-xs uppercase tracking-wider ${accentText}`}>{person.role}</p>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{person.bio}</p>
    </div>
  );
}

function Fact({ fact }: { fact: AboutFact }) {
  return (
    <div className="bg-surface p-5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        {fact.label}
      </dt>
      <dd className="mt-2 font-display text-lg text-ink">{fact.value}</dd>
    </div>
  );
}
