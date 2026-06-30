import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// Drawing editor (Feature 2): Edit drawing makes the reference-numeral labels movable and the
// figure label editable; Save persists the layer. Errors are NOT computed automatically (no
// false "no figure label"); they appear only after a manual Check drawing. Deterministic: no
// vision call (labels are added by hand, figure uploaded with an explicit view).
test("drawing editor: movable labels persist, no automatic error check", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Drawing editor");

  // Upload with an explicit view so the test makes no vision call.
  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });

  // No automatic error list before any check (the old false "no figure label" is gone).
  await expect(page.getByText("No figure label")).toHaveCount(0);
  await expect(page.getByTestId("drawing-issue-count")).toHaveCount(0);

  // Edit: add a numeral and a figure label, then save.
  await page.getByTestId("edit-drawing").click();
  page.once("dialog", (d) => d.accept("18"));
  await page.getByTestId("add-numeral").click();
  page.once("dialog", (d) => d.accept("FIG. 1"));
  await page.getByRole("button", { name: "Add figure label" }).click();
  await page.getByTestId("save-drawing").click();
  await expect(page.getByTestId("edit-drawing")).toBeVisible({ timeout: 15000 });

  // The layer persists across a reload, and still no automatic error list.
  await page.reload();
  await expect(page.getByRole("button", { name: "18", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "FIG. 1", exact: true })).toBeVisible();
  await expect(page.getByText("No figure label")).toHaveCount(0);

  await screenshot(page, "feature2-drawing-editor");
  assertClean(errs);
});
