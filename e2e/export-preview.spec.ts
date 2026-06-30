import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// File-output preview: on the Submission step each export can be previewed in a half-screen
// panel before downloading. Deterministic - no AI, no vision.
test("export preview: half-screen preview of the LaTeX and report outputs", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Preview demo");

  await page.getByRole("button", { name: "Title of the invention", exact: true }).click();
  await page.getByTestId("editor-title").fill("A molded fiber container");
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  await page.getByTestId("editor-claims").fill("1. A container comprising a base.");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  await page.goto(`/projects/${id}/report`);

  // LaTeX preview: the .tex source appears in the half-screen pane with the bundle file list.
  await page.getByTestId("preview-latex").click();
  const pane = page.getByTestId("export-preview-pane");
  await expect(pane).toBeVisible();
  await expect(pane).toContainText("\\documentclass");
  await expect(pane).toContainText("What is claimed is:");
  await expect(pane).toContainText("A container comprising a base.");
  // The bundle file list names patent.tex (also the header filename, so allow more than one).
  await expect(pane.getByText("patent.tex", { exact: true }).first()).toBeVisible();
  // It offers a direct download from the pane.
  await expect(page.getByTestId("preview-download")).toBeVisible();
  await screenshot(page, "export-preview-latex");

  // Switching to another format swaps the pane content.
  await page.getByTestId("preview-txt").click();
  await expect(pane).toBeVisible();
  await expect(pane.getByRole("heading", { name: "Review report" })).toBeVisible();

  // Close hides the pane.
  await page.getByTestId("preview-close").click();
  await expect(pane).toHaveCount(0);

  assertClean(errs);
});
