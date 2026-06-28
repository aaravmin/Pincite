import { test, expect } from "@playwright/test";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-2: Ask opens the evidence pane with the right section highlighted; fake cite dropped", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/ask");

  // Open a known rule -> evidence pane shows the full correct section, highlighted.
  await page
    .getByTestId("ask-input")
    .fill("2111.03 transitional phrases comprising consisting");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("evidence")).toContainText("2111.03");
  await expect(page.getByTestId("evidence")).toContainText("Transitional Phrases");
  await expect(page.locator("#evidence-highlight")).toBeVisible();
  await screenshot(page, "phase-2-evidence-pane");

  // A question with no section number still locates the right section (semantic, with a
  // keyword fallback) and loads it into the evidence pane.
  await page
    .getByTestId("ask-input")
    .fill("which transitional phrase makes a claim open ended");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("evidence")).toContainText("2111.03");

  // A section number not in the corpus is dropped, not fabricated.
  await page.getByTestId("ask-input").fill("MPEP 2111.99 imaginary subsection");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("2111.99")).toBeVisible();
  await expect(page.getByText(/not in the corpus/i)).toBeVisible();
  await screenshot(page, "phase-2-fake-cite-dropped");

  assertClean(errs);
});
