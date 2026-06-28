import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-v3: inventor declaration signing + filing-readiness checks", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Synthetic latch");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const projectId = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // ADS: one inventor.
  await page.goto(`/projects/${projectId}/inventors`);
  await page.getByTestId("inventor-name-0").fill("Dana Synthetic");
  await page.getByLabel("Residence (city, state/country)").fill("Austin, TX");
  await page
    .getByLabel("Mailing address")
    .fill("1 Test St, Austin, TX 78701");
  await page.getByTestId("save-filing").click();
  await expect(page.getByText("Saved")).toBeVisible();

  // Sign step: unsigned -> filing readiness flags it.
  await page.goto(`/projects/${projectId}/sign`);
  await expect(
    page.getByText(/has not signed the inventor.s declaration/i),
  ).toBeVisible();

  // Check all five statements; sign with a mismatched name to trigger the ADS check.
  for (const cb of await page.getByRole("checkbox").all()) await cb.check();
  await page.getByLabel("Type your full legal name to sign").fill("Dana S.");
  await page.getByRole("button", { name: /sign declaration/i }).click();

  await expect(page.getByText(/does not match the ADS/i)).toBeVisible();
  await expect(
    page.getByText(/has not signed the inventor.s declaration/i),
  ).toHaveCount(0);
  await screenshot(page, "v3-sign");

  assertClean(errs);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: decls } = await admin
    .from("project_declarations")
    .select("legal_name, statements")
    .eq("project_id", projectId);
  expect((decls ?? []).length).toBe(1);
  expect(decls![0].legal_name).toBe("Dana S.");

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  expect((audit ?? []).map((r) => r.action)).toContain("declaration_signed");
});
