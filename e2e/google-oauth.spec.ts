import { test, expect } from "@playwright/test";
import { screenshot } from "./helpers";

/**
 * Verifies the Google sign-in is wired end-to-end up to Google's own page.
 * We cannot automate Google's actual login (it blocks bots), so we assert the
 * button initiates the real OAuth redirect and lands on accounts.google.com
 * without a provider/redirect-uri error.
 */
test("phase-0: Google button initiates the real OAuth redirect", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /continue with google/i }).click();

  // Redirect chain: our /login -> Supabase /authorize -> accounts.google.com
  await page.waitForURL(/accounts\.google\.com/, { timeout: 20_000 });
  expect(page.url()).toContain("accounts.google.com");

  const body = (await page.locator("body").innerText().catch(() => "")) ?? "";
  // Common misconfiguration signals — surface them clearly if present.
  expect(
    /redirect_uri_mismatch|Error 400|invalid_client|access blocked/i.test(body),
    `Google returned a configuration error:\n${body.slice(0, 400)}`,
  ).toBeFalsy();

  await screenshot(page, "phase-0-google-oauth");
});
