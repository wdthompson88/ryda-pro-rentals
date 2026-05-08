// sora-driver.ts — Playwright module that drives chatgpt.com (or
// sora.chatgpt.com) to generate a single short video clip and
// save it to disk.
//
// Background: as of late 2025 OpenAI ships Sora as part of
// ChatGPT Pro. Two interaction surfaces:
//   1. chatgpt.com  — type a video prompt, ChatGPT routes to Sora,
//                     video appears inline in the conversation.
//   2. sora.chatgpt.com — dedicated Sora studio.
// This driver targets surface 1 by default because the selectors
// overlap with our existing chatgpt-driver (less code to maintain
// when OpenAI ships UI updates).
//
// Trade-offs (same as chatgpt-driver):
//   - Browser automation, not an official API. ChatGPT Pro ToS
//     discourages it; light volume rarely draws enforcement.
//   - Sora video gen is slower than image gen — 30-90 seconds per
//     5-second clip is typical. WAIT_FOR_VIDEO_MS is generous.
//   - When selectors break, the failure is a clean timeout with
//     a clear stage marker; the operator updates the selector list.
//
// Usage:
//   import { generateClipViaSora } from "./sora-driver";
//   const result = await generateClipViaSora({
//     prompt: "Cinematic shot of...",
//     durationSec: 5,
//     outPath: "/tmp/clip-1.mp4",
//   });

import { chromium, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";

// Reuse the same persistent profile as chatgpt-driver so users
// only log into ChatGPT once. Sora rides on the ChatGPT account.
const PROFILE_DIR =
  process.env.CHATGPT_PROFILE_DIR ||
  path.join(os.homedir(), ".ryda-marketing", "chatgpt-profile");

// Default to chatgpt.com (unified surface). Override with
// SORA_URL=https://sora.chatgpt.com if you prefer the dedicated
// studio. Some Pro accounts have one but not the other depending
// on rollout state.
const SORA_URL = process.env.SORA_URL || "https://chatgpt.com/";

// Sora generations take 30-120 seconds per clip in normal load.
// 5 minutes covers the 99th percentile.
const WAIT_FOR_VIDEO_MS = 5 * 60_000;
const WAIT_FOR_COMPOSER_MS = 30_000;

export type GenerateClipOptions = {
  /** Plain English prompt. Make it cinematic / specific — Sora
   *  rewards detail. */
  prompt: string;
  /** Output path on disk where the MP4 will be written. Parent
   *  directory is created automatically. */
  outPath: string;
  /** Hint to Sora about how long the clip should be. Sora picks
   *  the actual length; this just steers it. Default 5. */
  durationSec?: 5 | 10;
  /** If true, run headless. Default false (visible) — recommended
   *  for the first-time login flow. */
  headless?: boolean;
};

export type GenerateClipResult =
  | {
      kind: "ok";
      path: string;
      vendorUrl: string | null;
      sizeBytes: number;
    }
  | { kind: "not_logged_in" }
  | { kind: "no_video_capability"; hint: string }
  | { kind: "timeout"; stage: "composer" | "video" }
  | { kind: "error"; error: string };

export async function generateClipViaSora(
  opts: GenerateClipOptions,
): Promise<GenerateClipResult> {
  const { prompt, outPath } = opts;
  const headless = opts.headless ?? false;
  const durationSec = opts.durationSec ?? 5;

  await fs.mkdir(PROFILE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  let context: BrowserContext | null = null;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless,
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    });
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto(SORA_URL, { waitUntil: "domcontentloaded" });

    // First-run grace window: if the Chrome window lands on the
    // ChatGPT login page, give the user up to 5 minutes to sign
    // in (with a friendly stdout nudge) before bailing. The next
    // run picks up the persisted cookies and skips this wait.
    const loggedIn = await waitForChatGptLogin(page);
    if (!loggedIn) {
      return { kind: "not_logged_in" };
    }

    const composer = await waitForComposer(page);
    if (!composer) {
      return { kind: "timeout", stage: "composer" };
    }

    // Phrase the prompt so ChatGPT routes to Sora rather than
    // replying as text. "Make a video" is the most reliable
    // trigger phrase in the unified chat surface.
    const fullPrompt = `Make a ${durationSec}-second video. Style: cinematic, no text overlay, no music. Scene: ${prompt}`;
    await composer.fill(fullPrompt);
    await composer.press("Enter");

    // Detect "I can't make videos" early — happens when the
    // account doesn't have Sora access (free tier or some Plus
    // configurations). Bail fast with a clear hint.
    const noCapability = await detectNoVideoCapability(page);
    if (noCapability) {
      return {
        kind: "no_video_capability",
        hint: "ChatGPT replied that it cannot generate video. Confirm your account has Sora access — visit sora.chatgpt.com directly to verify.",
      };
    }

    const videoUrl = await waitForGeneratedVideo(page);
    if (!videoUrl) {
      return { kind: "timeout", stage: "video" };
    }

    const resp = await page.request.get(videoUrl);
    if (!resp.ok()) {
      return {
        kind: "error",
        error: `Video CDN returned ${resp.status()} for ${videoUrl}`,
      };
    }
    const buf = await resp.body();
    await fs.writeFile(outPath, buf);

    return {
      kind: "ok",
      path: outPath,
      vendorUrl: videoUrl,
      sizeBytes: buf.length,
    };
  } catch (err) {
    return {
      kind: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

/** Poll the page URL until it leaves the ChatGPT auth flow.
 *  On first run the persistent profile is empty, the user lands
 *  on the login page, and they need a few minutes to authenticate
 *  in the popped-up Chrome window. Polls for 5 min then gives up. */
async function waitForChatGptLogin(page: Page): Promise<boolean> {
  const isAuthUrl = (u: string) =>
    u.includes("/auth/") || u.includes("/login") || u.includes("/sign");
  if (!isAuthUrl(page.url())) return true;

  console.log(
    "[sora-driver] Chrome opened on ChatGPT login page. Sign in with your ChatGPT Pro account in the popped-up window. Waiting up to 5 minutes…",
  );
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      if (!isAuthUrl(page.url())) {
        console.log("[sora-driver] login detected. Continuing.");
        return true;
      }
    } catch {
      // Page may be transitioning (about:blank between redirects).
      // Just retry on the next tick.
    }
  }
  console.error(
    "[sora-driver] login timeout. Re-run the script after authenticating in chatgpt.com.",
  );
  return false;
}

