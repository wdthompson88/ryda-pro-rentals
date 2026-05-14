"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

type QueueRow = {
  id: string;
  channel: string;
  title: string | null;
  body: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  image_path: string | null;
  metadata: Record<string, unknown> | null;
  source_file: string | null;
  generation_vendor: string | null;
  generation_type: string | null;
  generation_model: string | null;
  generation_request_id: string | null;
  generation_status: string | null;
  generation_output_url: string | null;
  generation_error: string | null;
  generated_asset_path: string | null;
  generation_metadata: Record<string, unknown> | null;
};

type OutputType = "image" | "image-to-image" | "video" | "image-to-video" | "lip-sync" | "workflow";

const OUTPUT_TYPES: { value: OutputType; label: string; vendor: string }[] = [
  { value: "image", label: "Image", vendor: "muapi-image" },
  { value: "image-to-image", label: "Image edit", vendor: "muapi-i2i" },
  { value: "video", label: "Video", vendor: "muapi-video" },
  { value: "image-to-video", label: "Image to video", vendor: "muapi-i2v" },
  { value: "lip-sync", label: "Lip-sync", vendor: "muapi-lipsync" },
  { value: "workflow", label: "Workflow", vendor: "muapi-workflow" },
];

function defaultPrompt(row: QueueRow | null): string {
  if (!row) return "";
  const explicit = row.metadata?.image_prompt;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  return [row.title, row.body].filter(Boolean).join("\n\n").slice(0, 1200);
}

