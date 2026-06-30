import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

// The per-matter Readiness overview: opening a matter lands here, it assembles stage +
// completeness + a checklist of every step with a live status, and points to the next step.
test("readiness overview: stage, checklist, live issue count, next step", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Synthetic readiness");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // Some content plus an over-150-word abstract, so the Issues gate goes red from the
  // live deterministic check without any prior manual run.
  await page
    .getByRole("button", { name: "Title of the invention", exact: true })
    .click();
  await page.getByTestId("editor-title").fill("A molded fiber container");
  await page.getByRole("button", { name: "Abstract", exact: true }).click();
  await page.getByTestId("editor-abstract").fill("word ".repeat(180).trim());
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  // Opening the matter from the dashboard lands on the overview. The whole row is clickable
  // now (one save, so it opens directly), so click the name text and retry until it hydrates.
  await page.goto("/dashboard");
  await expect(page.getByText("Synthetic readiness")).toBeVisible();
  await expect(async () => {
    await page.getByText("Synthetic readiness").click();
    await expect(page).toHaveURL(new RegExp(`/projects/${id}/overview$`), {
      timeout: 2000,
    });
  }).toPass({ timeout: 20000 });

  await expect(page.getByText("Where this stands")).toBeVisible();
  await expect(page.getByText("Checklist", { exact: true })).toBeVisible();
  await expect(page.getByText("Completeness")).toBeVisible();
  for (const g of [
    "Draft",
    "Invention disclosure",
    "Inventors and applicant",
    "Drawings",
    "Issues",
    "Filing readiness",
    "Prior art",
    "Inventor declarations",
    "Export",
  ]) {
    await expect(page.getByText(g, { exact: true }).first()).toBeVisible();
  }

  // Color discipline: the over-long abstract is a violation, so Issues is red, and a
  // genuine filing defect (no inventors yet) keeps Filing readiness red too.
  const issues = page
    .locator('a[data-status="violation"]')
    .filter({ hasText: "Issues" });
  await expect(issues).toBeVisible();
  await expect(issues).toContainText("to fix");

  // The next-step CTA routes to the first thing that needs action.
  await expect(page.getByRole("link", { name: /^Next:/ })).toBeVisible();

  await screenshot(page, "overview-readiness");
  assertClean(errs);
});
