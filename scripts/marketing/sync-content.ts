// sync-content.ts — read markdown drafts from ../ryda-marketing/content
// and upsert them into the content_queue table.
//
// Why: the content-marketer agent produced 72 drafts as files in
// ryda-marketing/content/<channel>/<slug>.md. The autonomous
// publisher reads from content_queue (Supabase). Bridging those
// two: this script.
//
// Source layout:
//   ryda-marketing/content/instagram/2026-19-01-wynwood-garage.md
//   ryda-marketing/content/linkedin/...
//   ryda-marketing/content/x/...
//   ryda-marketing/content/email/...
//   ryda-marketing/content/journal/...
//
// Frontmatter schema (YAML between --- markers):
//   slug:          string                 stable id (used as upsert key)
//   title:         string                 row.title
//   channel:       optional               inferred from parent dir if absent
//   scheduled_at:  ISO timestamp          row.scheduled_at
//   status:        draft|approved|...     row.status (default 'draft')
//   hashtags:      array of strings       row.hashtags
//   image_path:    string                 row.image_path
//   image_prompt:  string                 stashed in metadata.image_prompt
//                                         (used by queue-poller to seed gen)
//
// Body (markdown after frontmatter): row.body verbatim.
//
// Upsert key: source_file (canonical relative path). This means
// editing a draft in place + re-syncing patches the queue row.
// Renaming a file creates a new row + leaves the old one orphaned;
// rename is rare so we accept the trade-off.
//
// Modes:
//   --dry-run   parse + validate but don't write to Supabase
//   --once      single sync then exit (default)
//   --watch     not yet implemented; use external watcher (fswatch)
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import matter from "gray-matter";
import { promises as fs, type Dirent } from "node:fs";
import path from "node:path";

type Channel = "instagram" | "linkedin" | "x" | "email" | "journal";
const VALID_CHANNELS: Channel[] = [
  "instagram",
  "linkedin",
  "x",
  "email",
  "journal",
];
const VALID_STATUSES = [
  "draft",
  "approved",
  "scheduled",
  "processing",
  "published",
  "failed",
] as const;
type Status = (typeof VALID_STATUSES)[number];

const CONTENT_ROOT = path.resolve(
  process.cwd(),
  "..",
  "ryda-marketing",
  "content",
);

