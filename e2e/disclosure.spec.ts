import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-v3: invention disclosure + cross-reference consistency", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Disclosure synthetic");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  // Seed a detailed description that mentions "base" but not "flux capacitor".
  await admin.from("project_sections").insert({
    project_id: id,
    section_key: "detailed_description",
    content: "The apparatus comprises a base and a motor.",
    word_count: 8,
  });

  await page.goto(`/projects/${id}/disclosure`);
  // The fields and the explicit save live in the "All fields" view (mirrors the draft).
  await page.getByRole("button", { name: "All fields", exact: true }).click();
  await page
    .getByTestId("disclosure-problem_solved")
    .fill("Existing washers are slow.");
  await page.getByTestId("disclosure-how_it_works").fill("A motor spins a base.");
  await page.getByTestId("disclosure-components").fill("base\nflux capacitor");
  await page.getByTestId("save-disclosure").click();
  await expect(page.getByText("Disclosure saved")).toBeVisible();

  // The component absent from the draft is flagged; the problem isn't in the (empty) Background.
  await expect(
    page
      .getByText(/Component "flux capacitor" .* is not claimed or described/i)
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText(/problem statement is not reflected in the Background/i).first(),
  ).toBeVisible();
  await screenshot(page, "v3-disclosure");
  assertClean(errs);

  const { data: row } = await admin
    .from("project_disclosure")
    .select("components")
    .eq("project_id", id)
    .maybeSingle();
  expect(row?.components).toContain("flux capacitor");

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  expect((audit ?? []).map((r) => r.action)).toContain("disclosure_saved");
});
