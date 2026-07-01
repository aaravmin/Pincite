import { type Page, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { sanitizeOutputText } from "@/lib/text/sanitize";

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

/**
 * Create a matter through the New project dialog and return its id. Creating no longer
 * auto-opens the matter, so this asserts it appears on the dashboard (the feature) and then
 * opens the draft (so callers keep the same post-create state they had with the old redirect).
 */
export async function createMatter(
  page: Page,
  opts: string | { name: string; client?: string; matterNo?: string; openDraft?: boolean },
): Promise<string> {
  const o = typeof opts === "string" ? { name: opts } : opts;
  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill(o.name);
  if (o.client !== undefined) await page.getByLabel("Client").fill(o.client);
  if (o.matterNo !== undefined) await page.getByLabel("Matter no.").fill(o.matterNo);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  // Not auto-opened: the new matter appears on the dashboard.
  await expect(page.getByText(sanitizeOutputText(o.name)).first()).toBeVisible({
    timeout: 15000,
  });
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await db
    .from("projects")
    .select("id")
    .eq("name", o.name)
    .order("created_at", { ascending: false })
    .limit(1);
  const id = (data?.[0]?.id as string) ?? "";
  if (o.openDraft !== false) await page.goto(`/projects/${id}`);
  return id;
}

/**
 * Click the Inventors/applicant Save and wait for the "Saved" indicator, retrying the click so
 * a click that lands before React hydrates (the onClick handler isn't wired yet) doesn't flake.
 * The save action is an idempotent upsert, so re-clicking is safe.
 */
export async function saveFiling(page: Page): Promise<void> {
  await expect(async () => {
    await page.getByTestId("save-filing").click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
}

/**
 * Persist draft sections through the only save path there is: the draft never autosaves, so
 * text is written (and the Draft step lit) only from the All-sections view's Save button. Fills
 * the given sections there and saves, appending one immutable version. Retries the switch to the
 * All-sections view so a click that lands before hydration doesn't strand us on a single section.
 */
export async function saveDraft(
  page: Page,
  sections: Record<string, string> = {},
): Promise<void> {
  await expect(async () => {
    await page.getByRole("button", { name: "All sections", exact: true }).click();
    await expect(page.getByTestId("save-draft")).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });

  for (const [key, value] of Object.entries(sections)) {
    await page.getByTestId(`editor-${key}`).fill(value);
  }

  await page.getByTestId("save-draft").click();
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
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
