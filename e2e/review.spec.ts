import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-4: validator flags seeded issues with severity colors, the actionable/informational split, and opens the pinned rule", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Validator synthetic");

  // Seed an over-length abstract (red violation) and claims with seeded defects: claim 1
  // missing a terminal period (violation); claim 2 multiple dependent (informational fee).
  await saveDraft(page, {
    abstract: Array(160).fill("widget").join(" "),
    claims:
      "1. A device comprising a widget\n2. The device of claim 1 or 2, wherein it includes a base.\n3. The widget of claim 1, further comprising means for adjusting the lever.\n4. The device of claim 1, wherein the widget is substantially rigid.",
  });

  // Run the check.
  await page.goto(`/projects/${projectId}/review`);
  await page.getByTestId("run-check").click();

  // A red violation for the abstract, and an informational fee finding.
  await expect(page.getByText(/Abstract is 160 words/)).toBeVisible();
  await expect(page.getByText(/multiple dependent claim \(fee applies\)/i)).toBeVisible();
  await expect(page.locator('[data-severity="violation"]').first()).toBeVisible();
  await expect(page.getByText("Informational").first()).toBeVisible();
  // Tier 2 consistency checks (attention/verify).
  await expect(page.getByText(/invokes means plus function/i).first()).toBeVisible();
  await expect(page.getByText(/may lack antecedent basis/i).first()).toBeVisible();
  await expect(page.getByText(/relative term "substantially"/i).first()).toBeVisible();
  await screenshot(page, "phase-4-findings");

  // Click the finding -> it opens the pinned MPEP section in the evidence pane.
  await page.getByRole("button", { name: /Abstract is 160 words/ }).click();
  await expect(page.getByTestId("rule-pane")).toContainText("608.01(b)");
  await screenshot(page, "phase-4-finding-rule");

  assertClean(errs);
});
