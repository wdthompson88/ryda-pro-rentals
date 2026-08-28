import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { HELP, getCategory } from "@/lib/help-content";

export async function generateStaticParams() {
  return HELP.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return { title: "Help" };
  return {
    title: `${cat.title} · Help`,
    description: cat.blurb,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  return (
    <>
      <SiteHeader />

      {/* Breadcrumb + hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <nav className="text-xs uppercase tracking-wider text-mute">
            <Link href="/help" className="hover:text-ink">
              Help
            </Link>{" "}
            <span className="px-2 text-rule">/</span>
            <span className="text-ink-soft">{cat.title}</span>
          </nav>

          <div className="mt-6 flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rule bg-cream-2 font-display text-lg text-red">
              {cat.icon}
            </div>
            <div>
              <h1 className="font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
                {cat.title}
              </h1>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-base text-ink-soft">{cat.blurb}</p>
        </div>
      </section>

      {/* Article list */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
          <ul className="space-y-3">
            {cat.articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/help/${cat.slug}/${a.slug}`}
                  className="block rounded-2xl border border-rule bg-surface p-6 transition-all hover:border-ink/40 hover:shadow-lg"
                >
                  <p className="font-display text-lg text-ink">{a.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {a.summary}
                  </p>
                  <p className="mt-4 text-xs font-medium text-red">Read article →</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cross-links to other categories */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wider text-mute">
            Other categories
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {HELP.filter((c) => c.slug !== cat.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/help/${c.slug}`}
                className="rounded-full border border-rule bg-surface px-4 py-2 text-sm text-ink-soft hover:text-ink"
              >
                {c.icon} {c.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {/* "We answer everything within one business day" is deleted, the
          same deletion made on /help and in help-chat. Nothing in this
          codebase measures or enforces a reply time: a contact message
          writes a contact_messages row and emails the team. This copy
          renders on every help category page, so it was the last and
          widest surviving instance of the promise. */}
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl">Didn't find your answer?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-cream/70">
            Email a real human.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cream px-6 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
