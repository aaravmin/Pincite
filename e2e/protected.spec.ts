import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-0: consent then dashboard render, and actions are audited", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  // Fresh test user has no consent -> consent screen shows.
  await page.goto("/consent");
  await expect(
    page.getByRole("heading", { name: /before you begin/i }),
  ).toBeVisible();
  await screenshot(page, "phase-0-consent");

  // Accept -> redirected to the dashboard shell.
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /^projects$/i })).toBeVisible();
  await expect(page.getByText(/no projects yet/i)).toBeVisible();
  await screenshot(page, "phase-0-dashboard");

  assertClean(errs);

  // Audit trail: both login and consent_granted recorded for this user.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  expect(user, "test user exists").toBeTruthy();

  const { data: rows, error } = await admin
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  expect(error).toBeNull();
  const actions = (rows ?? []).map((r) => r.action);
  expect(actions).toContain("login");
  expect(actions).toContain("consent_granted");
});
