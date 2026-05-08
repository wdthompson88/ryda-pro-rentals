// dreamina-driver.ts — Playwright module that drives
// dreamina.capcut.com to generate one short video clip per call.
//
// Why this exists alongside sora-driver: the user is on a 4-day
// Dreamina trial and wants to A/B compare quality vs ChatGPT-Pro
// Sora before deciding which to keep. Same `generateClipViaSora`-
// shaped interface (`{prompt, durationSec, outPath} → discriminated
// union`) so daily-spot can swap the two with a CLI flag.
//
// Caveats — read these before debugging:
//
//   1. SELECTORS ARE BEST-GUESS. I don't have firsthand knowledge
//      of Dreamina's exact DOM. The selectors below cover common
//      patterns (textarea/contenteditable for the prompt, anchors
//      with mp4 hrefs for downloads, role="button" for actions).
//      Run `npm run marketing:dreamina-check` first to inspect the
//      live page; update the selector lists in this file as needed.
//
//   2. SEPARATE PROFILE. Cookies live at
//      ~/.ryda-marketing/dreamina-profile/, not the ChatGPT
//      profile. Log in once (via CapCut / TikTok / email).
//
//   3. FREE-TIER LIMITS. The trial gives a finite credit pool.
//      The driver doesn't track credits — Dreamina reports
//      "out of credits" inline. If we detect that pattern, we
//      return a clear error so the orchestrator can stop.
//
//   4. ToS. Same browser-automation discouragement as ChatGPT
//      (and most consumer AI services). Light volume rarely
//      enforced; not contractually clean.

import { type BrowserContext, type Page } from "playwright";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import {
  gotoAndClearChallenges,
  launchStealthChromium,
  safeEvaluate,
} from "../playwright-helpers";

const PROFILE_DIR =
  process.env.DREAMINA_PROFILE_DIR ||
  path.join(os.homedir(), ".ryda-marketing", "dreamina-profile");

const DREAMINA_URL = process.env.DREAMINA_URL || "https://dreamina.capcut.com/";

const WAIT_FOR_VIDEO_MS = 5 * 60_000;
const WAIT_FOR_COMPOSER_MS = 30_000;

