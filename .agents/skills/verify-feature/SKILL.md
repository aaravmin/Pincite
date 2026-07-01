---
name: verify-feature
description: Run the Pincite §7 verification gate on a feature — drive the running app with Playwright, screenshot to /screenshots, capture console errors / page exceptions / failed network requests, and pass only when everything is clean and the color discipline holds. Use after building or changing any user-facing feature, before moving on.
---

# verify-feature

The hard gate from roadmap §7. A feature is **not done** until it passes this. Never
advance to the next feature or phase with a red gate.

## What "pass" means

All four must hold:
1. **Zero console errors** (after the tight ignore-list in `e2e/helpers.ts`).
2. **Zero unhandled page exceptions.**
3. **No failed (4xx/5xx) network requests** on the feature's path.
4. **Screenshot matches the spec**, including the §2.1 color discipline:
   red ONLY on a violation, yellow ONLY on a highlight/conditional, green ONLY on
   applies-and-passes. Neutral grays/black/white carry everything else.

## How to run it for a feature

1. Make sure deps + browser are installed (one-time):
   `pnpm install && pnpm exec playwright install chromium`
2. Write or extend a spec at `e2e/<feature>.spec.ts`:
   ```ts
   import { test } from "@playwright/test";
   import { captureErrors, screenshot, assertClean } from "./helpers";

   test("phase-<n>: <feature> works", async ({ page }) => {
     const errs = captureErrors(page);
     await page.goto("/<route>");
     // ...drive the feature to its EXACT target state (click, fill, etc.)...
     await screenshot(page, "phase-<n>-<feature>");
     assertClean(errs);
   });
   ```
   The shared harness lives in `e2e/helpers.ts`:
   - `captureErrors(page)` attaches console/pageerror/requestfailed/response listeners.
   - `screenshot(page, name)` writes `screenshots/<name>.png` (full page).
   - `assertClean(errs)` fails the test with a readable diff if anything was captured.
3. Run it: `pnpm exec playwright test e2e/<feature>.spec.ts`
   (or `pnpm verify` for the whole suite). The config auto-starts `pnpm dev`.
4. If it fails: read the captured errors, **fix the app**, re-run from step 3. Do not
   edit the ignore-list to make a real error disappear.
5. Open the screenshot and confirm layout + color discipline by eye.
6. Append one line to `screenshots/VERIFICATION-LOG.md`:
   `YYYY-MM-DD | phase-<n> <feature> | PASS | notes`

## Conventions
- Screenshots: `screenshots/phase-<n>-<feature>.png`, kept in-repo (auditable history).
- One spec file per feature, named for the feature.
- Specs run serially (`workers: 1`) so screenshots and server state are deterministic.
- The ignore-lists in `e2e/helpers.ts` are intentionally tiny; expand only for proven
  benign noise, and note why in a comment.
