import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveFiling, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

// Real signing: the inventor downloads the declaration (37 CFR 1.63) as a PDF, signs it, and
// uploads the signed copy, which is kept with the matter on the Sign step.
test("declaration: download to sign and upload the signed copy", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Sign demo");

  await saveDraft(page, { title: "A molded fiber container" });
  await page.goto(`/projects/${id}/inventors`);
  await page.getByTestId("inventor-name-0").fill("Test Inventor");
  await page.getByLabel("Residence (city, state/country)").fill("Austin, TX");
  await page.getByLabel("Mailing address").fill("1 Test St, Austin, TX 78701");
  await saveFiling(page);

  // The generated declaration is a real PDF with one page per inventor.
  const res = await page.request.get(`/api/projects/${id}/declaration`);
  expect(res.ok()).toBeTruthy();
  const pdf = await res.body();
  expect(String.fromCharCode(...pdf.slice(0, 5))).toBe("%PDF-");

  // Upload the signed copy on the Sign step.
  await page.goto(`/projects/${id}/sign`);
  await expect(
    page.getByRole("heading", { name: "Signed declaration document" }),
  ).toBeVisible();
  await page.getByTestId("declaration-input").setInputFiles({
    name: "signed-declaration.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await expect(page.getByText("signed-declaration.pdf")).toBeVisible({ timeout: 15000 });
  await screenshot(page, "declaration-signed");

  assertClean(errs);
});