async function waitForComposer(page: Page) {
  const selectors = [
    '[data-testid="composer-text-input"]',
    "#prompt-textarea",
    'textarea[placeholder*="ChatGPT"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Sora"]',
    'div[contenteditable="true"][data-id="root"]',
    'div[contenteditable="true"]',
  ];
  const deadline = Date.now() + WAIT_FOR_COMPOSER_MS;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      try {
        await loc.waitFor({ state: "visible", timeout: 1500 });
        return loc;
      } catch {
        // try next
      }
    }
  }
  return null;
}

/** Run page.evaluate but tolerate the "Execution context was
 *  destroyed" error that fires when the page navigates mid-poll
 *  (e.g. ChatGPT redirecting to /c/<conv_id> after a prompt is
 *  submitted). Returns null on navigation; caller retries on the
 *  next tick. */
async function safeEvaluate<T>(
  page: Page,
  fn: () => T,
): Promise<T | null> {
  try {
    return await page.evaluate(fn);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Execution context was destroyed") ||
      msg.includes("Target page, context or browser has been closed") ||
      msg.includes("frame was detached")
    ) {
      // Benign navigation — caller will retry on next poll tick.
      return null;
    }
    throw err;
  }
}

/** Quick check for the "I can't make videos" / "Sora isn't
 *  available on your account" reply pattern. Polls for ~10
 *  seconds — this only fires on accounts without Sora access. */
async function detectNoVideoCapability(page: Page): Promise<boolean> {
  const deadline = Date.now() + 10_000;
  const phrases = [
    "i can't generate videos",
    "i cannot generate video",
    "i'm not able to create video",
    "video generation isn't available",
    "sora isn't available",
  ];
  while (Date.now() < deadline) {
    const text = await safeEvaluate(page, () =>
      document.body.innerText.toLowerCase(),
    );
    if (text && phrases.some((p) => text.includes(p))) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/** Watch for a <video> element to appear in the conversation with
 *  an MP4 src on an OpenAI CDN. */
async function waitForGeneratedVideo(page: Page): Promise<string | null> {
  const deadline = Date.now() + WAIT_FOR_VIDEO_MS;
  while (Date.now() < deadline) {
    const url = await safeEvaluate(page, (): string | null => {
      // Strategy 1: <video> tag with src or <source> child.
      const videos = Array.from(document.querySelectorAll("video"));
      for (const v of videos) {
        const direct = v.getAttribute("src");
        if (direct && direct.startsWith("http")) return direct;
        const sourceChild = v.querySelector("source");
        const src = sourceChild?.getAttribute("src");
        if (src && src.startsWith("http")) return src;
      }
      // Strategy 2: anchor tag pointing at an mp4 on OpenAI CDN
      // (Sora download buttons sometimes use plain <a download>).
      const anchors = Array.from(
        document.querySelectorAll("a[href*='.mp4']"),
      );
      for (const a of anchors) {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("http") && /oai/i.test(href)) return href;
      }
      return null;
    });
    if (url) return url;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}
