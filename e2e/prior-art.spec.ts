import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-7: prior-art pinpoint overlaps render with score and disclaimer (deterministic compare)", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  // Create a project and add claims.
  const projectId = await createMatter(page, "Prior-art synthetic");

  await saveDraft(page, {
    claims:
      "1. A widget mount comprising a base and an adjustable arm coupled to the base; wherein the arm rotates about a vertical axis.",
  });

  // Deterministic compare against a synthetic, overlapping candidate (no BigQuery cost).
  await page.goto(`/projects/${projectId}/prior-art`);
  // The compare form is hidden until "Compare a patent" is clicked (one place to start).
  await page.getByRole("button", { name: "Compare a patent", exact: true }).click();
  await page.getByTestId("cmp-number").fill("US-0000000-A1");
  await page
    .getByTestId("cmp-text")
    .fill(
      "A widget mount comprising a base and an adjustable arm coupled to the base. The arm rotates about a vertical axis.",
    );
  await page.getByRole("button", { name: "Compare", exact: true }).click();

  // Results: a scored match, pinpoint overlaps, and the standing disclaimer.
  await expect(page.getByText("US-0000000-A1").first()).toBeVisible();
  await expect(page.getByTestId("overlap-detail")).toBeVisible();
  await expect(page.locator("[data-overlap]").first()).toBeVisible();
  await expect(
    page.getByText(/not a validity or freedom-to-operate opinion/i),
  ).toBeVisible();
  await screenshot(page, "phase-7-prior-art-overlaps");

  assertClean(errs);
});
