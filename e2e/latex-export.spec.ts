import { test, expect } from "@playwright/test";
import { captureErrors, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";
import JSZip from "jszip";

// Real-patent-format export: a LaTeX bundle (patent.tex + figure files) that typesets the
// application like a published patent. Deterministic - validates the bundle and .tex structure
// (compiling to PDF is done by the user via Overleaf / pdflatex).
test("patent-format LaTeX export bundles patent.tex + figures", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "LaTeX export");

  await saveDraft(page, {
    title: "A molded fiber container",
    background: "Existing containers leak.",
    claims: "1. A container comprising a base.",
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

  // The Submission step offers the export; pull it and validate the bundle.
  await page.goto(`/projects/${id}/report`);
  await expect(page.getByTestId("download-latex")).toBeVisible();

  const res = await page.request.get(`/api/projects/${id}/export?format=latex`);
  expect(res.ok()).toBeTruthy();
  const zip = await JSZip.loadAsync(await res.body());
  const names = Object.keys(zip.files);
  expect(names).toContain("patent.tex");
  // The figure is baked into a PDF (numerals + lead lines) for the typeset drawing page.
  expect(names).toContain("figures/figure-01.pdf");
  expect(names).toContain("README.txt");

  const tex = await zip.file("patent.tex")!.async("string");
  expect(tex).toContain("\\documentclass");
  expect(tex).toContain("\\MakeUppercase{A molded fiber container}");
  expect(tex).toContain("\\padpara"); // the [NNNN] paragraph-number macro
  expect(tex).toContain("\\psection{Background of the Invention}");
  expect(tex).toContain("\\ppar{"); // a numbered paragraph
  expect(tex).toContain("Brief Description of the Drawings");
  expect(tex).toContain("What is claimed is:");
  expect(tex).toContain("\\pclaim{");
  expect(tex).toContain("A container comprising a base.");
  expect(tex).toContain("FIG. 1");
  expect(tex).toContain("\\includegraphics");
  expect(tex).toContain("figures/figure-01.pdf");

  assertClean(errs);
});
