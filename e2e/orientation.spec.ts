import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

// Drawing-orientation labeling: uploads auto-detect their view (top/front/perspective...),
// and a wrong label is correctable per figure. The deterministic test uses an explicit view
// + the per-figure override (no vision call); the vision auto-detect is a guarded check.

async function newProject(page: import("@playwright/test").Page) {
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Orientation");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  return page.url().split("/projects/")[1].split(/[/?#]/)[0];
}

test("figure view: explicit label on upload, then correctable per figure", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  const id = await newProject(page);
  await page.goto(`/projects/${id}/uploads`);

  // No vision runs on upload; choose an explicit view.
  await expect(page.getByLabel("Drawing orientation")).toContainText("Not specified");
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig01.png");

  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByLabel("Figure view")).toContainText("Front");

  // Correct the label by hand; it persists across a reload.
  await page.getByLabel("Figure view").click();
  await page.getByRole("option", { name: "Right side", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByLabel("Figure view")).toContainText("Right side");

  await screenshot(page, "feature1-figure-view");
  assertClean(errs);
});

test("Detect view assigns a view from the image (vision)", async ({ page }) => {
  test.skip(
    !process.env.ORIENT_VISION,
    "vision: set ORIENT_VISION=1 to run the live Detect view check",
  );
  test.setTimeout(120000);
  await loginAsTestUser(page);
  const id = await newProject(page);
  await page.goto(`/projects/${id}/uploads`);

  // Upload without a view, then opt in to detection via the per-figure Detect view button.
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig01.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Detect view" }).click();
  await expect(page.getByLabel("Figure view")).not.toContainText("Not specified", {
    timeout: 90000,
  });
});
