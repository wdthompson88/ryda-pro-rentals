// dreamina-probe.ts — recon: can Playwright actually drive
// dreamina.capcut.com after the user signs in?
//
// Run with: npx tsx scripts/marketing/video/__probe__/dreamina-probe.ts
// Window stays open up to 5 min so you can complete sign-in.
// Reports state every 10s — watch the terminal to see when the
// composer or generate button appears.

import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { chromium } from "playwright-extra";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

const PROFILE_DIR = path.join(
  os.homedir(),
  ".ryda-marketing",
  "dreamina-probe-profile",
);
const URL = "https://dreamina.capcut.com/";
const POLL_INTERVAL_MS = 10_000;
const MAX_RUN_MS = 5 * 60_000;

type State = {
  url: string;
  title: string;
  bodyTextSample: string;
  loginButton: boolean;
  composerLike: boolean;
  hasCaptcha: boolean;
  hasGenerateButton: boolean;
  visibleButtonsSample: string[];
  evalError?: string;
};

async function probe(page: import("playwright").Page): Promise<State> {
  const empty: State = {
    url: page.url(),
    title: "(unknown)",
    bodyTextSample: "",
    loginButton: false,
    composerLike: false,
    hasCaptcha: false,
    hasGenerateButton: false,
    visibleButtonsSample: [],
  };
  try {
    const r = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll("button, a, [role='button']"),
      ) as HTMLElement[];
      const visible = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const visibleButtons = els
        .filter(visible)
        .map((b) => (b.innerText || "").trim())
        .filter((t) => t.length > 0 && t.length < 60)
        .slice(0, 12);
      const lower = (s: string) => s.toLowerCase();
      const loginButton = visibleButtons.some((t) =>
        ["log in", "sign in", "sign up", "登录"].includes(lower(t)),
      );
      const composerLike =
        document.querySelector(
          'textarea, [contenteditable="true"], [data-testid*="prompt" i], [placeholder*="prompt" i], [placeholder*="describe" i], [placeholder*="imagine" i]',
        ) !== null;
      const bodyText = document.body.innerText.toLowerCase();
      const hasCaptcha =
        bodyText.includes("captcha") ||
        bodyText.includes("verify you are human") ||
        bodyText.includes("just a moment") ||
        bodyText.includes("checking your browser") ||
        bodyText.includes("press and hold");
      const hasGenerateButton = visibleButtons.some((t) =>
        ["generate", "create", "生成"].includes(lower(t)),
      );
      return {
        url: location.href,
        title: document.title || "(no title)",
        bodyTextSample: document.body.innerText.slice(0, 300),
        loginButton,
        composerLike,
        hasCaptcha,
        hasGenerateButton,
        visibleButtonsSample: visibleButtons,
      };
    });
    return r as State;
  } catch (err) {
    return {
      ...empty,
      evalError: err instanceof Error ? err.message : String(err),
    };
  }
}

function summarize(s: State, tickN: number) {
  const stamp = new Date().toLocaleTimeString();
  const verdict = s.composerLike
    ? "✅ LOGGED IN (composer present, automation viable)"
    : s.hasCaptcha
      ? "❌ BLOCKED (captcha/challenge detected)"
      : s.loginButton
        ? "⏳ LOGIN WALL (waiting for you to sign in)"
        : "❓ UNKNOWN STATE";
  console.log(`\n--- tick ${tickN} @ ${stamp} ---`);
  console.log(`URL:           ${s.url}`);
  console.log(`Title:         ${s.title}`);
  console.log(`Verdict:       ${verdict}`);
  console.log(`composer:      ${s.composerLike}`);
  console.log(`login button:  ${s.loginButton}`);
  console.log(`generate btn:  ${s.hasGenerateButton}`);
  console.log(`captcha/block: ${s.hasCaptcha}`);
  if (s.visibleButtonsSample.length > 0) {
    console.log(`buttons seen:  ${s.visibleButtonsSample.join(" | ")}`);
  }
  if (s.evalError) {
    console.log(`eval error:    ${s.evalError}`);
  }
  if (s.bodyTextSample) {
    console.log(
      `body sample:   ${s.bodyTextSample.replace(/\s+/g, " ").slice(0, 150)}`,
    );
  }
}

async function main() {
  await fs.mkdir(PROFILE_DIR, { recursive: true });
  console.log(`[probe] profile: ${PROFILE_DIR}`);
  console.log(`[probe] launching Chrome...`);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  console.log(`[probe] navigating to ${URL}`);
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  console.log(
    `[probe] window stays open ${MAX_RUN_MS / 1000}s. Sign in if needed; the probe will\nreport state every ${POLL_INTERVAL_MS / 1000}s and exit early once a composer is detected.`,
  );

  const deadline = Date.now() + MAX_RUN_MS;
  let tick = 0;
  while (Date.now() < deadline) {
    tick += 1;
    const s = await probe(page);
    summarize(s, tick);
    if (s.composerLike) {
      console.log(
        `\n[probe] ✅ Composer detected. Automation IS viable on Dreamina.\nClosing window in 5s...`,
      );
      await new Promise((r) => setTimeout(r, 5000));
      await context.close();
      console.log(
        `[probe] DONE. Cookies saved at ${PROFILE_DIR} so the real driver can reuse them.`,
      );
      return;
    }
    if (s.hasCaptcha) {
      console.log(
        `\n[probe] ❌ Captcha detected. Automation BLOCKED. Closing in 30s.`,
      );
      await new Promise((r) => setTimeout(r, 30_000));
      await context.close();
      return;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.log(
    `\n[probe] timed out after ${MAX_RUN_MS / 60000}min without seeing a composer. Closing.`,
  );
  await context.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
