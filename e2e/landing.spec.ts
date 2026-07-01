import { test } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";

test("phase-0: landing renders cleanly", async ({ page }) => {
  const errs = captureErrors(page);
  await page.goto("/");
  await page.getByRole("img", { name: "Pincite" }).first().waitFor();
  await screenshot(page, "phase-0-landing");
  assertClean(errs);
});
