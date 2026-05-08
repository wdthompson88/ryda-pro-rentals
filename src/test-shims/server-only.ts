// Vitest shim for `server-only`.
//
// The real `server-only` package (used in production code as a
// build-time guard against importing server-only modules from
// Client Components) throws on import outside of Next.js RSC
// context. That breaks vitest for any test that touches a module
// importing it.
//
// In tests, the bundler-level safety isn't relevant — vitest runs
// in a Node environment where the boundary doesn't exist. This
// file is a no-op stub aliased in vitest.config.ts.
//
// Production code is unaffected; only the test runner sees this.
export {};
