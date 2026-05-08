# Daily 15-second video spot generator

Produces one 15-second car or boat spot per day, autonomously. Uses
your existing ChatGPT Pro Sora subscription (no separate API bill)
to generate three 5-second clips, stitches them with FFmpeg, burns
in text overlays, exports both vertical (1080×1920) and landscape
(1920×1080) MP4s, drops a draft row into `content_queue` for
operator review.

## Architecture

```
storyboard.ts  →  3 prompts + overlays + caption
        v
sora-driver.ts →  3 MP4 clips at ~/.ryda-marketing/clips/<stem>/shot-{1,2,3}.mp4
        v
composer.ts    →  ffmpeg pipeline: trim → scale/crop → concat → drawtext → fade
        v
public/marketing/videos/<stem>-vertical.mp4   1080×1920
public/marketing/videos/<stem>-landscape.mp4  1920×1080
        v
content_queue (channel='instagram', status='draft', metadata.video_*)
        v
operator approves in admin UI → social cron publishes
```

## Scripts

```bash
# Daily run (idempotent — only one spot per calendar day actually generates)
npm run marketing:daily-spot

# Force a re-run today (overrides the day-marker)
npm run marketing:daily-spot -- --force

# Pick a specific vehicle from LAUNCH_INVENTORY by index
npm run marketing:daily-spot -- --vehicle 3

# Render to disk only, no Supabase write
npm run marketing:daily-spot -- --no-queue
```

## Vehicle rotation

`storyboard.ts` exports a `LAUNCH_INVENTORY` array. The default
runner picks today's vehicle as `dayOfYear % inventory.length` so
you cycle through the launch fleet without repeating until you've
shown them all. Edit `LAUNCH_INVENTORY` to add new vehicles or
tune prompts. Each entry needs:

- `vehicleType: "car" | "boat"`
- `name` (display, ≤24 chars — burned as overlay)
- `vehicleDescription` (full prompt-ready: year, make, model, color, trim)
- `setting` (where the spot is shot)
- `hook` (5-10s overlay text, ≤24 chars)
- `cta` (10-15s overlay text, ≤32 chars)

## First-time setup

1. **Install deps**: `cd ryda-web && npm install`. This pulls
   `playwright`, `tsx`, and `ffmpeg-static` (~100MB total).

2. **Log into ChatGPT once**: the first run will pop a Chrome
   window from Playwright on chatgpt.com's login page. Authenticate
   with your ChatGPT Pro account. Cookies persist at
   `~/.ryda-marketing/chatgpt-profile/` and reuse on subsequent runs.

3. **Drop a music bed (optional)**: place a royalty-free MP3 at
   `~/.ryda-marketing/audio/default.mp3`. The composer will mix it
   under the spot at -18 dB. Without this file, the spot exports
   silent (you can add audio in post).

4. **First run**:
   ```bash
   npm run marketing:daily-spot
   ```
   Watch shots 1, 2, 3 generate sequentially (~3-5 min each on
   busy Sora load). Then ffmpeg composes both orientations
   (~10-30 sec). Final output paths print at the end.

## Autostart on login (macOS)

Use `com.ryda.video-spot.plist.template` in this directory. Replace
placeholders, save to `~/Library/LaunchAgents/`, and `launchctl
load`. The plist runs `marketing:daily-spot` once per hour — the
day-marker file ensures only the first invocation per day actually
generates anything. Subsequent invocations log "already ran today"
and exit immediately.

## Costs

- **Compute**: free (your machine)
- **Sora generations**: included in ChatGPT Pro ($200/mo). 3 clips
  per day = ~90/month. Pro tier supports 500 priority videos/month
  at the time of writing.
- **Disk**: each spot is ~5-15 MB (vertical + landscape). 1/day for
  a year is ~5 GB.
- **Bandwidth**: minimal — clips download once each.

## Trade-offs vs commercial APIs

| | This (Sora via browser) | Runway Gen-4 API | Luma Dream Machine API |
|--|--|--|--|
| **Cost/spot** | $0 marginal | ~$5-8 | ~$3-5 |
| **Speed** | 10-15 min total | 2-5 min | 2-4 min |
| **Where it runs** | User's Mac | Vercel cron, anywhere | Vercel cron, anywhere |
| **Login required** | Yes, ChatGPT Pro | API key | API key |
| **OpenAI ToS** | Browser automation discouraged | N/A | N/A |
| **Quality** | Excellent for cinematic | Best for vehicle b-roll | Strong photo-real |

The autonomous pipeline supports swapping in Runway / Luma later —
the `sora-driver.ts` interface (`generateClipViaSora` returning a
discriminated union) is the seam where you'd plug in an API
adapter without changing `daily-spot.ts` or `composer.ts`.

## Manual mode

If you want hands-on artistic control for a particular spot, use
`spot-brief.template.md` in this directory. It contains the same
3-shot, 15-second template the auto pipeline uses, but as a
fill-in brief you can paste into any AI video tool.

## Troubleshooting

- **`not_logged_in`**: open the Playwright Chrome window, log in,
  re-run.
- **`no_video_capability`**: ChatGPT replied "I can't make videos."
  Account doesn't have Sora access. Visit sora.chatgpt.com directly
  to verify, or upgrade to Pro.
- **Selectors changed**: Sora and ChatGPT update their DOM. Edit
  the selector lists in `sora-driver.ts` (`waitForComposer`,
  `waitForGeneratedVideo`).
- **FFmpeg fails**: the binary lives in
  `node_modules/ffmpeg-static/`. Re-run `npm install`. The error
  output (last 2KB of stderr) is in the script's stderr — usually
  a malformed filter graph or a clip that didn't trim cleanly.
- **Day marker won't budge**: clear it with
  `rm ~/.ryda-marketing/daily-markers/spot-YYYY-MM-DD`.
