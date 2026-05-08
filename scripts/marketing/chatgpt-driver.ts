// chatgpt-driver.ts — Playwright module that drives chatgpt.com
// to generate a single image and save it to disk.
//
// Why this exists: the user has a ChatGPT Pro subscription and
// wants images generated via that subscription rather than via the
// (separately-billed) OpenAI Images API. ChatGPT Pro has no
// official scriptable API for image generation — the only way to
// drive it from code is to automate the web UI.
//
// IMPORTANT TRADE-OFFS:
//
//   1. ChatGPT Pro Terms of Service prohibit "automating account
//      access". Light-volume use (a few images per hour to seed
//      a content pipeline) has historically not drawn enforcement,
//      but that's discretionary on OpenAI's side. The OpenAI
//      Images API ($0.04-$0.17/image) is the contractually-clean
//      path; this script is the "I already pay $200/mo for Pro
//      and don't want a second bill" workaround.
//
//   2. Selectors here target the chatgpt.com DOM as of 2026-Q1.
//      OpenAI ships UI changes regularly. When the script breaks,
//      the failure mode is "image never appears + script bails
//      out after WAIT_FOR_IMAGE_MS". Retry-with-fresh-selectors
//      is the maintenance cost.
//
//   3. This script needs the user to be logged into ChatGPT in
//      the persistent profile. First run: launch with --login
//      and the user authenticates manually. Subsequent runs reuse
//      the cookies.
//
// Usage:
//   import { generateImageViaChatGPT } from "./chatgpt-driver";
//   const result = await generateImageViaChatGPT({
//     prompt: "...",
//     outPath: "/tmp/output.png",
//   });

import { chromium, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { gotoAndClearChallenges, safeEvaluate } from "./playwright-helpers";

// Persistent profile dir: cookies + localStorage live here so the
// user only logs into ChatGPT once. ~/.ryda-marketing/ stays out
// of the repo (gitignored at the user's home).
const PROFILE_DIR =
  process.env.CHATGPT_PROFILE_DIR ||
  path.join(os.homedir(), ".ryda-marketing", "chatgpt-profile");

// chatgpt.com is the URL; the new model selector defaults to a
// model that supports image generation.
const CHATGPT_URL = "https://chatgpt.com/";

// How long to wait for the image to appear in the conversation.
// ChatGPT image generation typically takes 15-45 seconds.
const WAIT_FOR_IMAGE_MS = 120_000;

// How long to wait for the composer to be interactable after
// page load. Covers slow login redirects + UI initialization.
const WAIT_FOR_COMPOSER_MS = 30_000;

export type GenerateOptions = {
  prompt: string;
  /** Absolute path on disk where the PNG will be written. The
   *  parent dir is created automatically. */
  outPath: string;
  /** If true, launch headed (visible) so the user can watch / log
   *  in. If false, launch headless. Default: false (headed) — the
   *  ChatGPT login flow is much easier in a visible browser. */
  headless?: boolean;
  /** Override the prompt prefix used to coax ChatGPT into
   *  generating an image rather than a chat reply. Default:
   *  "Please generate an image:". */
  imagePromptPrefix?: string;
};

export type GenerateResult =
  | {
      kind: "ok";
      path: string;
      vendorUrl: string | null;
      sizeBytes: number;
    }
  | { kind: "not_logged_in" }
  | { kind: "timeout"; stage: "composer" | "image" }
  | { kind: "error"; error: string };

/** Generate a single image via chatgpt.com. Returns the saved
 *  file path on success. Caller is responsible for sequencing
 *  (running multiple in parallel will hit ChatGPT's rate limits). */
export async function generateImageViaChatGPT(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const { prompt, outPath } = opts;
  const headless = opts.headless ?? false;
  const prefix = opts.imagePromptPrefix ?? "Please generate an image:";

  await fs.mkdir(PROFILE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  let context: BrowserContext | null = null;
  try {
    // launchPersistentContext keeps cookies + localStorage between
    // runs so the user only logs in once. We don't use the user's
    // actual Chrome profile (that would clobber their normal
    // browsing) — this is a dedicated automation profile.
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless,
      viewport: { width: 1280, height: 900 },
      // ChatGPT sometimes detects automation and triggers Cloudflare;
      // a real-looking UA reduces friction. Not foolproof but helps.
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    });
    const page = context.pages()[0] ?? (await context.newPage());

    await gotoAndClearChallenges(page, CHATGPT_URL);

    // First-run grace window: if Chrome lands on the ChatGPT login
    // page, give the user up to 5 minutes to authenticate in the
    // popped-up window. Subsequent runs reuse cookies and skip this.
    const loggedIn = await waitForChatGptLogin(page);
    if (!loggedIn) {
      return { kind: "not_logged_in" };
    }

    // Wait for the composer textarea. Multiple selectors because
    // OpenAI ships UI changes; we try the most-stable first.
    const composer = await waitForComposer(page);
    if (!composer) {
      return { kind: "timeout", stage: "composer" };
    }

    // Type the prompt. Using fill() is more reliable than type()
    // for long strings and won't trigger per-keystroke autocomplete.
    const fullPrompt = `${prefix} ${prompt}`;
    await composer.fill(fullPrompt);

    // Submit. Pressing Enter is more reliable across UI revisions
    // than hunting for the send button (which has changed shape +
    // selector several times in ChatGPT's history).
    await composer.press("Enter");

    // Now wait for the image to appear. ChatGPT inserts an <img>
    // into the conversation when generation completes. We watch
    // for a new img with a CDN URL (oaiusercontent.com or similar).
    const imgUrl = await waitForGeneratedImage(page);
    if (!imgUrl) {
      return { kind: "timeout", stage: "image" };
    }

    // Fetch the image bytes via the page's request context so the
    // session cookies are attached (CDN may require auth).
    const resp = await page.request.get(imgUrl);
    if (!resp.ok()) {
      return {
        kind: "error",
        error: `Image CDN returned ${resp.status()} for ${imgUrl}`,
      };
    }
    const buf = await resp.body();
    await fs.writeFile(outPath, buf);

    return {
      kind: "ok",
      path: outPath,
      vendorUrl: imgUrl,
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

/** True when the current page is a ChatGPT login wall. Two
 *  signals — either is sufficient:
 *    1. URL matches a known auth path
 *    2. DOM contains visible "Log in"/"Sign up" buttons AND no
 *       chat composer (ChatGPT-2025 serves the wall on the bare
 *       chatgpt.com URL when the session cookie is missing). */
async function isLoginWall(page: Page): Promise<boolean> {
  const u = page.url();
  if (
    u.includes("/auth/") ||
    u.includes("/login") ||
    u.includes("/sign") ||
    u.includes("auth.openai.com")
  ) {
    return true;
  }
  const signals = await safeEvaluate(page, () => {
    const btns = Array.from(
      document.querySelectorAll("button, a"),
    ) as HTMLElement[];
    const visible = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const loginButton = btns.some((b) => {
      const t = (b.innerText || "").trim().toLowerCase();
      return (
        visible(b) &&
        (t === "log in" ||
          t === "sign in" ||
          t === "sign up" ||
          t.startsWith("log in to") ||
          t.startsWith("sign up to"))
      );
    });
    const composer = document.querySelector(
      '[data-testid="composer-text-input"], #prompt-textarea, textarea[placeholder*="ChatGPT" i], textarea[placeholder*="message" i]',
    );
    return { loginButton, composerPresent: Boolean(composer) };
  });
  if (!signals) return false; // navigation in flight
  return signals.loginButton && !signals.composerPresent;
}

/** Wait until the page is no longer a login wall. */
async function waitForChatGptLogin(page: Page): Promise<boolean> {
  const wallNow = await isLoginWall(page);
  if (!wallNow) return true;

  console.log(
    `[chatgpt-driver] Chrome opened on a ChatGPT login wall (url=${page.url()}). Sign in with your ChatGPT Pro account in the popped-up window. Waiting up to 5 minutes…`,
  );
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const stillWall = await isLoginWall(page);
      if (!stillWall) {
        console.log(
          `[chatgpt-driver] login detected (url=${page.url()}). Continuing.`,
        );
        return true;
      }
    } catch {
      // transient
    }
  }
  console.error(
    "[chatgpt-driver] login timeout after 5 min. Re-run after authenticating in chatgpt.com inside the Playwright Chrome window.",
  );
  return false;
}

/** Wait for the chat composer textarea using a list of candidate
 *  selectors, returning the first one that appears. Returns null
 *  if none appear within the timeout. */
async function waitForComposer(page: Page) {
  const selectors = [
    '[data-testid="composer-text-input"]',
    "#prompt-textarea",
    'textarea[placeholder*="ChatGPT"]',
    'textarea[placeholder*="message"]',
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
        // try next selector
      }
    }
  }
  return null;
}

