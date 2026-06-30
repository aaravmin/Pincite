import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";
import { readFileSync } from "fs";
import JSZip from "jszip";

// Drawing export (Feature 2): the edited figure (numerals, lead lines, figure label baked in)
// exports to PNG and SVG per figure, and the same edited figure flows into the filing package.
// Deterministic: labels are added by hand, no vision call.
test("export edited figure to SVG/PNG and into the filing package", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Drawing export");

  await page.getByRole("button", { name: "Detailed description", exact: true }).click();
  await page
    .getByTestId("editor-detailed_description")
    .fill("The base 12 sits on a surface.");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });

  // Add a numeral and a figure label, then save the layer.
  await page.getByTestId("edit-drawing").click();
  page.once("dialog", (d) => d.accept("12"));
  await page.getByTestId("add-numeral").click();
  page.once("dialog", (d) => d.accept("FIG. 1"));
  await page.getByRole("button", { name: "Add figure label" }).click();
  await page.getByTestId("save-drawing").click();
  await expect(page.getByTestId("edit-drawing")).toBeVisible({ timeout: 15000 });
  await screenshot(page, "feature2-drawing-export");

  // Per-figure SVG: raster image embedded plus the vector annotations.
  const [svgDl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-svg").click(),
  ]);
  const svg = readFileSync(await svgDl.path(), "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).toContain(">12<");
  expect(svg).toContain("FIG. 1");

  // Per-figure PNG: real PNG bytes.
  const [pngDl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-png").click(),
  ]);
  const png = readFileSync(await pngDl.path());
  expect(png.length).toBeGreaterThan(1000);
  expect(png[0]).toBe(0x89);
  expect(png[1]).toBe(0x50);

  // Filing package includes the edited figure as an SVG with the annotations baked in.
  const res = await page.request.get(`/api/projects/${id}/export?format=package`);
  expect(res.ok()).toBeTruthy();
  const zip = await JSZip.loadAsync(await res.body());
  const fig = Object.keys(zip.files).find(
    (n) => n.startsWith("drawings/figure-") && n.endsWith(".svg"),
  );
  expect(fig, "package has a drawings SVG").toBeTruthy();
  const figSvg = await zip.file(fig!)!.async("string");
  expect(figSvg).toContain(">12<");
  expect(figSvg).toContain("FIG. 1");

  assertClean(errs);
});
