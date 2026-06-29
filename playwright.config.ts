import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env.local into process.env for the runner, global setup, and workers
// (the Next dev server loads it separately for the app itself).
loadEnvConfig(process.cwd());

/**
 * Playwright config for the Pincite verification gate (roadmap §7).
 * Every feature is driven to its target state, screenshotted to /screenshots,
 * and checked for zero console errors / page exceptions / failed requests.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results",
  // 120s, not the 60s default: the suite runs single-worker against a dev server, so a spec
  // that lands on a cold-compiled route can exceed 60s under load even though it passes in
  // isolation. The headroom keeps the gate from flaking by run order.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    // Pincite runs on a dedicated port (3100) to avoid colliding with other
    // local dev servers (e.g. the user's Jarvis app on :3000).
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
