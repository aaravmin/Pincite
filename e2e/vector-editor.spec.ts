import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// Vector drawing editor: an uploaded drawing has two views. "Original" is the untouched upload;
// "Edit drawing" vectorizes the line-art into individually addressable path objects that can be
// moved, resized, hidden, and deleted, with the edits persisted. Tracing is deterministic (no
// vision/AI call), so this runs in the normal gate with an explicit view on upload.

// Find a visible traced object and a screen point that provably lands on it (verified with
// elementFromPoint, so the click selects the shape rather than the empty middle of its bbox).
// Skips objects already used so callers can pick a distinct one.
async function clickableObject(page: Page, skip: string[] = []) {
  const r = await page.evaluate((skipOids) => {
    const paths = Array.from(
      document.querySelectorAll('[data-testid="scene-object"]'),
    ) as SVGPathElement[];
    // Only trust objects whose solid interior (bbox centre) is the topmost element there, so an
    // integer-rounded click reliably lands on the fill rather than a thin edge.
    for (const el of paths) {
      const oid = el.getAttribute("data-oid");
      if (!oid || skipOids.includes(oid)) continue;
      const box = el.getBoundingClientRect();
      const x = Math.round(box.left + box.width / 2);
      const y = Math.round(box.top + box.height / 2);
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.getAttribute("data-oid") === oid) return { x, y, oid };
    }
    return null;
  }, skip);
  if (!r) throw new Error("no reliably clickable object found");
  return r;
}

test("vector editor: vectorize, move, hide, and persist edits", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Vector editor");

  await page.goto(`/projects/${id}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Front", exact: true }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles("e2e/fixtures/apple-container-fig04.png");
  await expect(page.getByRole("heading", { name: /Figures \(1\)/ })).toBeVisible({
    timeout: 30000,
  });

  // Vectorize on the Edit tab.
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("vectorize").click();
  const objects = page.getByTestId("scene-object");
  await expect(objects.first()).toBeVisible({ timeout: 90000 });
  expect(await objects.count()).toBeGreaterThan(20);

  // Select an object by clicking on it, then drag it. Selection shows resize handles; the move
  // commits and leaves that object carrying a transform.
  const a = await clickableObject(page);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 70, a.y + 50, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId("scene-handle").first()).toBeVisible();

  // Select a different object and hide it.
  const b = await clickableObject(page, [a.oid]);
  await page.mouse.click(b.x, b.y);
  await page.getByTestId("scene-hide").click();
  await expect(page.getByTestId("scene-object-hidden").first()).toBeVisible();

  // Undo restores it.
  await page.getByTestId("scene-undo").click();
  await expect(page.getByTestId("scene-object-hidden")).toHaveCount(0);

  // Add a new lead line by dragging in "Add line" mode; it becomes a new object.
  const beforeAdd = await page.getByTestId("scene-object").count();
  const svgBox = await page.getByTestId("scene-svg").boundingBox();
  if (!svgBox) throw new Error("no scene svg box");
  await page.getByTestId("scene-add-line").click();
  const lx = svgBox.x + svgBox.width * 0.15;
  const ly = svgBox.y + svgBox.height * 0.15;
  await page.mouse.move(lx, ly);
  await page.mouse.down();
  await page.mouse.move(lx + 130, ly + 90, { steps: 6 });
  await page.mouse.up();
  await page.getByTestId("scene-add-line").click();
  await expect(page.getByTestId("scene-object")).toHaveCount(beforeAdd + 1);

  // Hide one again, then save.
  const c = await clickableObject(page, [a.oid]);
  await page.mouse.click(c.x, c.y);
  await page.getByTestId("scene-hide").click();
  await page.getByTestId("scene-save").click();
  await expect(page.getByTestId("scene-save")).toBeDisabled({ timeout: 15000 });

  await screenshot(page, "vectorB-edited");

  // Reload and reopen Edit: the scene is fetched fresh from the server, so a persisted move
  // (an object carrying a transform) and a persisted hide must both survive.
  await page.reload();
  await page.getByTestId("tab-edit").click();
  await expect(page.getByTestId("scene-object").first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-testid="scene-object"][transform]').first()).toBeVisible();
  await expect(page.getByTestId("scene-object-hidden").first()).toBeVisible();
  // The added lead line (a stroked path) persisted too.
  await expect(page.locator('[data-testid="scene-object"][stroke]').first()).toBeVisible();

  assertClean(errs);
});
