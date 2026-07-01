import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// The drawing edit/vectorize surface was removed. Uploads are read-only: users can rotate,
// label the view, open/remove, and run a manual drawing check, but cannot edit the figure.
test("drawings: uploaded figures are read-only; edit/vector tools are absent", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Read-only drawing");

  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });

  await expect(page.getByTestId("edit-drawing")).toHaveCount(0);
  await expect(page.getByTestId("vectorize")).toHaveCount(0);
  await expect(page.getByTestId("scene-object")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /check this figure/i })).toBeVisible();
  await expect(page.getByTestId("export-original")).toBeVisible();
  await expect(page.getByTestId("drawing-issue-count")).toHaveCount(0);

  await screenshot(page, "feature2-drawing-readonly");
  assertClean(errs);
});
