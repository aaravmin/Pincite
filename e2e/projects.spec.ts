import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-1: create project, intake autosave, versioning, restore — all audited", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  // Consent (the test user is reset to unconsented each run).
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  // Create a project via the dialog (patent type defaults to Utility).
  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Synthetic widget mount");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const projectId = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // Intake: Title is active by default. Fill it and wait for debounced autosave.
  await page
    .getByTestId("editor-title")
    .fill("Adjustable mount for a widget");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await screenshot(page, "phase-1-intake");

  // Save a first version.
  await page.getByRole("button", { name: "Save version" }).click();
  await page.getByLabel(/label/i).fill("First draft");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await screenshot(page, "phase-1-save");

  // Edit, then save a second version (proves saves append, not overwrite).
  await page
    .getByTestId("editor-title")
    .fill("Adjustable mount for a widget, revised");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
  await page.getByRole("button", { name: "Save version" }).click();
  await page.getByLabel(/label/i).fill("Second draft");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Version history shows both saves.
  await page.getByRole("link", { name: /version history/i }).click();
  await page.waitForURL("**/versions");
  await expect(page.getByText("First draft")).toBeVisible();
  await expect(page.getByText("Second draft")).toBeVisible();
  await screenshot(page, "phase-1-versions");

  // Continue from the oldest save (last row) -> opens a NEW save in the workspace.
  await page.getByRole("button", { name: /continue from this save/i }).last().click();
  await page.waitForURL(`**/projects/${projectId}`);
  await screenshot(page, "phase-1-restore");

  assertClean(errs);

  // DB: versions are append-only (>= 3: two saves + one restore-created), and the
  // restore appended a parent-linked snapshot rather than overwriting history.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: versions } = await admin
    .from("project_versions")
    .select("id, parent_version_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  expect((versions ?? []).length).toBeGreaterThanOrEqual(3);
  expect(
    (versions ?? []).some((v) => v.parent_version_id),
    "restore appended a parent-linked version",
  ).toBe(true);

  // Audit trail covers every Phase 1 action.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  const actions = (audit ?? []).map((r) => r.action);
  for (const a of [
    "project_created",
    "section_edited",
    "version_saved",
    "version_restored",
  ]) {
    expect(actions, `audit contains ${a}`).toContain(a);
  }
});
