// playwright-helpers.ts — small utilities shared by every browser
// driver in this directory.
//
// Added when the first end-to-end run revealed that ChatGPT (and
// likely Dreamina + most CDN-fronted services) sit behind
// Cloudflare's bot-challenge intermediate page on first navigation
// from a fresh Playwright profile. Without waiting through it,
// downstream login/composer detection sees the Cloudflare DOM
// instead of the real app.

import type { Page } from "playwright";

/** Run page.evaluate but tolerate the "Execution context was
 *  destroyed" error that fires when the page navigates mid-eval
 *  (e.g. Cloudflare clearing its challenge wrapper, or ChatGPT
 *  redirecting after a prompt is submitted). Returns null on
 *  benign navigation; caller's retry loop picks up next tick. */
export async function safeEvaluate<T>(
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
      return null;
    }
    throw err;
  }
}

/** Wait until the page is no longer showing a Cloudflare challenge.
 *  Cloudflare's challenge title is literally "Just a moment..." and
 *  the page body contains a turnstile / checkbox widget. We poll
 *  the page title + a content sniff for up to `timeoutMs`. Returns
 *  true when cleared, false on timeout (caller decides whether to
 *  proceed anyway).
 *
 *  Diagnostic note: most challenges clear automatically in 5-10s.
 *  If the user has to manually click "Verify you are human", the
 *  Chrome window stays open and the poll will pick up the cleared
 *  state once they click. */
export async function waitForCloudflareChallenge(
  page: Page,
  timeoutMs = 45_000,
): Promise<boolean> {
  // Quick check: if the title isn't a known Cloudflare title, nothing
  // to wait for. Avoids burning even one polling cycle on the common
  // case (no challenge).
  let title = "";
  try {
    title = await page.title();
  } catch {
    // Page transitioning; treat as "challenge in flight" and poll.
  }
  const looksLikeChallenge =
    title.includes("Just a moment") ||
    title.includes("Attention Required") ||
    title === "";
  if (!looksLikeChallenge) return true;

  console.log(
    `[playwright-helpers] Cloudflare challenge detected (title="${title}"). Waiting up to ${Math.round(
      timeoutMs / 1000,
    )}s for it to clear. If a checkbox appears in the Chrome window, click it.`,
  );

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    let currentTitle = "";
    try {
      currentTitle = await page.title();
    } catch {
      continue;
    }
    if (
      currentTitle &&
      !currentTitle.includes("Just a moment") &&
      !currentTitle.includes("Attention Required")
    ) {
      console.log(
        `[playwright-helpers] challenge cleared (title="${currentTitle}").`,
      );
      return true;
    }
  }
  console.warn(
    `[playwright-helpers] Cloudflare challenge did not clear in ${Math.round(
      timeoutMs / 1000,
    )}s. Proceeding anyway — caller should handle the resulting state.`,
  );
  return false;
}

/** Combined "navigate + wait for the real app to be reachable"
 *  helper. Calls page.goto() then waits through any Cloudflare
 *  challenge before returning. Use this in place of bare
 *  page.goto() for any service known to sit behind Cloudflare. */
export async function gotoAndClearChallenges(
  page: Page,
  url: string,
): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForCloudflareChallenge(page);
}
