import { type Page, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Reset the test user so each spec is isolated even when the whole suite runs in one
 * process: clear consent (so the consent screen reappears), clear the audit log (so audit
 * assertions are precise), and delete projects (cascades to sections, versions, findings,
 * prior-art). Mirrors e2e/global-setup.ts, applied per login.
 */
async function resetTestUser(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.TEST_USER_EMAIL;
  if (!url || !key || !email) return;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  if (!user) return;
  // Clear consent (so the consent screen reappears) and default the role to inventor so
  // consent flows straight through to the dashboard. The roles spec overrides this.
  await admin
    .from("profiles")
    .update({ consented_at: null, role: "inventor" })
    .eq("id", user.id);
  await admin.from("audit_log").delete().eq("user_id", user.id);
  await admin.from("projects").delete().eq("user_id", user.id);
  // Clear rate-limit usage so the suite is order- and run-count-independent.
  await admin.from("api_usage").delete().eq("user_id", user.id);
}

/**
 * Establish a session in the page's cookie jar via the dev-only login endpoint.
 * page.request shares cookies with the page context, so a subsequent page.goto() to a
 * protected route is authenticated. Also resets the test user's projects for isolation.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await resetTestUser();
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
