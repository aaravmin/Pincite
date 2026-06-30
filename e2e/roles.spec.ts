import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function clearRole() {
  const a = admin();
  const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  if (user) await a.from("profiles").update({ role: null }).eq("id", user.id);
}

test("phase-v3: role selection + attorney portfolio", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page); // reset defaults role=inventor
  await clearRole(); // force the role screen to appear

  // Consent -> role selection (no role yet).
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/role");
  await expect(
    page.getByRole("heading", { name: /how will you use pincite/i }),
  ).toBeVisible();
  await screenshot(page, "v3-role-select");

  // Pick attorney -> portfolio dashboard.
  await page.getByRole("button", { name: /patent attorney or agent/i }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /portfolio/i })).toBeVisible();

  // Create a project with client + matter.
  const id = await createMatter(page, { name: "Synthetic bracket", client: "Apple Inc.", matterNo: "ACM-0042" });

  // Seed a complete, clean draft so "next step" must move past Drafting.
  const a = admin();
  const seed: Record<string, string> = {
    title: "A device",
    cross_reference: "Not applicable.",
    gov_interest: "Not applicable.",
    background: "Existing devices are inadequate.",
    summary: "The invention improves devices.",
    brief_description_drawings: "FIG. 1 is a perspective view.",
    detailed_description: "The device has a base.",
    claims: "1. A device comprising a base.",
    abstract: "A device with a base.",
    drawings_meta: "FIG. 1: base.",
  };
  await a.from("project_sections").upsert(
    Object.entries(seed).map(([section_key, content]) => ({
      project_id: id,
      section_key,
      content,
      word_count: content.split(/\s+/).length,
    })),
    { onConflict: "project_id,section_key" },
  );

  await page.goto("/dashboard");
  // Flat table: a Company column (not a group header row) and an Issues column.
  await expect(page.getByRole("columnheader", { name: "Company" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Issues" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Apple Inc." })).toBeVisible();
  // The draft is complete with no inventors yet, so the next step is no longer "Drafting".
  await expect(page.getByText("Add inventors")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Drafting", exact: true })).toHaveCount(0);
  await screenshot(page, "portfolio-flat-nextstep");
  assertClean(errs);
});

test("dashboard: row opens the matter, saves menu when there is more than one", async ({
  page,
}) => {
  await loginAsTestUser(page);
  // Clean slate: clear the role and any matters left by earlier tests so the dashboard is
  // small and hydrates before the row click.
  const a = admin();
  const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === process.env.TEST_USER_EMAIL)!;
  await a.from("projects").delete().eq("user_id", user.id);
  await a.from("profiles").update({ role: null }).eq("id", user.id);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/role");
  await page.getByRole("button", { name: /patent attorney or agent/i }).click();
  await page.waitForURL("**/dashboard");

  // One matter with no extra saves -> clicking the row opens it directly.
  const idA = await createMatter(page, { name: "Alpha", client: "Acme" });

  // A second matter with two saves -> clicking the row shows a menu, not a direct open.
  await page.goto("/dashboard");
  const idB = await createMatter(page, { name: "Beta", client: "Acme" });

  await a.from("project_versions").insert([
    {
      project_id: idB,
      user_id: user.id,
      label: "First save",
      snapshot: { sections: {} },
      created_at: "2026-06-01T00:00:00Z",
    },
    {
      project_id: idB,
      user_id: user.id,
      label: "Second save",
      snapshot: { sections: {} },
      created_at: "2026-06-02T00:00:00Z",
    },
  ]);

  await page.goto("/dashboard");
  await expect(page.getByRole("cell", { name: "Beta" })).toBeVisible();
  // Retry the click until the client row has hydrated and the menu opens.
  await expect(async () => {
    await page.getByRole("cell", { name: "Beta" }).click();
    await expect(page.getByText("Open a save")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
  await page.getByRole("menuitem", { name: /Second save/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${idB}/overview`));

  await page.goto("/dashboard");
  await expect(page.getByRole("cell", { name: "Alpha" })).toBeVisible();
  await expect(async () => {
    await page.getByRole("cell", { name: "Alpha" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${idA}/overview`), {
      timeout: 2000,
    });
  }).toPass({ timeout: 20000 });
});
