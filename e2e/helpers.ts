import { type Page, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Reusable verification harness for the §7 gate.
 *
 * Usage in a spec:
 *   const errs = captureErrors(page);
 *   await page.goto("/");
 *   ...drive the feature to its target state...
 *   await screenshot(page, "phase-0-landing");
 *   assertClean(errs);
 */

export type CapturedErrors = {
  console: string[];
  pageErrors: string[];
  failedRequests: string[];
};

// Benign console noise outside our control. Keep this list TIGHT — anything
// suspicious must be resolved, not ignored.
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
];

// Transient dev-only asset requests (HMR) that can 404 during navigation.
const IGNORED_REQUEST_PATTERNS: RegExp[] = [/\/_next\/.*\.hot-update\./i];

export function captureErrors(page: Page): CapturedErrors {
  const captured: CapturedErrors = {
    console: [],
    pageErrors: [],
    failedRequests: [],
  };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text))) return;
    captured.console.push(text);
  });

  page.on("pageerror", (err) => {
    captured.pageErrors.push(String(err));
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    if (IGNORED_REQUEST_PATTERNS.some((re) => re.test(url))) return;
    // Requests cancelled by client-side navigation (Next server actions and RSC
    // prefetches that get superseded by router.push/refresh) surface as
    // ERR_ABORTED. That's a cancellation, not a failure — real HTTP errors are
    // still caught by the response (>=400) listener below.
    const errText = req.failure()?.errorText ?? "";
    if (/ABORTED/i.test(errText)) return;
    captured.failedRequests.push(`${req.method()} ${url} (${errText || "failed"})`);
  });

  page.on("response", (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (IGNORED_REQUEST_PATTERNS.some((re) => re.test(url))) return;
    captured.failedRequests.push(
      `${res.status()} ${res.request().method()} ${url}`,
    );
  });

  return captured;
}

export async function screenshot(page: Page, name: string): Promise<string> {
  const dir = path.join(process.cwd(), "screenshots");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export function assertClean(captured: CapturedErrors): void {
  const problems: string[] = [];
  if (captured.console.length)
    problems.push(`Console errors:\n  ${captured.console.join("\n  ")}`);
  if (captured.pageErrors.length)
    problems.push(`Page exceptions:\n  ${captured.pageErrors.join("\n  ")}`);
  if (captured.failedRequests.length)
    problems.push(`Failed requests:\n  ${captured.failedRequests.join("\n  ")}`);
  expect(problems, problems.join("\n\n") || "clean").toHaveLength(0);
}
