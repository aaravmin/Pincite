import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

const SPEC: [string, string][] = [
  ["Title of the invention", "Widget"],
  ["Background", "Field of the invention and description of related art."],
  ["Brief summary", "A widget apparatus."],
  ["Detailed description", "The widget 10 has a base 12 and an arm 14."],
];

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
  for (const [label, text] of SPEC) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.locator("[data-testid^='editor-']").fill(text);
    await expect(page.getByTestId("save-status")).toHaveText("Saved");
  }
  await page.goto(`/projects/${projectId}/stage`);
  await expect(page.getByTestId("stage-label")).toHaveText(/Description drafting/i);
  await screenshot(page, "phase-3-stage-spec");

  // Add claims -> Claims drafting.
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await page.locator("[data-testid^='editor-']").fill("1. A widget comprising a base.");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
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
