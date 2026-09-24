import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for demo mode (`pnpm verify:demo`): the app with no Supabase project and
 * no provider keys, running on the in-memory case study (shared/demo/mode.ts). It needs no
 * .env.local, so unlike playwright.config.ts it loads no env file and has no global setup to
 * reset a test account, and it runs only e2e/demo.spec.ts.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "demo.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results",
  // Cold dev compiles of each route on first visit, as in the main gate.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Forces demo mode even when .env.local configures Supabase.
    command: "pnpm dev:demo",
    url: "http://localhost:3100",
    // Never reuse a server already on :3100: it may be a configured app, and the run would
    // silently test the wrong thing. A busy port fails the run instead.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
