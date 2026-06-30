import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

// Drawing editor (Feature 2): by default the figure shows its errors overlaid; Edit drawing
// makes the numeral labels movable and the issue list recomputes live as you edit, then Save
// persists the layer. This is deterministic (no vision call): labels are added by hand.
test("drawing editor: live error clearing and persisted edits", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Drawing editor");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // 18 is described in the draft; 99 will not be.
  await page.getByRole("button", { name: "Detailed description", exact: true }).click();
  await page
    .getByTestId("editor-detailed_description")
    .fill("The base has concentric ridges 18.");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

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

  await page.getByTestId("edit-drawing").click();

  // An undescribed numeral becomes a live issue (along with the missing figure label).
  page.once("dialog", (d) => d.accept("99"));
  await page.getByTestId("add-numeral").click();
  await expect(page.getByText("Reference numeral 99 not described")).toBeVisible();
  await expect(page.getByText("No figure label")).toBeVisible();

  // Adding the figure label clears that issue on the spot.
  page.once("dialog", (d) => d.accept("FIG. 1"));
  await page.getByRole("button", { name: "Add figure label" }).click();
  await expect(page.getByText("No figure label")).toHaveCount(0);

  // Deleting the undescribed numeral clears its issue on the spot.
  await page.getByRole("button", { name: "99", exact: true }).click();
  await page.getByTestId("delete-label").click();
  await expect(page.getByText("Reference numeral 99 not described")).toHaveCount(0);
  await expect(page.getByText(/No drawing issues/)).toBeVisible();

  // A described numeral stays clean.
  page.once("dialog", (d) => d.accept("18"));
  await page.getByTestId("add-numeral").click();
  await expect(page.getByText(/No drawing issues/)).toBeVisible();

  // Save, then reload: the layer persists and the figure still reads clean.
  await page.getByTestId("save-drawing").click();
  await expect(page.getByTestId("edit-drawing")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByRole("button", { name: "18", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "FIG. 1", exact: true })).toBeVisible();
  await expect(page.getByText(/No drawing issues/)).toBeVisible();

  await screenshot(page, "feature2-drawing-editor");
  assertClean(errs);
});
