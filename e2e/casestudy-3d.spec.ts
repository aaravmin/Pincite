import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { screenshot } from "./helpers";
import { loginAsTestUser } from "./auth";

/**
 * Manual screenshot generator for the 3D model viewer. The model render needs WebGL, so it
 * is skipped in the normal gate; regenerate case-3d.png with:
 *   CASE_3D=1 pnpm exec playwright test e2e/casestudy-3d.spec.ts
 */
test.skip(!process.env.CASE_3D, "manual: set CASE_3D=1 to regenerate the 3D screenshot");

test("uploads: a 3D model uploads and renders with an orientation toggle", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("3D model demo");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Perspective" }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles({
      name: "model.glb",
      mimeType: "model/gltf-binary",
      buffer: readFileSync("e2e/fixtures/sample-model.glb"),
    });

  await expect(page.getByText("model.glb")).toBeVisible();
  await expect(page.getByText("3D model", { exact: true })).toBeVisible();
  // The viewer and its orientation toggle render once the module loads.
  await expect(page.getByRole("button", { name: "Top" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Right side" })).toBeVisible();
  await page.getByRole("button", { name: "Top" }).click();
  await page.waitForTimeout(2000);
  await screenshot(page, "case-3d");
});
