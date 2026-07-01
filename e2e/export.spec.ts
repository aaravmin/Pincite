import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-8: export — report renders and a TXT export is generated and logged", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Export synthetic");

  await saveDraft(page, { title: "Adjustable widget mount" });

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