export type GenerateClipOptions = {
  prompt: string;
  outPath: string;
  durationSec?: 5 | 10;
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
  | { kind: "out_of_credits"; hint: string }
  | { kind: "timeout"; stage: "composer" | "video" }
  | { kind: "error"; error: string };

export async function generateClipViaDreamina(
  opts: GenerateClipOptions,
): Promise<GenerateClipResult> {
  const { prompt, outPath } = opts;
  const headless = opts.headless ?? false;
  const durationSec = opts.durationSec ?? 5;

  await fs.mkdir(PROFILE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  let context: BrowserContext | null = null;
  try {
    context = await launchStealthChromium({
      profileDir: PROFILE_DIR,
      headless,
    });
    const page = context.pages()[0] ?? (await context.newPage());

    await gotoAndClearChallenges(page, DREAMINA_URL);

    const loggedIn = await waitForDreaminaLogin(page);
    if (!loggedIn) {
      return { kind: "not_logged_in" };
    }

    const composer = await waitForComposer(page);
    if (!composer) {
      return { kind: "timeout", stage: "composer" };
    }

    // Dreamina prompt phrasing: include explicit duration hint.
    // We add "no on-screen text" because their model often adds
    // captions otherwise — we burn overlays in post.
    const fullPrompt = `${prompt}. Duration: ${durationSec} seconds. No on-screen text or captions.`;
    await composer.fill(fullPrompt);

    // Click the generate button. Multiple candidate selectors
    // because Dreamina's UI varies between trial / paid tiers
    // and language locales.
    const generated = await clickGenerateButton(page);
    if (!generated) {
      return {
        kind: "error",
        error:
          "Could not locate generate button. Run `npm run marketing:dreamina-check` and update clickGenerateButton() selectors.",
      };
    }

    const credits = await detectOutOfCredits(page);
    if (credits) {
      return {
        kind: "out_of_credits",
        hint:
          "Dreamina reported insufficient credits. Trial may have expired or daily quota exhausted.",
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

async function isLoginWall(page: Page): Promise<boolean> {
  const u = page.url();
  if (
    u.includes("/login") ||
    u.includes("/sign") ||
    u.includes("/auth/") ||
    u.includes("accounts.tiktok.com") ||
    u.includes("accounts.capcut.com")
  ) {
    return true;
  }
  const signals = await safeEvaluate(page, () => {
    const els = Array.from(
      document.querySelectorAll("button, a, [role='button']"),
    ) as HTMLElement[];
    const visible = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const loginButton = els.some((b) => {
      const t = (b.innerText || "").trim().toLowerCase();
      return (
        visible(b) &&
        (t === "log in" ||
          t === "sign in" ||
          t === "sign up" ||
          t === "登录" ||
          t.startsWith("log in") ||
          t.startsWith("sign in"))
      );
    });
    const composerLike =
      document.querySelector(
        'textarea, [contenteditable="true"], [data-testid*="prompt" i], [placeholder*="prompt" i], [placeholder*="describe" i]',
      ) !== null;
    return { loginButton, composerLike };
  });
  if (!signals) return false;
  return signals.loginButton && !signals.composerLike;
}

async function waitForDreaminaLogin(page: Page): Promise<boolean> {
  const wallNow = await isLoginWall(page);
  if (!wallNow) return true;
  console.log(
    `[dreamina-driver] login wall detected (url=${page.url()}). Sign in via the popped-up Chrome window. Waiting up to 5 minutes…`,
  );
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      if (!(await isLoginWall(page))) {
        console.log(
          `[dreamina-driver] login detected (url=${page.url()}). Continuing.`,
        );
        return true;
      }
    } catch {
      // transient
    }
  }
  console.error(
    "[dreamina-driver] login timeout after 5 min. Re-run after authenticating.",
  );
  return false;
}

async function waitForComposer(page: Page) {
  // Try a list of selectors covering common Dreamina prompt
  // input shapes. The first that becomes visible wins.
  const selectors = [
    'textarea[placeholder*="describe" i]',
    'textarea[placeholder*="prompt" i]',
    '[data-testid*="prompt" i]',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"]',
    "textarea",
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

async function clickGenerateButton(page: Page): Promise<boolean> {
  // Dreamina labels the trigger button differently across modes
  // (Generate / Create / 生成 / Run). Try to find one whose text
  // matches AND that's enabled + visible.
  const candidates = [
    'button:has-text("Generate")',
    'button:has-text("Create")',
    'button:has-text("Run")',
    'button:has-text("生成")',
    '[role="button"]:has-text("Generate")',
    'button[type="submit"]',
  ];
  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    try {
      await loc.waitFor({ state: "visible", timeout: 2000 });
      const disabled = await loc.evaluate((el) =>
        (el as HTMLButtonElement).disabled,
      );
      if (disabled) continue;
      await loc.click({ timeout: 5000 });
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function detectOutOfCredits(page: Page): Promise<boolean> {
  // Quick poll for ~5 seconds — credit-limit toasts surface fast.
  const deadline = Date.now() + 5_000;
  const phrases = [
    "insufficient credits",
    "out of credits",
    "no credits",
    "trial has ended",
    "trial expired",
    "upgrade to continue",
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

async function waitForGeneratedVideo(page: Page): Promise<string | null> {
  const deadline = Date.now() + WAIT_FOR_VIDEO_MS;
  while (Date.now() < deadline) {
    const url = await safeEvaluate(page, (): string | null => {
      // Strategy 1: <video> tag with src.
      const videos = Array.from(document.querySelectorAll("video"));
      for (const v of videos) {
        const direct = v.getAttribute("src");
        if (direct && direct.startsWith("http") && direct.includes(".mp4"))
          return direct;
        const sourceChild = v.querySelector("source");
        const src = sourceChild?.getAttribute("src");
        if (src && src.startsWith("http") && src.includes(".mp4")) return src;
      }
      // Strategy 2: download anchor.
      const anchors = Array.from(
        document.querySelectorAll("a[href*='.mp4'], a[download]"),
      );
      for (const a of anchors) {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("http") && href.includes(".mp4")) return href;
      }
      return null;
    });
    if (url) return url;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}
