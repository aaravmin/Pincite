import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { captureErrors, screenshot, assertClean, createMatter, saveFiling } from "./helpers";
import { loginAsTestUser } from "./auth";

// The operative signature is the inventor's hand-signed declaration document - there is no
// in-app "sign here" attestation. The Sign step shows what the declaration says (read-only),
// hands the inventor the real document to sign, and bundles the uploaded signed copy into the
// filing package.
test("sign: declaration is download-sign-upload, no in-app signature", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const id = await createMatter(page, "Synthetic latch");

  // Title + one inventor.
  await page.getByRole("button", { name: "Title of the invention", exact: true }).click();
  await page.getByTestId("editor-title").fill("A synthetic latch");
  await page.goto(`/projects/${id}/inventors`);
  await page.getByTestId("inventor-name-0").fill("Dana Synthetic");
  await page.getByLabel("Residence (city, state/country)").fill("Austin, TX");
  await page.getByLabel("Mailing address").fill("1 Test St, Austin, TX 78701");
  await saveFiling(page);

  await page.goto(`/projects/${id}/sign`);

  // The declaration statements are shown read-only; the old in-app certify / S-signature flow
  // and the filing-readiness checks are gone from this step.
  await expect(page.getByText(/What the declaration states/i)).toBeVisible();
  await expect(page.getByText(/original inventor/i).first()).toBeVisible();
  await expect(page.getByText("Dana Synthetic")).toBeVisible();
  await expect(page.getByRole("button", { name: /certify declaration/i })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByLabel("S-signature")).toHaveCount(0);
  await expect(page.getByText("Filing readiness")).toHaveCount(0);

  // Download the real document, then upload a signed copy.
  await expect(page.getByTestId("download-declaration")).toBeVisible();
  const res = await page.request.get(`/api/projects/${id}/declaration`);
  expect(res.ok()).toBeTruthy();
  const pdf = await res.body();
  expect(String.fromCharCode(...pdf.slice(0, 5))).toBe("%PDF-");

  await page.getByTestId("declaration-input").setInputFiles({
    name: "signed-declaration.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await expect(page.getByText("signed-declaration.pdf")).toBeVisible({ timeout: 15000 });
  await screenshot(page, "v3-sign");

  // The uploaded signed declaration is recorded as a declaration-kind attachment...
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: atts } = await admin
    .from("project_attachments")
    .select("kind, filename")
    .eq("project_id", id)
    .eq("kind", "declaration");
  expect((atts ?? []).length).toBe(1);

  // ...and bundled verbatim into the filing-package zip under declarations/.
  const pkg = await page.request.get(`/api/projects/${id}/export?format=package`);
  expect(pkg.ok()).toBeTruthy();
  const zip = await JSZip.loadAsync(await pkg.body());
  const names = Object.keys(zip.files);
  expect(names.some((f) => f.startsWith("declarations/"))).toBe(true);

  assertClean(errs);
});
