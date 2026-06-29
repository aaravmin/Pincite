import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { screenshot } from "./helpers";
import { loginAsTestUser } from "./auth";

/**
 * Manual screenshot generator for the drawing check, run against a real PUBLIC figure:
 * Apple's molded fiber food container (US 2012/0024859 A1, FIG. 1). It makes a live Grok
 * vision call, so it is skipped in the normal gate; regenerate case-drawing.png with:
 *   CASE_VISION=1 pnpm exec playwright test e2e/casestudy-drawing.spec.ts
 */
test.skip(!process.env.CASE_VISION, "manual: set CASE_VISION=1 to regenerate the screenshot");

test("case study: drawing check flags undescribed numerals with red circles", async ({
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

  // A detailed description that introduces MOST reference numerals but deliberately omits a
  // few (16, 44, 46), so the drawing check circles only the undescribed ones - a realistic
  // draft with a small gap, not a wall of findings.
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
  await page
    .getByTestId("upload-input")
    .setInputFiles({
      name: "fig1.png",
      mimeType: "image/png",
      buffer: readFileSync("e2e/fixtures/apple-container-fig.png"),
    });
  await expect(page.getByText("fig1.png")).toBeVisible();

  await page.getByTestId("describe-drawing").click();
  await expect(
    page.getByText(/vision estimate, verify|No drawing issues/i),
  ).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1000);
  await screenshot(page, "case-drawing");
});
