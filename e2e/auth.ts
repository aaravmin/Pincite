import { type Page, expect } from "@playwright/test";

/**
 * Establish a session in the page's cookie jar via the dev-only login endpoint.
 * page.request shares cookies with the page context, so a subsequent
 * page.goto() to a protected route is authenticated.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const res = await page.request.post("/api/dev-login", {
    maxRedirects: 0, // a redirect here means middleware blocked the route — fail loudly
    data: {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
      secret: process.env.DEV_LOGIN_SECRET,
    },
  });
  expect(
    res.status(),
    `dev-login expected 200, got ${res.status()}: ${await res.text()}`,
  ).toBe(200);
}
