import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { screenshot } from "./helpers";
import { loginAsTestUser } from "./auth";

/**
 * Manual screenshot generator for the figure navigator, the drawing check, and the 3D
 * viewer, run against PUBLIC Apple material (US 2012/0024859 A1, FIG. 1 and FIG. 6) plus a
 * generated round-container model. It makes a live Grok vision call, so it is skipped in
 * the normal gate. Regenerate case-drawing.png and case-3d.png with:
 *   CASE_VISION=1 pnpm exec playwright test e2e/casestudy-drawing.spec.ts
 */
test.skip(!process.env.CASE_VISION, "manual: set CASE_VISION=1 to regenerate the screenshots");

test("figures: navigator across views, drawing check, and 3D model", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Apple molded fiber food container");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // A detailed description that names most reference numerals but omits a few (16, 44, 46),
  // so the drawing check circles only the undescribed ones.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  await admin.from("project_sections").insert([
    {
      project_id: id,
      section_key: "detailed_description",
      content:
        "The container 10 comprises a lid 12 and a base 24 joined by a hinge 38. The lid 12 carries concentric ridges 14, 18, 20, and 22, an outer rim 26, and a sidewall 28. The base 24 has an interior surface 30, a plurality of vent openings 32, a central hub 34, support recesses 36, and a moisture channeling feature 40 cooperating with channels 42 and a drain 48. A closure tab 50 and a catch 52 hold the lid 12 to the base 24.",
      word_count: 80,
    },
  ]);

  await page.goto(`/projects/${id}/uploads`);

  async function uploadFigure(orientation: string, name: string, file: string) {
    await page.getByLabel("Drawing orientation").click();
    await page.getByRole("option", { name: orientation, exact: true }).click();
    await page
      .getByTestId("upload-input")
      .setInputFiles({
        name,
        mimeType: name.endsWith(".glb") ? "model/gltf-binary" : "image/png",
        buffer: readFileSync(`e2e/fixtures/${file}`),
      });
    await expect(page.getByText(name)).toBeVisible();
  }

  // Three views: a perspective figure, a top figure, and the 3D container model.
  await uploadFigure("Perspective", "fig1.png", "apple-container-fig01.png");
  await uploadFigure("Top / plan", "fig6.png", "apple-container-fig05.png");
  await uploadFigure("Leave unlabeled", "container.glb", "sample-model.glb");

  // The newest upload (the 3D model) is selected first. Snap it to an orientation and shoot.
  await expect(page.getByRole("button", { name: "Top" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Perspective", exact: true }).click();
  await page.waitForTimeout(1500);
  await screenshot(page, "case-3d");

  // Switch to the perspective figure and run the drawing check.
  await page.getByRole("button", { name: "3. Perspective" }).click();
  await page.getByTestId("describe-drawing").click();
  await expect(
    page.getByText(/vision estimate, verify|No drawing issues/i),
  ).toBeVisible({ timeout: 90_000 });
  const fig = page.locator('img[alt="Uploaded figure under review"]');
  await page.waitForFunction(
    () => {
      const i = document.querySelector(
        'img[alt="Uploaded figure under review"]',
      ) as HTMLImageElement | null;
      return !!i && i.complete && i.naturalWidth > 0;
    },
    { timeout: 30_000 },
  );
  await fig.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await screenshot(page, "case-drawing");
});
