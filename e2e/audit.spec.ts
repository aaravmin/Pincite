import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-9: audit-log viewer lists actions and filters", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Audit synthetic");

  // Generate a few audited actions: edit sections and save a version, all from the one save
  // in the All-sections view (it writes the sections, then appends the immutable snapshot).
  await saveDraft(page, { title: "Adjustable widget mount" });

  // Audit log shows the actions.
  await page.goto(`/projects/${projectId}/audit`);
  await expect(page.getByTestId("audit-list")).toContainText("Project created");
  await expect(page.getByTestId("audit-list")).toContainText("Section edited");
  await expect(page.getByTestId("audit-list")).toContainText("Version saved");
  await screenshot(page, "phase-9-audit");

  // Filter to a single action.
  await page.getByLabel("Filter by action").click();
  await page.getByRole("option", { name: "Version saved" }).click();
  await expect(page.getByTestId("audit-list")).toContainText("Version saved");
  await expect(page.getByTestId("audit-list")).not.toContainText("Project created");

  assertClean(errs);
});
