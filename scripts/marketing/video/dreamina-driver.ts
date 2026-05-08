// dreamina-driver.ts — Playwright driver for dreamina.capcut.com
//
// Why this exists alongside the API-based seedance.ts adapter:
// the user pays $18-25/mo for Dreamina (which includes Seedance 2.0
// generation). Going through fal.ai's API would mean paying TWICE
// for the same model. This driver lets us use the existing
// subscription at zero marginal cost.
//
// Probe verified (May 2026):
//   - dreamina.capcut.com is on Akamai/ByteDance, not Cloudflare
//   - Plain Playwright with stealth lands on /ai-tool/generate
//     after sign-in. No captcha, no bot wall.
//   - Persistent profile at ~/.ryda-marketing/dreamina-profile/
//     keeps cookies across runs (one-time login).
//
// Implementation notes:
//   - Uses page.locator() throughout instead of page.evaluate().
//     Reason: tsx's esbuild transform adds __name(...) calls to
//     functions that, when serialized into the page context for
//     evaluate(), throw "ReferenceError: __name is not defined".
//     Locators don't serialize functions and avoid the issue
//     entirely.
//   - Selectors are best-effort and will need iteration when
//     Dreamina ships UI changes. Each selector list has 3-5
//     candidates; the first to become visible wins.
//   - Sequential generation only — Dreamina rate-limits parallel
//     prompts on consumer accounts.

import { type BrowserContext, type Page, type Locator } from "playwright";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { launchStealthChromium } from "../playwright-helpers";

const PROFILE_DIR =
  process.env.DREAMINA_PROFILE_DIR ||
  path.join(os.homedir(), ".ryda-marketing", "dreamina-profile");

const DREAMINA_GENERATE_URL =
  process.env.DREAMINA_URL || "https://dreamina.capcut.com/ai-tool/generate";

const WAIT_FOR_COMPOSER_MS = 60_000;
const WAIT_FOR_VIDEO_MS = 5 * 60_000;

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
  | { kind: "timeout"; stage: "composer" | "submit" | "video" }
  | { kind: "error"; error: string };

/** Generate one clip via dreamina.capcut.com. Sequential by design;
 *  callers running multiple clips per spot must await between calls. */
