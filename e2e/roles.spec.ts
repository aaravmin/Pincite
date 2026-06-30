import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
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
  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Synthetic bracket");
  await page.getByLabel("Client").fill("Acme Corp");
  await page.getByLabel("Matter no.").fill("ACM-0042");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");

  // Back to the portfolio: grouped under the client, with the matter number.
  await page.goto("/dashboard");
  await expect(page.getByText("Acme Corp")).toBeVisible();
  await expect(page.getByText("ACM-0042")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Synthetic bracket" }),
  ).toBeVisible();
  await screenshot(page, "v3-attorney-portfolio");

  assertClean(errs);

  // Audit recorded the role selection.
  const a = admin();
  const { data: list } = await a.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await a
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  expect((audit ?? []).map((r) => r.action)).toContain("role_selected");
});

test("portfolio table: company column and progress-based next step", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await clearRole();
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/role");
  await page.getByRole("button", { name: /patent attorney or agent/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Container");
  await page.getByLabel("Client").fill("Apple Inc.");
  await page.getByLabel("Matter no.").fill("APPL-CONTAINER-2026-001");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

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