function safeName(row: QueueRow, ext: "png" | "mp4"): string {
  const base = (row.title || row.source_file || row.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `${base || "creative"}-${row.id.slice(0, 8)}.${ext}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function asPublicUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export default function AdminCreativePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<OutputType>("image");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [referenceImages, setReferenceImages] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [workflowId, setWorkflowId] = useState("");

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "75" });
      if (status !== "all") params.set("status", status);
      const res = await authedFetch(`/api/admin/content-queue?${params}`);
      const body = (await res.json().catch(() => ({}))) as {
        rows?: QueueRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setRows(body.rows ?? []);
      if (!selectedId && body.rows?.[0]) setSelectedId(body.rows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    setPrompt(defaultPrompt(selected));
    setModel(selected?.generation_model ?? "");
    setOutputType((selected?.generation_type as OutputType | null) ?? "image");
  }, [selected?.id]);

  async function generate() {
    if (!selected || !prompt.trim()) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    const config = OUTPUT_TYPES.find((item) => item.value === outputType) ?? OUTPUT_TYPES[0];
    const references = referenceImages
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
    const isImage = outputType === "image" || outputType === "image-to-image";
    const endpoint = isImage ? "/api/admin/generate-image" : "/api/admin/generate-video";
    const payload = isImage
      ? {
          queueId: selected.id,
          prompt: prompt.trim(),
          vendor: config.vendor,
          model: model.trim() || undefined,
          imageUrl: references[0],
          imagesList: references.length ? references : undefined,
          filename: safeName(selected, "png"),
        }
      : {
          queueId: selected.id,
          prompt: prompt.trim(),
          vendor: config.vendor,
          model: model.trim() || undefined,
          imageUrl: references[0],
          videoUrl: videoUrl.trim() || undefined,
          audioUrl: audioUrl.trim() || undefined,
          workflowId: workflowId.trim() || undefined,
          durationSec: 5,
          orientation: "vertical",
          filename: safeName(selected, "mp4"),
        };

    try {
      const res = await authedFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        requestId?: string | null;
      };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setNotice(`Generated ${body.url || "asset"}${body.requestId ? ` · ${body.requestId}` : ""}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = asPublicUrl(
    selected?.generated_asset_path ||
      selected?.generation_output_url ||
      selected?.image_path ||
      null,
  );
  const selectedOutputType = OUTPUT_TYPES.find((item) => item.value === outputType);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Creative generation
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Marketing creative queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Generate and inspect RYDA campaign assets while keeping Supabase
              queue states and publisher approval gates as the source of truth.
            </p>
          </div>
          <Link href="/admin" className="text-xs font-medium text-ink-soft hover:text-ink">
            Back to admin
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-rule bg-cream px-3 py-2 text-sm text-ink"
          >
            {["all", "draft", "approved", "scheduled", "published", "failed"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-rule px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            Refresh
          </button>
          {notice && <p className="text-sm text-success">{notice}</p>}
          {error && <p className="text-sm text-red">{error}</p>}
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-rule bg-cream">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rule bg-cream-2 text-xs uppercase tracking-[0.16em] text-mute">
                <tr>
                  <th className="px-4 py-3">Queue item</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Creative</th>
                  <th className="px-4 py-3">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-6 text-mute" colSpan={4}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-mute" colSpan={4}>No queue rows found.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`cursor-pointer border-b border-rule last:border-0 ${
                        selected?.id === row.id ? "bg-red/5" : "hover:bg-cream-2"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{row.title || "Untitled"}</div>
                        <div className="mt-1 max-w-xl truncate text-xs text-mute">
                          {row.channel} · {row.source_file || row.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{row.status}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {row.generation_status || (row.image_path ? "asset attached" : "none")}
                        {row.generation_vendor ? ` · ${row.generation_vendor}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-mute">{formatDate(row.scheduled_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <aside className="rounded-lg border border-rule bg-cream p-5">
            {!selected ? (
              <p className="text-sm text-mute">Select a queue row.</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mute">Selected</p>
                  <h2 className="mt-1 text-lg font-medium text-ink">{selected.title || "Untitled"}</h2>
                  <p className="mt-1 text-xs text-ink-soft">{selected.id}</p>
                </div>

                {previewUrl && (
                  outputType.includes("video") || previewUrl.endsWith(".mp4") ? (
                    <video src={previewUrl} controls className="aspect-video w-full rounded-md bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" className="aspect-video w-full rounded-md object-cover" />
                  )
                )}

                <label className="block text-sm font-medium text-ink">
                  Output type
                  <select
                    value={outputType}
                    onChange={(event) => setOutputType(event.target.value as OutputType)}
                    className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm"
                  >
                    {OUTPUT_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label} · {item.vendor}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-ink">
                  Model endpoint
                  <input
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder={selectedOutputType?.vendor}
                    className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm font-medium text-ink">
                  Prompt
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={7}
                    className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm"
                  />
                </label>

                {(outputType === "image-to-image" || outputType === "image-to-video" || outputType === "lip-sync") && (
                  <label className="block text-sm font-medium text-ink">
                    Reference image URLs
                    <textarea
                      value={referenceImages}
                      onChange={(event) => setReferenceImages(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm"
                    />
                  </label>
                )}

                {outputType === "lip-sync" && (
                  <>
                    <label className="block text-sm font-medium text-ink">
                      Audio URL
                      <input value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm font-medium text-ink">
                      Source video URL
                      <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm" />
                    </label>
                  </>
                )}

                {outputType === "workflow" && (
                  <label className="block text-sm font-medium text-ink">
                    Workflow ID
                    <input value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} className="mt-2 w-full rounded-md border border-rule bg-cream px-3 py-2 text-sm" />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={busy || prompt.trim().length === 0}
                  className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-cream hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Generating..." : "Generate and attach"}
                </button>

                <div className="rounded-md border border-rule bg-cream-2 p-3 text-xs text-ink-soft">
                  <div>Request: {selected.generation_request_id || "-"}</div>
                  <div>Vendor: {selected.generation_vendor || "-"}</div>
                  <div>Status: {selected.generation_status || "-"}</div>
                  <div>Asset: {selected.generated_asset_path || selected.image_path || "-"}</div>
                  {selected.generation_error && <div className="mt-2 text-red">{selected.generation_error}</div>}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </>
  );
}
