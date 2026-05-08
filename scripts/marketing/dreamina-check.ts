// dreamina-check.ts — diagnostic helper for the Dreamina profile.
// Mirror of chatgpt-check.ts. Opens dreamina.capcut.com in the
// persistent profile and reports composer / login button presence
// + best-effort account hints. Window stays open 60s.
//
// Usage:  npm run marketing:dreamina-check
//
// Use when:
//   - You want to verify your trial account is still active
//   - You want to refresh the cookies before a daily-spot run
//   - The dreamina-driver fails and you need to eyeball the page

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
  process.env.DREAMINA_PROFILE_DIR ||
  path.join(os.homedir(), ".ryda-marketing", "dreamina-profile");

const DREAMINA_URL = process.env.DREAMINA_URL || "https://dreamina.capcut.com/";

async function main() {
  console.log(`[dreamina-check] profile dir: ${PROFILE_DIR}`);
  await fs.mkdir(PROFILE_DIR, { recursive: true });

  const context = await launchStealthChromium({ profileDir: PROFILE_DIR });
  const page = context.pages()[0] ?? (await context.newPage());

  console.log(`[dreamina-check] navigating to ${DREAMINA_URL}…`);
  await gotoAndClearChallenges(page, DREAMINA_URL);
  await new Promise((r) => setTimeout(r, 3000));

  const state = await page
    .evaluate(() => {
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

      // Best-effort credit-balance / account info from common
      // shapes. None of these are stable; we collect candidates
      // and the operator eyeballs the most plausible.
      const candidates: string[] = [];
      document
        .querySelectorAll(
          '[class*="credit" i], [class*="balance" i], [class*="quota" i], [class*="user" i], [class*="avatar" i]',
        )
        .forEach((el) => {
          const t = (el as HTMLElement).innerText?.trim();
          if (t && t.length > 0 && t.length < 200) candidates.push(t);
        });

      return {
        url: location.href,
        title: document.title,
        loginButton,
        composerLike,
        accountCandidates: Array.from(new Set(candidates)).slice(0, 15),
      };
    })
    .catch((err) => ({
      url: page.url(),
      title: "(could not evaluate)",
      loginButton: false,
      composerLike: false,
      accountCandidates: [`error: ${err instanceof Error ? err.message : String(err)}`],
    }));

  console.log("");
  console.log("=== Dreamina profile status ===");
  console.log(`URL:        ${state.url}`);
  console.log(`Title:      ${state.title}`);
  console.log(
    `Composer:   ${state.composerLike ? "VISIBLE (looks logged in)" : "absent"}`,
  );
  console.log(
    `Login btn:  ${state.loginButton ? "VISIBLE (looks logged out)" : "absent"}`,
  );
  if (state.accountCandidates.length > 0) {
    console.log(`Credit/account hints (best-effort):`);
    for (const c of state.accountCandidates) console.log(`  - ${c}`);
  } else {
    console.log(`No credit/account info found in DOM`);
  }
  console.log("");
  console.log(
    `==> Window stays open 60s. Confirm trial status + remaining credits in the upper-right corner of the Chrome window.`,
  );

  await new Promise((r) => setTimeout(r, 60_000));
  await context.close();
}

if (process.argv[1]?.endsWith("dreamina-check.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
