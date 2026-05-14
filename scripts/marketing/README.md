# Autonomous marketing scripts

Local scripts that keep the social-publish queue full. Vercel cron
drains the queue every 15 min and posts to X / LinkedIn / Instagram /
email.

## Architecture

```
ryda-marketing/content/<channel>/<slug>.md   (markdown drafts on disk)
                ↓ sync-content.ts
        Supabase content_queue                (state machine)
                ↓ queue-poller.ts             (calls OpenAI Images API)
        public/marketing/generated/*.png      (hero images)
                ↓ Vercel cron (every 15 min)
        X / LinkedIn / IG / email             (live posts)
```

Image generation is API-first through Open Generative AI / MuAPI when
`MUAPI_API_KEY` is configured. The legacy `gpt-image-1` path remains
as a fallback when only `OPENAI_API_KEY` is present. An earlier
iteration tried browser automation against chatgpt.com to use a
ChatGPT Pro subscription at $0 marginal cost — that path was deleted
because Cloudflare's bot detection blocked Playwright reliably.

Video generation has its own subdirectory at `video/`. See
`video/README.md` for the daily-spot pipeline + the daily-brief
operator workflow.

## Scripts

### `marketing:sync` — markdown drafts → Supabase queue

Reads `../ryda-marketing/content/<channel>/<slug>.md`, parses YAML
frontmatter, upserts rows into `content_queue` keyed by source_file.
Re-running picks up edits + patches the row. Operator-modified
status (anything past `draft`) is protected.

```bash
npm run marketing:sync          # write to Supabase
npm run marketing:sync:dry      # parse + validate, no DB writes
```

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### `marketing:gen-images` — drain "needs image" queue rows once

```bash
npm run marketing:gen-images
```

Scans `content_queue` for Instagram + journal rows where `image_path`
is null OR points to a file that doesn't exist. Generates up to
`QUEUE_POLLER_BATCH_SIZE` images per pass (default 5) via the
OpenAI Images API at ~$0.06/image (medium quality, 1536×1024).
Patches the row's `image_path` so the next Vercel cron tick picks
the image up.

Required env: `OPENAI_API_KEY` (in addition to Supabase env above).

### `marketing:gen-images:loop` — same, but loops

```bash
npm run marketing:gen-images:loop
```

After each pass, sleeps `QUEUE_POLLER_INTERVAL_MS` (default 10 min)
and runs again. Intended target for `launchd` autostart.

### `marketing:start` — full pipeline

```bash
npm run marketing:start
```

`marketing:sync` then `marketing:gen-images:loop`. The autostart
plist invokes this.

### `marketing:brief` — daily morning brief

```bash
npm run marketing:brief
```

See `video/README.md` for the full operator workflow. Generates a
markdown brief covering today's video spot prompts (for Dreamina),
scheduled posts, image tasks, queue status, and an action checklist.

## First-time setup

1. **Set up env**: in `.env.local` (loaded by every script):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MUAPI_API_KEY` (preferred Open Generative AI creative engine)
   - Optional: `OPENAI_API_KEY` (legacy image fallback), `OPENAI_ORG_ID`,
     `FAL_KEY` (legacy autonomous video fallback via Seedance)
   - Optional MuAPI defaults:
     `RYDA_MUAPI_IMAGE_MODEL`, `RYDA_MUAPI_VIDEO_MODEL`,
     `RYDA_MUAPI_I2V_MODEL`, `RYDA_MUAPI_LIPSYNC_MODEL`,
     `RYDA_MUAPI_WORKFLOW_ID`

2. **Apply the migration**: `supabase/migrations/0030_content_queue.sql`
   creates the queue table. Apply via the Supabase dashboard or
   `supabase db push`.

3. **Sync drafts**: `npm run marketing:sync`. Confirm rows landed.

4. **Run image gen**: `npm run marketing:gen-images`. Should generate
   images for any IG/journal rows missing them.

5. **Generate video spots**: `npm run marketing:brief` to see today's
   video prompts. Generate the clips in your tool of choice (Dreamina
   recommended), drop the MP4s, run `marketing:daily-spot --resume`.

## Autostart on login (macOS)

Use `com.ryda.marketing-loop.plist.template` in this directory.
Replace placeholders, save to `~/Library/LaunchAgents/`, run
`launchctl load`. See the template's header comment for the recipe.

## Image gen pricing

MuAPI/Open Generative AI costs vary by selected model. The queue stores
best-effort vendor/model metadata on `content_queue` so operator review
can compare quality and spend. Legacy OpenAI Images pricing:

| Quality | 1024×1024 | 1024×1536 / 1536×1024 |
|---------|-----------|-----------------------|
| low     | $0.011    | $0.016                |
| medium  | $0.042    | $0.063                |
| high    | $0.167    | $0.25                 |

Default is `medium` at 1536×1024 (~$0.06/image). Bump to `high` for
hero artwork; drop to `low` for thumbnails.

## Troubleshooting

- **Image generation fails with 401**: check `OPENAI_API_KEY` is set
  + has billing enabled at platform.openai.com.

- **Image generation fails with 429**: bump `QUEUE_POLLER_PAUSE_MS`
  from 30s to 60s+. OpenAI rate-limits image gen per-account.

- **Queue rows aren't syncing**: confirm the markdown frontmatter
  parses cleanly (`marketing:sync:dry` reports parse errors per file).
  Common issue: titles with unquoted colons (`title: GT3 RS: track-only`
  must be `title: "GT3 RS: track-only"`).

- **Image quality is off-brand**: edit the `BRAND_PREAMBLE` in
  `queue-poller.ts`. Or add per-row `image_prompt` to the markdown
  frontmatter — it overrides the auto-generated prompt.
