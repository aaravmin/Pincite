import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter, saveFiling } from "./helpers";
import { loginAsTestUser } from "./auth";

test("inventor certifies the declaration (no S-signature; the signed PDF is the signature)", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Synthetic latch");

  // ADS: one inventor.
  await page.goto(`/projects/${projectId}/inventors`);
  await page.getByTestId("inventor-name-0").fill("Dana Synthetic");
  await page.getByLabel("Residence (city, state/country)").fill("Austin, TX");
  await page.getByLabel("Mailing address").fill("1 Test St, Austin, TX 78701");
  await saveFiling(page);

  // Sign step (inventor): no filing-readiness section, no S-signature input.
  await page.goto(`/projects/${projectId}/sign`);
  await expect(page.getByText("Inventor certification")).toBeVisible();
  await expect(page.getByText("Filing readiness")).toHaveCount(0);
  await expect(page.getByLabel("S-signature")).toHaveCount(0);

  // Certify is disabled until every statement is confirmed.
  await page.getByLabel("Inventor's full legal name").fill("Dana Synthetic");
  await expect(
    page.getByRole("button", { name: /certify declaration/i }),
  ).toBeDisabled();
  for (const cb of await page.getByRole("checkbox").all()) await cb.check();
  await page.getByRole("button", { name: /certify declaration/i }).click();
  await expect(page.getByText(/Certified by Dana Synthetic/i)).toBeVisible();

  // The signed declaration document section offers the download + upload.
  await expect(page.getByTestId("download-declaration")).toBeVisible();
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
  expect(decls![0].legal_name).toBe("Dana Synthetic");
  expect(Object.values(decls![0].statements as Record<string, boolean>).every(Boolean)).toBe(
    true,
  );

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  expect((audit ?? []).map((r) => r.action)).toContain("declaration_signed");
});