/** Poll for an image URL appearing in the chat. ChatGPT inserts
 *  generated images as <img> tags whose src is on an OpenAI CDN.
 *  We pick the most-recent qualifying image. */
async function waitForGeneratedImage(page: Page): Promise<string | null> {
  const deadline = Date.now() + WAIT_FOR_IMAGE_MS;
  while (Date.now() < deadline) {
    const url = await safeEvaluate(page, (): string | null => {
      const imgs = Array.from(document.querySelectorAll("img"));
      // Filter to images from OpenAI's CDNs. Different chats have
      // returned images on a few different hosts over time:
      //   files.oaiusercontent.com   (most common)
      //   oaiusercontent.com
      //   cdn.oaistatic.com          (older)
      //   sdmntpr*.oaiusercontent.com (DALL-E 3 era)
      // We accept any host containing 'oai' to be safe.
      const candidates = imgs
        .map((img) => img.getAttribute("src") || "")
        .filter((src) => /oai/i.test(src) && /\.(png|webp|jpe?g)/i.test(src))
        // Skip avatar/UI icons by requiring the src to be a real
        // CDN URL rather than a relative path or data: URL.
        .filter((src) => src.startsWith("http"));
      return candidates.at(-1) ?? null;
    });
    if (url) return url;
    // Sleep half a second and re-check. Generation usually takes
    // 15-45s so this loop runs ~30-90 times before resolving.
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/** Convenience entry point for `npm run gen-image -- "<prompt>"`.
 *  Run directly with `tsx scripts/marketing/chatgpt-driver.ts`. */
async function main() {
  const promptArg = process.argv.slice(2).join(" ");
  if (!promptArg) {
    console.error("Usage: tsx chatgpt-driver.ts <prompt>");
    process.exit(2);
  }
  const outPath = path.join(
    process.cwd(),
    "public",
    "marketing",
    "generated",
    `cli-${Date.now()}.png`,
  );
  console.log(`[chatgpt] generating: ${promptArg.slice(0, 80)}…`);
  console.log(`[chatgpt] writing to: ${outPath}`);
  const result = await generateImageViaChatGPT({
    prompt: promptArg,
    outPath,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.kind === "ok" ? 0 : 1);
}

if (process.argv[1]?.endsWith("chatgpt-driver.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
