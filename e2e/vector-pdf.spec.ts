import { test, expect } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// A multi-page PDF becomes one figure (row) per page, and each page vectorizes on demand.
// Deterministic: tracing is AI-free and the PDF is generated in-test with line art.
async function twoPagePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let p = 0; p < 2; p++) {
    const page = doc.addPage([400, 300]);
    page.drawRectangle({
      x: 40,
      y: 40,
      width: 320,
      height: 220,
      borderColor: rgb(0, 0, 0),
      borderWidth: 2,
    });
    page.drawCircle({ x: 200, y: 150, size: 55, borderColor: rgb(0, 0, 0), borderWidth: 2 });
    page.drawLine({ start: { x: 60, y: 70 }, end: { x: 150, y: 130 }, thickness: 2 });
  }
  return Buffer.from(await doc.save());
}

test("vector editor: a multi-page PDF splits into per-page figures that vectorize", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Vector PDF");

  await page.goto(`/projects/${id}/uploads`);
  await page
    .getByTestId("upload-input")
    .setInputFiles({ name: "figs.pdf", mimeType: "application/pdf", buffer: await twoPagePdf() });

  // Both pages appear as separate figures.
  await expect(page.getByRole("heading", { name: /Figures \(2\)/ })).toBeVisible({
    timeout: 30000,
  });

  // Vectorize the first page and confirm traced objects render.
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("vectorize").click();
  await expect(page.getByTestId("scene-object").first()).toBeVisible({ timeout: 90000 });
  expect(await page.getByTestId("scene-object").count()).toBeGreaterThan(1);

  await screenshot(page, "vectorD-pdf");
  assertClean(errs);
});
