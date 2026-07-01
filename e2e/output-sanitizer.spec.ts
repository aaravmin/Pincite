import { test, expect } from "@playwright/test";
import { captureErrors, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

async function visibleBannedText(page: import("@playwright/test").Page) {
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const banned = /[-\u2010-\u2015\u2212:;]/;
    const hits: string[] = [];
    const bodyText = document.body.innerText;
    if (banned.test(bodyText)) hits.push(bodyText);
    for (const el of Array.from(
      document.querySelectorAll("[aria-label],[alt],[placeholder],[title]"),
    )) {
      for (const name of ["aria-label", "alt", "placeholder", "title"]) {
        const value = el.getAttribute(name);
        if (value && banned.test(value)) hits.push(`${name} ${value}`);
      }
    }
    return hits;
  });
}

test("outputs omit banned punctuation marks", async ({ page }) => {
  const errs = captureErrors(page);
  await page.goto("/");
  expect(await visibleBannedText(page)).toEqual([]);

  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  expect(await visibleBannedText(page)).toEqual([]);

  const id = await createMatter(page, "Output sanitizer");
  await page.goto(`/projects/${id}/uploads`);
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });
  expect(await visibleBannedText(page)).toEqual([]);
  assertClean(errs);
});
