import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-v3: claim-structure checks (dependency + multiple-dependent)", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const id = await createMatter(page, "Claims synthetic");

  // Seed claims with deliberate structural defects, then save.
  await saveDraft(page, {
    claims:
      "1. A widget of claim 5, wherein it is small.\n" +
      "2. The widget of claim 1, comprising a base.\n" +
      "3. The widget of claims 1 and 2, wherein the base is round.",
  });

  await page.goto(`/projects/${id}/review`);
  await page.getByTestId("run-check").click();

  // Claim 1 refers to a non-existent claim, and is itself dependent (should be independent).
  await expect(
    page.getByText(/refers to claim 5, which does not exist/i).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Claim 1 is a dependent claim/i).first(),
  ).toBeVisible();
  // Claim 3 is a multiple dependent claim using "and" (must be in the alternative).
  await expect(
    page.getByText(/must be in the alternative/i).first(),
  ).toBeVisible();

  await screenshot(page, "v3-claims-checks");
  assertClean(errs);
});
