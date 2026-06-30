import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// Guided auto-fix (Feature 4): per finding, the model proposes the smallest edit, shown as a
// before/after diff that the user accepts or rejects. Makes a real Grok call, so it is guarded
// (set AUTOFIX_AI=1 to run) and kept out of the default deterministic gate.
test("guided auto-fix: propose a diff, accept it, the section is corrected", async ({
  page,
}) => {
  test.skip(!process.env.AUTOFIX_AI, "AI: set AUTOFIX_AI=1 to run the live auto-fix check");
  test.setTimeout(150000);
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Auto-fix");

  // A claim with no terminal period (a claim must be a single sentence, 37 CFR 1.75).
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await page
    .getByTestId("editor-claims")
    .fill("1. A device comprising a widget and a base");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  await page.goto(`/projects/${id}/review`);
  await page.getByTestId("run-check").click();
  await expect(page.locator("li[data-severity]").first()).toBeVisible({ timeout: 20000 });

  // Expand the first finding, ask for a fix, and confirm the before/after diff renders.
  await page.locator("li[data-severity] button").first().click();
  await page.getByTestId("auto-fix").first().click();
  await expect(page.getByTestId("fix-diff")).toBeVisible({ timeout: 90000 });
  await screenshot(page, "feature4-auto-fix-diff");

  // Accept the edit; the diff closes and the section is corrected.
  await page.getByTestId("accept-fix").click();
  await expect(page.getByTestId("fix-diff")).toHaveCount(0, { timeout: 30000 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await admin
    .from("project_sections")
    .select("content")
    .eq("project_id", id)
    .eq("section_key", "claims")
    .maybeSingle();
  expect((data?.content ?? "").trim().endsWith(".")).toBeTruthy();

  assertClean(errs);
});
