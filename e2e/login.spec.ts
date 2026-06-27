import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";

test("phase-0: login page renders with Google sign-in", async ({ page }) => {
  const errs = captureErrors(page);
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /continue with google/i }),
  ).toBeVisible();
  await screenshot(page, "phase-0-login");
  assertClean(errs);
});
