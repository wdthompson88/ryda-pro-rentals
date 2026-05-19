"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import type { SampleDocument, SampleDocumentCategory } from "@/lib/sample-documents";

type AdminSampleDocument = SampleDocument & {
  publicHref: string;
  adminHref: string;
};

type ResponseBody = {
  documents: AdminSampleDocument[];
};

const CATEGORY_ORDER: SampleDocumentCategory[] = [
  "Legal · LLC structure",
  "Vehicle · acquisition & condition",
  "Operational · use & service",
];

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<AdminSampleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/admin/sample-documents");
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setError("Your account does not have admin access.");
          return;
        }
        if (!res.ok) throw new Error(`Lookup failed (${res.status}).`);
        const body = (await res.json()) as ResponseBody;
        setDocs(body.documents);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load documents.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        docs: docs.filter((doc) => doc.category === category),
      })),
    [docs],
  );

  async function downloadAdminDoc(doc: AdminSampleDocument) {
    setBusySlug(doc.slug);
    setError(null);
    try {
      const res = await authedFetch(doc.adminHref);
      if (!res.ok) throw new Error(`Download failed (${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download document.");
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Documents
            </p>
            <h1 className="mt-3 font-display text-4xl font-light text-ink">
              Sample document library
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
              Canonical redacted sample packet for the public sample-document
              page. These are local Markdown source files in
              <code className="mx-1 rounded bg-cream-2 px-1 py-0.5 text-[12px]">
                docs/sample-documents
              </code>
              and are separate from member-specific Dropbox Sign PDFs.
            </p>
          </div>
          <Link
            href="/sample-documents"
            className="inline-flex h-10 items-center justify-center rounded-full border border-rule bg-cream-2 px-5 text-sm font-medium text-ink hover:border-ink"
          >
            View public page →
          </Link>
        </header>

        {loading && <p className="mt-8 text-sm text-mute">Loading...</p>}

        {error && (
          <div className="mt-6 rounded-xl border border-red/40 bg-red/5 p-4 text-sm text-red">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-rule bg-cream-2/40 p-5 text-sm leading-relaxed text-ink-soft">
              <p className="font-medium text-ink">Current status</p>
              <p className="mt-2">
                Public users can download these redacted samples. Admins can
                download the same canonical local files here. Final OA/MSA/
                Subscription templates still need Dropbox Sign configuration
                before member-specific e-signature PDFs are live.
              </p>
            </div>

            {grouped.map((group) => (
              <section key={group.category}>
                <h2 className="font-display text-2xl text-ink">{group.category}</h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-rule">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="border-b border-rule bg-cream-2/50 text-xs uppercase tracking-[0.14em] text-mute">
                      <tr>
                        <th className="px-5 py-3 text-left">Document</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-left">Local source</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {group.docs.map((doc) => (
                        <tr key={doc.slug} className="bg-surface">
                          <td className="px-5 py-4 align-top">
                            <p className="font-medium text-ink">{doc.title}</p>
                            <p className="mt-1 max-w-md text-xs leading-relaxed text-mute">
                              {doc.summary}
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className="rounded-full border border-rule bg-cream-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                              redacted sample
                            </span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <code className="text-[11px] text-ink-soft">
                              docs/sample-documents/{doc.filename}
                            </code>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <a
                                href={doc.publicHref}
                                className="rounded-full border border-rule bg-cream-2 px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
                              >
                                Public
                              </a>
                              <button
                                type="button"
                                onClick={() => downloadAdminDoc(doc)}
                                disabled={busySlug === doc.slug}
                                className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream hover:bg-red disabled:opacity-50"
                              >
                                {busySlug === doc.slug ? "Downloading..." : "Admin download"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

