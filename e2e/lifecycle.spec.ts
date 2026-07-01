import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-v3: lifecycle next-actions by status", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const id = await createMatter(page, "Lifecycle synthetic");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Office action received -> reply + after-final paths.
  await admin
    .from("projects")
    .update({ declared_status: "office_action" })
    .eq("id", id);
  await page.goto(`/projects/${id}/stage`);
  await expect(
    page.getByText(/Reply to every rejection and objection/i).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/After a FINAL rejection/i).first(),
  ).toBeVisible();
  await screenshot(page, "v3-lifecycle");

  // Allowed -> pay the issue fee (non-extendable).
  await admin
    .from("projects")
    .update({ declared_status: "allowed" })
    .eq("id", id);
  await page.goto(`/projects/${id}/stage`);
  await expect(page.getByText(/Pay the issue fee/i).first()).toBeVisible();
  await expect(page.getByText(/not extendable/i).first()).toBeVisible();

  assertClean(errs);
});
