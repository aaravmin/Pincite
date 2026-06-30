import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-6: rule surfacing shows applies-now + conditional rules, and a met trigger lights up", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Rules synthetic");

  // A claim with a means-for limitation arms the §112(f) conditional.
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await page
    .locator("[data-testid^='editor-']")
    .fill("1. A device comprising means for adjusting a widget.");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  await page.goto(`/projects/${projectId}/rules`);

  // Applies-now: claims-stage rules are present.
  await expect(page.getByText("Applies now")).toBeVisible();
  await expect(page.getByText(/Claims must be definite/i).first()).toBeVisible();

  // May-apply-next: the means-for conditional, marked "now applies".
  await expect(page.getByText("May apply next")).toBeVisible();
  await expect(page.getByText(/'means for' wording/i).first()).toBeVisible();
  await expect(page.getByText(/now applies/i).first()).toBeVisible();
  await expect(page.locator('[data-triggered="true"]').first()).toBeVisible();
  await screenshot(page, "phase-6-rules");

  // Opening a rule loads it in the evidence pane.
  await page.getByRole("button", { name: "Open MPEP 2173" }).first().click();
  await expect(page.getByTestId("rule-pane")).toContainText("2173");

  assertClean(errs);
});
