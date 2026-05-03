"use client";

// /account/documents — every signed agreement, insurance certificate,
// and tax form the member has on file. Real OAs / MSAs / Subscription
// Agreements come from llc_amendments + document_signatures tables;
// insurance certs and K-1s are uploaded by ops.
//
// Today's view is a stub list ordered by category. Live wiring comes
// when each file is actually generated/uploaded.

import Link from "next/link";

type Category = {
  title: string;
  hint: string;
  docs: { name: string; sub: string; status: "available" | "pending" | "soon" }[];
};

const CATEGORIES: Category[] = [
  {
    title: "Co-ownership agreements",
    hint: "Signed at the time of share purchase. One set per LLC.",
    docs: [
      {
        name: "Operating Agreement · RYDA F296 LLC",
        sub: "Signed Apr 13, 2026",
        status: "available",
      },
      {
        name: "Management Services Agreement · RYDA F296 LLC",
        sub: "Signed Apr 13, 2026",
        status: "available",
      },
      {
        name: "Subscription Agreement · RYDA F296 LLC",
        sub: "Signed Apr 13, 2026",
        status: "available",
      },
      {
        name: "Member-register Amendment · RYDA F296 LLC",
        sub: "Generated Apr 13, 2026",
        status: "available",
      },
      {
        name: "Operating Agreement · RYDA MC75 LLC",
        sub: "Signed Apr 13, 2026",
        status: "available",
      },
      {
        name: "Management Services Agreement · RYDA MC75 LLC",
        sub: "Signed Apr 13, 2026",
        status: "available",
      },
    ],
  },
  {
    title: "Insurance certificates",
    hint: "One per LLC. Updated when coverage renews.",
    docs: [
      {
        name: "Certificate of Insurance · Ferrari 296 GTB",
        sub: "Term: Sep 2026 – Sep 2027",
        status: "available",
      },
      {
        name: "Certificate of Insurance · McLaren 750S Spider",
        sub: "Term: Aug 2026 – Aug 2027",
        status: "available",
      },
    ],
  },
  {
    title: "Tax forms",
    hint: "K-1 and 1099-INT, generated annually for each LLC.",
    docs: [
      {
        name: "K-1 · RYDA F296 LLC · 2026",
        sub: "Available February 2027",
        status: "soon",
      },
      {
        name: "K-1 · RYDA MC75 LLC · 2026",
        sub: "Available February 2027",
        status: "soon",
      },
    ],
  },
  {
    title: "Identity",
    hint: "Stripe Identity keeps a redacted summary; we don't store the documents themselves.",
    docs: [
      {
        name: "KYC verification summary",
        sub: "Verified Apr 13, 2026 · Stripe Identity",
        status: "available",
      },
    ],
  },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Documents
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Everything signed, on file.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Co-ownership agreements, insurance certificates, tax forms, and
          identity verification summaries — all in one place. Downloads are
          links to the file in our document storage; the original signed
          PDFs live with Dropbox Sign.
        </p>
      </header>

      {CATEGORIES.map((c) => (
        <section
          key={c.title}
          className="rounded-2xl border border-rule bg-surface p-6 sm:p-8"
        >
          <h2 className="font-display text-lg text-ink">{c.title}</h2>
          <p className="mt-1 text-xs text-mute">{c.hint}</p>
          <ul className="mt-5 divide-y divide-rule">
            {c.docs.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{d.name}</p>
                  <p className="text-xs text-mute">{d.sub}</p>
                </div>
                <DocStatus status={d.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-mute">
        Need a fresh copy of an agreement?{" "}
        <Link href="/contact?type=Documents" className="text-red hover:text-red-deep">
          Contact RYDA legal
        </Link>{" "}
        and we'll re-send the signed PDF directly.
      </p>
    </div>
  );
}

function DocStatus({ status }: { status: "available" | "pending" | "soon" }) {
  if (status === "available") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 items-center justify-center rounded-full border border-rule bg-cream-2 px-4 text-xs font-medium text-ink transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
      >
        Download → ships at launch
      </button>
    );
  }
  return (
    <span className="text-xs text-mute">
      {status === "soon" ? "Coming soon" : "Pending"}
    </span>
  );
}
