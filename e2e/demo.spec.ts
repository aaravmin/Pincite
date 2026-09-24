import { test, expect } from "@playwright/test";
import { CASE_STUDY_PROJECT_NAME } from "@/shared/demo/fixture/case-study";
import { DEMO_FIGURE_FILENAME } from "@/shared/demo/fixture/ids";
import { sanitizeOutputText } from "@/shared/text/sanitize";
import { captureErrors, screenshot, assertClean } from "./helpers";

// Demo mode, run by `pnpm verify:demo` (playwright.demo.config.ts): no Supabase project, no
// provider keys, and no login, because the demo viewer is always signed in. Walks the path a
// stranger takes on a fresh clone: the banner, the seeded case study, a finding opening its
// pinned MPEP rule from the fixture corpus, and FIG. 1 served by the storage stub.
test("demo mode: the case study runs with no credentials", async ({ page }) => {
  const errs = captureErrors(page);

  // Signed in already, so the landing page forwards to the dashboard.
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("demo-banner")).toContainText("Demo mode");
  await expect(page.getByRole("heading", { name: /your patents/i })).toBeVisible();

  // The row navigates from a click handler, so retry a click that lands before hydration.
  await expect(async () => {
    await page.getByText(CASE_STUDY_PROJECT_NAME, { exact: true }).click();
    await page.waitForURL("**/projects/*/overview", { timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
  const projectId = new URL(page.url()).pathname.split("/")[2];

  // Review: the claim 6 finding opens MPEP 608.01(n) beside the list.
  await page
    .getByRole("navigation", { name: "Filing steps" })
    .getByRole("link", { name: "Review", exact: true })
    .click();
  await page.waitForURL("**/review");
  await page
    .getByRole("button", { name: /refers to claim 6, which does not exist/i })
    .click();
  const rulePane = page.getByTestId("rule-pane");
  await expect(rulePane).toContainText("608.01(n)");
  await expect(rulePane).toContainText(/dependent/i);
  await screenshot(page, "demo-evidence");

  // Drawings: the fixture figure is listed (its name as the output sanitizer shows it) and
  // its bytes stream from the storage stub.
  await page.goto(`/projects/${projectId}/uploads`);
  await expect(
    page.getByText(sanitizeOutputText(DEMO_FIGURE_FILENAME), { exact: true }),
  ).toBeVisible();
  const figure = page.getByRole("img", { name: "Uploaded figure" });
  await expect
    .poll(
      () => figure.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);

  // The figure's Open link goes through the signed URL path: the stub signs a relative
  // "?raw=1", and the route must resolve it against itself and land on the same bytes.
  const openHref =
    (await page.getByRole("link", { name: "Open", exact: true }).getAttribute("href")) ?? "";
  const opened = await page.evaluate(async (href) => {
    const res = await fetch(href);
    return {
      ok: res.ok,
      redirected: res.redirected,
      url: res.url,
      type: res.headers.get("content-type"),
    };
  }, openHref);
  expect(opened).toMatchObject({ ok: true, redirected: true, type: "image/png" });
  expect(opened.url).toMatch(/\/attachments\/[^/?]+\?raw=1$/);

  assertClean(errs);
});
