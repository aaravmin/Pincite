import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-4: validator flags seeded issues with severity colors, the actionable/informational split, and opens the pinned rule", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Validator synthetic");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const projectId = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // Seed an over-length abstract (red violation).
  await page.getByRole("button", { name: "Abstract", exact: true }).click();
  await page.getByTestId("editor-abstract").fill(Array(160).fill("widget").join(" "));
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  // Seed claims: claim 1 missing a terminal period (violation); claim 2 multiple
  // dependent (informational fee).
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await page
    .getByTestId("editor-claims")
    .fill(
      "1. A device comprising a widget\n2. The device of claim 1 or 2, wherein it includes a base.",
    );
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  // Run the check.
  await page.goto(`/projects/${projectId}/review`);
  await page.getByTestId("run-check").click();

  // A red violation for the abstract, and an informational fee finding.
  await expect(page.getByText(/Abstract is 160 words/)).toBeVisible();
  await expect(page.getByText(/multiple dependent claim \(fee applies\)/i)).toBeVisible();
  await expect(page.locator('[data-severity="violation"]').first()).toBeVisible();
  await expect(page.getByText("Informational").first()).toBeVisible();
  await screenshot(page, "phase-4-findings");

  // Open the abstract rule -> evidence pane shows the pinned MPEP section.
  await page.getByRole("button", { name: "Open MPEP 608.01(b)" }).first().click();
  await expect(page.getByTestId("rule-pane")).toContainText("608.01(b)");
  await screenshot(page, "phase-4-finding-rule");

  assertClean(errs);
});
