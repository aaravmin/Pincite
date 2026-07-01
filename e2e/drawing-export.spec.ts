import { test, expect } from "@playwright/test";
import { captureErrors, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";
import { readFileSync } from "fs";
import JSZip from "jszip";

// With editing removed, per-figure export and the filing package preserve the uploaded
// drawing bytes instead of baking in labels, lead lines, or vectorized objects.
test("drawing export: original figure is preserved", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Drawing export");

  await saveDraft(page, {
    detailed_description: "The base 12 sits on a surface.",
  });

  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-original").click(),
  ]);
  const png = readFileSync(await download.path());
  expect(png.length).toBeGreaterThan(1000);
  expect(png[0]).toBe(0x89);
  expect(png[1]).toBe(0x50);

  const res = await page.request.get(`/api/projects/${id}/export?format=package`);
  expect(res.ok()).toBeTruthy();
  const zip = await JSZip.loadAsync(await res.body());
  const fig = Object.keys(zip.files).find(
    (n) => n.startsWith("drawings/figure-") && n.endsWith(".png"),
  );
  expect(fig, "package has the original PNG drawing").toBeTruthy();
  const packaged = await zip.file(fig!)!.async("nodebuffer");
  expect(packaged[0]).toBe(0x89);
  expect(packaged[1]).toBe(0x50);

  assertClean(errs);
});
