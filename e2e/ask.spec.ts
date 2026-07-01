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

  // A question whose closest stub section is a bare cross-reference ("See MPEP Chapter
  // 2300.") must NOT route the user to that pointer - it resolves to a substantive section
  // with real text instead. (Regression: pointer stubs used to win the locate step.)
  await page
    .getByTestId("ask-input")
    .fill("cancel a claim that was lost in an interference proceeding");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("evidence")).toBeVisible();
  await expect(page.getByTestId("evidence")).not.toContainText(
    /^\s*See MPEP Chapter \d+\.\s*$/,
  );
  const highlighted = (
    await page.locator("#evidence-highlight").textContent()
  )?.trim();
  expect(highlighted, "highlight should be real text, not a bare pointer").not.toMatch(
    /^See MPEP (Chapter \d+|§)/i,
  );

  // A section number not in the corpus is dropped, not fabricated.
  await page.getByTestId("ask-input").fill("MPEP 2111.99 imaginary subsection");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("2111.99")).toBeVisible();
  await expect(page.getByText(/not in the corpus/i)).toBeVisible();
  await screenshot(page, "phase-2-fake-cite-dropped");

  assertClean(errs);
});
