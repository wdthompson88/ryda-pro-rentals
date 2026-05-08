// chatgpt-check.ts — opens the persistent ChatGPT profile in a
// Playwright Chrome window and reports what state it's in:
//   - URL after navigating to chatgpt.com
//   - Whether the chat composer is visible (= logged in)
//   - Whether a "Log in" button is visible (= login wall)
//   - The signed-in account's email (if findable in the avatar menu)
//   - The ChatGPT plan tier shown in account settings (Free/Plus/Pro)
//
// The window stays open for 60 seconds so you can interact with
// it (log in, log out, switch accounts) before it closes.
//
// Usage:  npm run marketing:chatgpt-check
//
// Useful when:
//   - daily-spot or queue-poller bails with not_logged_in and you
//     want to confirm the profile state without re-running a long job
//   - you logged into ChatGPT but aren't sure WHICH account stuck
//   - you suspect the ChatGPT UI changed and the driver's selectors
//     are stale

import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { loadDotEnvLocal } from "./env-loader";
import {
  gotoAndClearChallenges,
  launchStealthChromium,
} from "./playwright-helpers";

loadDotEnvLocal();

const PROFILE_DIR =
  process.env.CHATGPT_PROFILE_DIR ||
  path.join(os.homedir(), ".ryda-marketing", "chatgpt-profile");

const CHATGPT_URL = process.env.CHATGPT_URL || "https://chatgpt.com/";

async function main() {
  console.log(`[chatgpt-check] profile dir: ${PROFILE_DIR}`);
  await fs.mkdir(PROFILE_DIR, { recursive: true });

  const context = await launchStealthChromium({ profileDir: PROFILE_DIR });
  const page = context.pages()[0] ?? (await context.newPage());

  console.log(`[chatgpt-check] navigating to ${CHATGPT_URL}…`);
  await gotoAndClearChallenges(page, CHATGPT_URL);
  // Brief settle so any post-challenge client-side hydration completes.
  await new Promise((r) => setTimeout(r, 3000));

  const state = await page
    .evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll("button, a"),
      ) as HTMLElement[];
      const loginButton = buttons.some((b) => {
        const t = (b.innerText || "").trim().toLowerCase();
        return (
          t === "log in" ||
          t === "sign in" ||
          t === "sign up" ||
          t.startsWith("log in to") ||
          t.startsWith("sign up to")
        );
      });
      const composer = document.querySelector(
        '[data-testid="composer-text-input"], #prompt-textarea, textarea[placeholder*="ChatGPT" i], textarea[placeholder*="message" i]',
      );

      // Try to fish out the user's email or name from common
      // ChatGPT DOM patterns. None of these are stable; we collect
      // candidates and the operator can eyeball the most plausible.
      const candidateSelectors = [
        '[data-testid="profile-button"]',
        '[data-testid="user-button"]',
        'button[aria-label*="account" i]',
        'button[aria-label*="profile" i]',
        'button[aria-label*="user" i]',
        '[class*="UserMenu" i]',
        '[class*="user-name" i]',
        '[class*="email" i]',
      ];
      const candidates: string[] = [];
      for (const sel of candidateSelectors) {
        document.querySelectorAll(sel).forEach((el) => {
          const t = (el as HTMLElement).innerText?.trim();
          const aria = el.getAttribute("aria-label");
          const title = el.getAttribute("title");
          for (const v of [t, aria, title]) {
            if (v && v.length > 0 && v.length < 200) candidates.push(v);
          }
        });
      }

      return {
        url: location.href,
        title: document.title,
        loginButton,
        composerPresent: Boolean(composer),
        accountCandidates: Array.from(new Set(candidates)).slice(0, 15),
      };
    })
    .catch((err) => ({
      url: page.url(),
      title: "(could not evaluate page)",
      loginButton: false,
      composerPresent: false,
      accountCandidates: [`error: ${err instanceof Error ? err.message : String(err)}`],
    }));

  console.log("");
  console.log("=== ChatGPT profile status ===");
  console.log(`URL:        ${state.url}`);
  console.log(`Title:      ${state.title}`);
  console.log(`Composer:   ${state.composerPresent ? "VISIBLE (looks logged in)" : "absent"}`);
  console.log(`Login btn:  ${state.loginButton ? "VISIBLE (looks logged out)" : "absent"}`);
  if (state.accountCandidates.length > 0) {
    console.log(`Account hints (best-effort guess at signed-in identity):`);
    for (const c of state.accountCandidates) console.log(`  - ${c}`);
  } else {
    console.log(`Account hints: none found in DOM`);
  }
  console.log("");

  if (state.loginButton && !state.composerPresent) {
    console.log(
      `==> NOT LOGGED IN. The Chrome window is open for 60 seconds —\n    log into your ChatGPT Pro account now and the cookies will\n    persist for the next daily-spot / queue-poller run.`,
    );
  } else if (state.composerPresent) {
    console.log(
      `==> LOGGED IN. To verify it's the RIGHT account: click the\n    avatar in the upper-right of the Chrome window. The window\n    stays open for 60 seconds so you can confirm the email + plan\n    tier (you need ChatGPT Pro for Sora video generation).`,
    );
  } else {
    console.log(
      `==> AMBIGUOUS state. Could be a Cloudflare check, a one-tap\n    consent dialog, or a UI change. Look at the Chrome window\n    yourself; the window stays open for 60 seconds.`,
    );
  }

  await new Promise((r) => setTimeout(r, 60_000));
  await context.close();
}

if (process.argv[1]?.endsWith("chatgpt-check.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
