import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

// The slimmed per-matter overview: the page header (stage heading), the interactive
// findings table, and a checklist of every step with a live status + link. The old
// KPI cards / next-action beam / Compliance + Lifecycle blocks were removed.
test("readiness overview: stage heading, findings table, checklist", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const id = await createMatter(page, "Synthetic readiness");

  // Some content plus an over-150-word abstract, so the Issues gate goes red from the
  // live deterministic check without any prior manual run.
  await saveDraft(page, {
    title: "A molded fiber container",
    abstract: "word ".repeat(180).trim(),
  });

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

  // The page header stays: the "Where this stands" eyebrow + the serif stage heading.
  await expect(page.getByText("Where this stands")).toBeVisible();

  // The removed top block: no KPI cards, no "Do this next" beam, no Compliance / Lifecycle.
  await expect(page.getByText("Open red issues")).toHaveCount(0);
  await expect(page.getByText("Examiner readiness")).toHaveCount(0);
  await expect(page.getByText("Do this next")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Compliance", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Lifecycle", exact: true })).toHaveCount(0);

  // The findings table renders with the renamed "Status" column, and the over-long
  // abstract is a Description-area finding (the "Specification" label is shown as
  // "Description"), so both labels appear.
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(page.getByText("Description", { exact: true }).first()).toBeVisible();

  // The checklist of every step stays, each card links to its screen.
  await expect(page.getByText("Checklist", { exact: true })).toBeVisible();
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

  // Color discipline: the over-long abstract is a violation, so the Issues gate card
  // is red and reads "to fix"; it is a link to its screen.
  const issues = page
    .locator('a[data-status="violation"]')
    .filter({ hasText: "Issues" });
  await expect(issues).toBeVisible();
  await expect(issues).toContainText("to fix");
  await expect(issues).toHaveAttribute("href", new RegExp(`/projects/${id}/review`));

  await screenshot(page, "overview-readiness");
  assertClean(errs);
});
