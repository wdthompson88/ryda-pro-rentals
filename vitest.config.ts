import { defineConfig } from "vitest/config";
import path from "path";

// Vitest config — pre-launch test harness mandated by CODEX-CHALLENGE.
// Must precede further "quick fix" work touching money/auth code so
// regressions can be caught before they ship to Q3 2026 Miami launch.
//
// Initial coverage targets:
//   - lib/fees.ts (documented prior $1,500 vs 5% bug)
//   - lib/safe-next.ts (open-redirect / XSS / Unicode bidi guards)
//   - lib/api-auth.ts (Supabase cookie parsing)
//   - lib/admin-auth.ts (app_metadata vs user_metadata distinction)
//   - lib/rate-limit.ts (token bucket eviction + LRU)
//
// Exclude: Playwright e2e suite (tests/) — those run via `npm run test:e2e`.

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "tests"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/__tests__/**", "src/lib/**/types.ts"],
    },
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub `server-only` for vitest. The package throws at import
      // time outside Next.js RSC context, breaking tests for any
      // module that imports it (e.g. lib/rate-limit/upstash.ts).
      // The runtime guarantee is provided by Next.js's bundler,
      // not the package code itself, so a no-op stub in tests is
      // safe.
      "server-only": path.resolve(__dirname, "./src/test-shims/server-only.ts"),
    },
  },
});