export async function generateClipViaDreamina(
  opts: GenerateClipOptions,
): Promise<GenerateClipResult> {
  const headless = opts.headless ?? false;
  const durationSec = opts.durationSec ?? 5;

  await fs.mkdir(PROFILE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(opts.outPath), { recursive: true });

  let context: BrowserContext | null = null;
  try {
    context = await launchStealthChromium({
      profileDir: PROFILE_DIR,
      headless,
    });
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto(DREAMINA_GENERATE_URL, { waitUntil: "domcontentloaded" });
    // Akamai/ByteDance bot manager doesn't typically pop a long
    // challenge for stealth Playwright on this domain (probe-verified).
    // Just wait a few seconds for client-side hydration to settle.
    await page.waitForTimeout(4000);

    // Detect login wall: if any of the common login-wall buttons
    // are visible AND the composer is not, we're not signed in.
    if (await isLoginWall(page)) {
      return { kind: "not_logged_in" };
    }

    // Find the prompt composer. Dreamina's textarea has been at a
    // few different selectors across UI revisions; try a list.
    const composer = await waitForComposer(page);
    if (!composer) {
      return { kind: "timeout", stage: "composer" };
    }

    // Type the prompt. Dreamina parses duration + aspect from the
    // prompt sometimes; we explicitly mention duration in plain
    // English to nudge the model.
    await composer.click(); // focus
    await composer.fill(""); // clear any existing text
    await composer.fill(
      `${opts.prompt}\n\nDuration: ${durationSec} seconds. No on-screen text or captions.`,
    );

    // Click Generate. Multiple candidate selectors; first enabled +
    // visible wins.
    const submitted = await clickGenerate(page);
    if (!submitted) {
      return { kind: "timeout", stage: "submit" };
    }

    // Quick credit-check: Dreamina shows an "insufficient credits"
    // toast within ~5s if you're out.
    if (await detectOutOfCredits(page)) {
      return {
        kind: "out_of_credits",
        hint: "Dreamina reports insufficient credits. Top up at https://dreamina.capcut.com/billing or wait for daily quota refresh.",
      };
    }

    // Wait for the generated <video> element to appear. Dreamina
    // shows the result inline (no need to navigate to a results
    // page).
    const videoUrl = await waitForGeneratedVideo(page);
    if (!videoUrl) {
      return { kind: "timeout", stage: "video" };
    }

    // Download via the page's request context (cookies attached).
    const resp = await page.request.get(videoUrl);
    if (!resp.ok()) {
      return {
        kind: "error",
        error: `Video CDN returned ${resp.status()} for ${videoUrl}`,
      };
    }
    const buf = await resp.body();
    await fs.writeFile(opts.outPath, buf);

    return {
      kind: "ok",
      path: opts.outPath,
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

// ---- Locator helpers (no page.evaluate; avoids __name esbuild bug) ----

async function isLoginWall(page: Page): Promise<boolean> {
  // If we landed on the auth path or any known sign-in URL,
  // treat as login wall regardless of DOM.
  const u = page.url();
  if (
    u.includes("/login") ||
    u.includes("/auth") ||
    u.includes("accounts.tiktok.com") ||
    u.includes("accounts.capcut.com") ||
    u.includes("/sign")
  ) {
    return true;
  }
  // Otherwise check for visible login buttons. If a composer is
  // also visible, we're logged in (the page may be a marketing
  // header with a "Log in" link in the corner even when authed).
  const composerVisible = await firstVisible(page, COMPOSER_SELECTORS, 1500);
  if (composerVisible) return false;
  const loginVisible = await firstVisibleByText(
    page,
    LOGIN_BUTTON_TEXTS,
    1500,
  );
  return loginVisible !== null;
}

const COMPOSER_SELECTORS = [
  'textarea[placeholder*="describe" i]',
  'textarea[placeholder*="prompt" i]',
  'textarea[placeholder*="imagine" i]',
  '[data-testid*="prompt" i]',
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"]',
  "textarea",
];

const LOGIN_BUTTON_TEXTS = ["Log in", "Sign in", "Sign up", "登录"];

async function waitForComposer(page: Page): Promise<Locator | null> {
  return firstVisible(page, COMPOSER_SELECTORS, WAIT_FOR_COMPOSER_MS);
}

async function clickGenerate(page: Page): Promise<boolean> {
  // Try a list of locator strategies. Dreamina labels the trigger
  // differently across modes ("Generate", "Create", 中文 "生成").
  const strategies: Array<() => Locator> = [
    () => page.getByRole("button", { name: /^generate$/i }),
    () => page.getByRole("button", { name: /^create$/i }),
    () => page.getByRole("button", { name: /生成/ }),
    () => page.locator('button:has-text("Generate")').first(),
    () => page.locator('button[type="submit"]').first(),
    () => page.locator('[role="button"]:has-text("Generate")').first(),
  ];
  for (const make of strategies) {
    try {
      const loc = make();
      await loc.waitFor({ state: "visible", timeout: 2500 });
      // Confirm not disabled before clicking.
      const isDisabled = await loc
        .isDisabled({ timeout: 1000 })
        .catch(() => false);
      if (isDisabled) continue;
      await loc.click({ timeout: 5000 });
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function detectOutOfCredits(page: Page): Promise<boolean> {
  // Dreamina toasts surface fast (~2s). We give 6s total.
  const phrases = [
    "insufficient credits",
    "out of credits",
    "no credits",
    "trial expired",
    "upgrade to continue",
  ];
  const deadline = Date.now() + 6_000;
  while (Date.now() < deadline) {
    for (const phrase of phrases) {
      try {
        const found = await page
          .getByText(new RegExp(phrase, "i"))
          .first()
          .isVisible({ timeout: 800 });
        if (found) return true;
      } catch {
        // try next phrase
      }
    }
    await page.waitForTimeout(800);
  }
  return false;
}

async function waitForGeneratedVideo(page: Page): Promise<string | null> {
  // Dreamina renders the generated clip as a <video> with src on
  // a CapCut/ByteDance CDN. We poll for any video element with a
  // resolvable src that isn't a UI placeholder (some Dreamina UIs
  // show preview animations in <video> tags too — we filter to
  // sources containing capcut/bytedance/tiktok-CDN domains).
  const deadline = Date.now() + WAIT_FOR_VIDEO_MS;
  const cdnRegex = /(capcut|bytedance|tiktokcdn|byteoversea|byteimg|tos)/i;

  while (Date.now() < deadline) {
    // Collect all video src candidates via locator (no evaluate).
    const videos = await page.locator("video").all();
    for (const v of videos) {
      const src = await v.getAttribute("src").catch(() => null);
      if (src && src.startsWith("http") && cdnRegex.test(src)) {
        return src;
      }
      // <source> child fallback
      const inner = v.locator("source").first();
      const innerSrc = await inner.getAttribute("src").catch(() => null);
      if (innerSrc && innerSrc.startsWith("http") && cdnRegex.test(innerSrc)) {
        return innerSrc;
      }
    }
    // Anchor-based download buttons (some Dreamina pages use these)
    const anchors = await page
      .locator("a[href*='.mp4'], a[download][href^='http']")
      .all();
    for (const a of anchors) {
      const href = await a.getAttribute("href").catch(() => null);
      if (href && href.startsWith("http") && cdnRegex.test(href)) {
        return href;
      }
    }
    await page.waitForTimeout(2000);
  }
  return null;
}

/** Wait for the first locator from a list to become visible.
 *  Returns the matched locator or null on timeout. */
async function firstVisible(
  page: Page,
  selectors: string[],
  timeoutMs: number,
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      try {
        await loc.waitFor({ state: "visible", timeout: 1000 });
        return loc;
      } catch {
        // try next
      }
    }
  }
  return null;
}

async function firstVisibleByText(
  page: Page,
  texts: string[],
  timeoutMs: number,
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const text of texts) {
      const loc = page.getByText(text, { exact: true }).first();
      try {
        await loc.waitFor({ state: "visible", timeout: 800 });
        return loc;
      } catch {
        // try next
      }
    }
  }
  return null;
}
