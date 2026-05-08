# Autonomous marketing scripts

Local scripts that run from your machine to keep the social-publish
queue full. Vercel cron drains the queue every 15 min and posts to
X / LinkedIn / Instagram / email.

## Architecture

```
ryda-marketing/content/<channel>/<slug>.md   (markdown drafts on disk)
                ↓ sync-content.ts
        Supabase content_queue                (state machine)
                ↓ queue-poller.ts             (drives chatgpt.com via Playwright)
        public/marketing/generated/*.png      (hero images)
                ↓ Vercel cron (every 15 min)
        X / LinkedIn / IG / email             (live posts)
```

## Scripts

### `marketing:sync` — markdown drafts → Supabase queue

Reads `../ryda-marketing/content/<channel>/<slug>.md`, parses YAML
frontmatter, upserts rows into `content_queue` keyed by source_file.
Re-running picks up edits and patches the row. Status:'draft' rows
get their status updated by markdown changes; rows that have
progressed past draft (operator approved/scheduled) are protected.

```bash
npm run marketing:sync          # write to Supabase
npm run marketing:sync:dry      # parse + validate, no DB writes
```

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### `marketing:gen-image` — single image, manual prompt

```bash
npm run marketing:gen-image -- "A black 911 GT3 RS in a Wynwood garage at golden hour"
```

Drives chatgpt.com via Playwright using a persistent profile at
`~/.ryda-marketing/chatgpt-profile/`. Saves to
`public/marketing/generated/cli-<timestamp>.png`.

### `marketing:gen-images` — drain "needs image" queue rows once

```bash
npm run marketing:gen-images
```

Scans `content_queue` for Instagram + journal rows where `image_path`
is null OR points to a file that doesn't exist. Generates up to
`QUEUE_POLLER_BATCH_SIZE` images per pass (default 5), saves each
under `public/marketing/generated/`, patches the row's `image_path`
so the next Vercel cron tick picks it up.

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

## First-time setup

1. **Set up env**: ensure `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are in your shell or a .env file
   the script can pick up.

2. **Sync drafts**: `npm run marketing:sync`. Confirm rows landed
   in Supabase via the dashboard (`SELECT count(*) FROM content_queue`).

3. **First image gen + login**: `npm run marketing:gen-images`. The
   first invocation will probably return `not_logged_in`. Look for
   the Playwright-launched Chrome window — it lands on chatgpt.com's
   login page. Authenticate with your ChatGPT Pro account. Cookies
   persist in `~/.ryda-marketing/chatgpt-profile/` so subsequent
   runs reuse the session.

4. **Run the loop**: `npm run marketing:gen-images:loop`. Watch the
   first few generations; each takes 30-60s.

## Autostart on login (macOS)

Use the `com.ryda.marketing-loop.plist.template` in this directory.
Replace placeholders, save to `~/Library/LaunchAgents/`, and
`launchctl load`. See the template's header comment for the full
recipe.

## Trade-offs vs OpenAI Images API

| | This (ChatGPT-driven) | OpenAI Images API |
|--|--|--|
| **Cost** | $0/image marginal (you already pay $200/mo for Pro) | $0.04-$0.17/image |
| **Speed** | 30-60s per image | 5-15s per image |
| **Where it runs** | Your Mac (or always-on box) | Vercel cron, anywhere |
| **Login required** | Yes, ChatGPT Pro session via browser | Just an API key |
| **OpenAI ToS** | Browser automation discouraged (light volume rarely enforced) | Fully sanctioned |
| **Reliability** | UI changes can break selectors | Stable contract |
| **Volume cap** | ChatGPT rate limits (generous on Pro) | Pay-per-call, no UI limit |

The system supports both. If you wire `OPENAI_API_KEY` in Vercel
env, the in-app `/api/admin/generate-image` route uses the API. If
you don't, this local pipeline is the path.

## Troubleshooting

- **Selectors fail after a ChatGPT UI update**: the chatgpt-driver
  script lists candidate selectors in priority order. Add new ones
  to `waitForComposer()` in `chatgpt-driver.ts`.

- **Login expires**: ChatGPT sessions are long-lived but can drop.
  Re-run with the visible browser and log in again.

- **Rate limits**: bump `QUEUE_POLLER_PAUSE_MS` from 30s to 60s+ if
  ChatGPT returns "too many requests".

- **Image quality is off-brand**: edit the `BRAND_PREAMBLE` in
  `queue-poller.ts`. Or add per-row `image_prompt` to the
  markdown frontmatter — it overrides the auto-generated prompt.
