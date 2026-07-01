import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { captureErrors, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// The edited vector scene is the drawing of record: once a figure is vectorized, the filing
// package files it as the vector scene (real <path> geometry), not the old raster+overlay SVG.
test("vector editor: a vectorized figure is filed as its vector scene", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Vector export");

  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("vectorize").click();
  await expect(page.getByTestId("scene-object").first()).toBeVisible({ timeout: 90000 });

  // The filing package now carries the vector scene as figure-01.svg.
  const res = await page.request.get(`/api/projects/${id}/export?format=package`);
  expect(res.ok()).toBeTruthy();
  const zip = await JSZip.loadAsync(await res.body());
  const name = Object.keys(zip.files).find(
    (n) => n.startsWith("drawings/figure-") && n.endsWith(".svg"),
  );
  expect(name, "package has a drawings SVG").toBeTruthy();
  const svg = await zip.file(name!)!.async("string");
  // Real traced geometry, not an embedded raster.
  expect(svg).toContain("<path");
  expect(svg).not.toContain("data:image/png");

  assertClean(errs);
});
