import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-3: stage detection transitions across fill levels and declared status", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Stage synthetic");

  // Description sections only, no claims -> Description drafting.
  await saveDraft(page, {
    title: "Widget",
    background: "Field of the invention and description of related art.",
    summary: "A widget apparatus.",
    detailed_description: "The widget 10 has a base 12 and an arm 14.",
  });
  await page.goto(`/projects/${projectId}/stage`);
  await expect(page.getByTestId("stage-label")).toHaveText(/Description drafting/i);
  await screenshot(page, "phase-3-stage-spec");

  // Add claims -> Claims drafting.
  await page.goto(`/projects/${projectId}`);
  await saveDraft(page, { claims: "1. A widget comprising a base." });
  await page.goto(`/projects/${projectId}/stage`);
  await expect(page.getByTestId("stage-label")).toHaveText(/Claims drafting/i);

  // Mark filed -> Filed — awaiting examination.
  await page.locator("#status").click();
  await page.getByRole("option", { name: "Filed", exact: true }).click();
  await page.getByTestId("save-status-btn").click();
  await expect(page.getByTestId("stage-label")).toHaveText(/Filed/i);
  await screenshot(page, "phase-3-stage-filed");

  assertClean(errs);
});
