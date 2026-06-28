import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-8: export — report renders and a TXT export is generated and logged", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Export synthetic");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const projectId = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  await page.getByRole("button", { name: "Title of the invention", exact: true }).click();
  await page.locator("[data-testid^='editor-']").fill("Adjustable widget mount");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  // Report view renders the review.
  await page.goto(`/projects/${projectId}/report`);
  await expect(page.getByTestId("report")).toContainText("Export synthetic");
  await expect(page.getByTestId("report")).toContainText("Adjustable widget mount");
  await expect(page.getByTestId("report")).toContainText("Rules that apply now");
  await screenshot(page, "phase-8-report");
  assertClean(errs);

  // TXT export route returns the serialized review.
  const res = await page.request.get(
    `/api/projects/${projectId}/export?format=txt`,
  );
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("PINCITE REVIEW");
  expect(body).toContain("RULES THAT APPLY NOW");

  // The export is recorded.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await admin
    .from("exports")
    .select("format")
    .eq("project_id", projectId);
  expect((data ?? []).some((e) => e.format === "txt")).toBe(true);
});
