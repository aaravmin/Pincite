import { test, expect } from "@playwright/test";
import { captureErrors, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// Removing a patent is admin only (gated on the authenticated email, server side). The
// e2e test user is not the admin, so the remove control must never appear for them, and
// the dashboard must otherwise render normally.
test("admin gate: a non-admin user sees no remove control", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await createMatter(page, { name: "Admin gate synthetic", openDraft: false });

  await page.goto("/dashboard");
  await expect(page.getByText("Admin gate synthetic")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
  assertClean(errs);
});
