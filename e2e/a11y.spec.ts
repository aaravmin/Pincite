import { test, expect } from "@playwright/test";
import { createMatter, saveDraft } from "./helpers";
import AxeBuilder from "@axe-core/playwright";
import { loginAsTestUser } from "./auth";

const BLOCKING = ["serious", "critical"];

test("phase-9: key screens have no serious or critical accessibility violations", async ({
  page,
}) => {
  // Scans 12 screens, each a cold Turbopack compile + navigation + axe pass; the default
  // 60s is not enough on a cold dev server (it only passed before when prior specs had
  // warmed the routes). Give it room so the gate is not run-order dependent.
  test.setTimeout(300000);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const id = await createMatter(page, "A11y synthetic");

  // Give the screens content + findings to render.
  await saveDraft(page, {
    claims: "1. A device comprising means for adjusting a widget.",
  });
  await page.goto(`/projects/${id}/review`);
  await page.getByTestId("run-check").click();
  await expect(page.getByText(/Violation|Attention/).first()).toBeVisible();

  const routes = [
    "/",
    "/dashboard",
    `/projects/${id}`,
    `/projects/${id}/review`,
    `/projects/${id}/rules`,
    `/projects/${id}/stage`,
    `/projects/${id}/disclosure`,
    `/projects/${id}/inventors`,
    `/projects/${id}/uploads`,
    `/projects/${id}/sign`,
    `/projects/${id}/report`,
    `/projects/${id}/audit`,
  ];

  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle").catch(() => {});
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) =>
      BLOCKING.includes(v.impact ?? ""),
    );
    expect(blocking, `${route}: ${blocking.map((v) => v.id).join(", ")}`).toEqual([]);
  }
});
