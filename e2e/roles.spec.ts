import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function clearRole() {
  const a = admin();
  const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  if (user) await a.from("profiles").update({ role: null }).eq("id", user.id);
}

test("phase-v3: role selection + attorney portfolio", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page); // reset defaults role=inventor
  await clearRole(); // force the role screen to appear

  // Consent -> role selection (no role yet).
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/role");
  await expect(
    page.getByRole("heading", { name: /how will you use pincite/i }),
  ).toBeVisible();
  await screenshot(page, "v3-role-select");

  // Pick attorney -> portfolio dashboard.
  await page.getByRole("button", { name: /patent attorney or agent/i }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /portfolio/i })).toBeVisible();

  // Create a project with client + matter.
  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Synthetic bracket");
  await page.getByLabel("Client").fill("Acme Corp");
  await page.getByLabel("Matter no.").fill("ACM-0042");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");

  // Back to the portfolio: grouped under the client, with the matter number.
  await page.goto("/dashboard");
  await expect(page.getByText("Acme Corp")).toBeVisible();
  await expect(page.getByText("ACM-0042")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Synthetic bracket" }),
  ).toBeVisible();
  await screenshot(page, "v3-attorney-portfolio");

  assertClean(errs);

  // Audit recorded the role selection.
  const a = admin();
  const { data: list } = await a.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await a
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  expect((audit ?? []).map((r) => r.action)).toContain("role_selected");
});