type ParsedDraft = {
  sourceFile: string; // relative to repo root
  channel: Channel;
  slug: string;
  title: string | null;
  body: string;
  hashtags: string[];
  imagePath: string | null;
  status: Status;
  scheduledAt: string | null;
  metadata: Record<string, unknown>;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[sync-content] missing env: ${name}`);
    process.exit(2);
  }
  return v;
}

async function* walkMarkdown(dir: string): AsyncGenerator<string> {
  // The string-encoded overload of readdir is the one we want; the
  // default typings pick a buffer overload when withFileTypes:true
  // is set, so we annotate explicitly.
  let entries: Dirent[];
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return;
  }
  for (const entry of entries) {
    const name = String(entry.name);
    const full = path.join(dir, name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(full);
    } else if (entry.isFile() && name.endsWith(".md")) {
      yield full;
    }
  }
}

async function parseDraft(filePath: string): Promise<ParsedDraft | null> {
  const raw = await fs.readFile(filePath, "utf8");
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (err) {
    // Bad frontmatter (e.g. unquoted colon in title). Don't bail
    // the whole sync — log + skip this file. Operator can fix
    // the markdown and re-run.
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[sync-content] skip ${filePath}: frontmatter parse failed (${msg.split("\n")[0]})`,
    );
    return null;
  }
  const fm = parsed.data as Record<string, unknown>;

  // Channel: from frontmatter, falling back to parent dir name.
  const channelHint =
    typeof fm.channel === "string"
      ? fm.channel
      : path.basename(path.dirname(filePath));
  if (!VALID_CHANNELS.includes(channelHint as Channel)) {
    console.warn(
      `[sync-content] skip ${filePath}: invalid channel '${channelHint}'`,
    );
    return null;
  }
  const channel = channelHint as Channel;

  const slug = typeof fm.slug === "string" ? fm.slug : null;
  if (!slug) {
    console.warn(`[sync-content] skip ${filePath}: missing slug`);
    return null;
  }

  const body = parsed.content.trim();
  if (body.length === 0) {
    console.warn(`[sync-content] skip ${filePath}: empty body`);
    return null;
  }

  const status: Status = VALID_STATUSES.includes(fm.status as Status)
    ? (fm.status as Status)
    : "draft";

  const scheduledAt =
    typeof fm.scheduled_at === "string"
      ? fm.scheduled_at
      : fm.scheduled_at instanceof Date
        ? fm.scheduled_at.toISOString()
        : null;

  const hashtagsRaw = fm.hashtags;
  const hashtags = Array.isArray(hashtagsRaw)
    ? hashtagsRaw.filter((h): h is string => typeof h === "string")
    : [];

  // Stash any extra frontmatter keys into metadata so the
  // poller / connector can read them.
  const metadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (
      ["slug", "title", "channel", "scheduled_at", "status", "hashtags", "image_path"].includes(k)
    ) {
      continue;
    }
    metadata[k] = v;
  }

  return {
    sourceFile: path.relative(process.cwd(), filePath),
    channel,
    slug,
    title: typeof fm.title === "string" ? fm.title : null,
    body,
    hashtags,
    imagePath: typeof fm.image_path === "string" ? fm.image_path : null,
    status,
    scheduledAt,
    metadata,
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");

  console.log(`[sync-content] scanning ${CONTENT_ROOT}`);
  const drafts: ParsedDraft[] = [];
  for await (const file of walkMarkdown(CONTENT_ROOT)) {
    const parsed = await parseDraft(file);
    if (parsed) drafts.push(parsed);
  }
  console.log(`[sync-content] parsed ${drafts.length} drafts`);

  if (dryRun) {
    console.log(JSON.stringify(drafts.slice(0, 3), null, 2));
    console.log(`[sync-content] DRY RUN — no DB writes`);
    return;
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const d of drafts) {
    // Look up existing row by source_file (our upsert key).
    const existing = await supabase
      .from("content_queue")
      .select("id, status, body, title, image_path, hashtags, metadata")
      .eq("source_file", d.sourceFile)
      .maybeSingle();
    if (existing.error) {
      console.error(
        `[sync-content] lookup failed for ${d.sourceFile}: ${existing.error.message}`,
      );
      errors += 1;
      continue;
    }

    // Upsert payload. We always overwrite content fields (so editing
    // markdown locally + re-syncing reflects in queue) but we DO NOT
    // overwrite status if the row has progressed past 'draft' —
    // would clobber operator approvals.
    const payload: Record<string, unknown> = {
      channel: d.channel,
      title: d.title,
      body: d.body,
      hashtags: d.hashtags,
      image_path: d.imagePath,
      metadata: d.metadata,
      scheduled_at: d.scheduledAt,
      source_file: d.sourceFile,
    };

    if (existing.data) {
      // Don't overwrite operator-modified status. If the markdown
      // says 'draft' but the operator already approved/scheduled
      // the row, respect their decision.
      if (existing.data.status === "draft") {
        payload.status = d.status;
      }
      const upd = await supabase
        .from("content_queue")
        .update(payload)
        .eq("id", existing.data.id);
      if (upd.error) {
        console.error(
          `[sync-content] update failed for ${d.sourceFile}: ${upd.error.message}`,
        );
        errors += 1;
      } else {
        // Track whether anything actually changed (cheap diff on
        // fields the operator might care about). For now just count
        // as "updated" — refining this is future work.
        const changed =
          existing.data.body !== d.body ||
          existing.data.title !== d.title ||
          existing.data.image_path !== d.imagePath;
        if (changed) updated += 1;
        else unchanged += 1;
      }
    } else {
      payload.status = d.status;
      const ins = await supabase.from("content_queue").insert(payload);
      if (ins.error) {
        console.error(
          `[sync-content] insert failed for ${d.sourceFile}: ${ins.error.message}`,
        );
        errors += 1;
      } else {
        inserted += 1;
      }
    }
  }

  console.log(
    `[sync-content] done: inserted=${inserted} updated=${updated} unchanged=${unchanged} errors=${errors}`,
  );
}

if (process.argv[1]?.endsWith("sync-content.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
