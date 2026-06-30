import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-v3: USPTO-aligned DOCX + filing package export", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const projectId = await createMatter(page, "Synthetic clasp");

  await page.getByTestId("editor-title").fill("A synthetic clasp mechanism");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  // Report screen exposes the new export buttons.
  await page.goto(`/projects/${projectId}/report`);
  await expect(page.getByTestId("download-package")).toBeVisible();
  await expect(page.getByTestId("download-docx")).toBeVisible();
  await screenshot(page, "v3-export");

  // DOCX: a valid Office Open XML file (zip, starts with "PK").
  const docx = await page.request.get(
    `/api/projects/${projectId}/export?format=docx`,
  );
  expect(docx.status()).toBe(200);
  expect(docx.headers()["content-type"]).toContain(
    "officedocument.wordprocessingml",
  );
  const docxBody = await docx.body();
  expect(docxBody.length).toBeGreaterThan(500);
  expect(docxBody.subarray(0, 2).toString("latin1")).toBe("PK");

  // Package: a zip with the spec + supporting docs.
  const pkg = await page.request.get(
    `/api/projects/${projectId}/export?format=package`,
  );
  expect(pkg.status()).toBe(200);
  expect(pkg.headers()["content-type"]).toContain("zip");
  const pkgBody = await pkg.body();
  expect(pkgBody.length).toBeGreaterThan(1000);
  expect(pkgBody.subarray(0, 2).toString("latin1")).toBe("PK");

  assertClean(errs);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: ex } = await admin
    .from("exports")
    .select("format")
    .eq("project_id", projectId);
  const formats = (ex ?? []).map((r) => r.format);
  expect(formats).toContain("docx");
  expect(formats).toContain("package");
});
