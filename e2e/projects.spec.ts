import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter, saveDraft } from "./helpers";
import { loginAsTestUser } from "./auth";

test("phase-1: create project, intake save, versioning, restore — all audited", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);

  // Consent (the test user is reset to unconsented each run).
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  // Create a project via the dialog (patent type defaults to Utility).
  const projectId = await createMatter(page, "Synthetic widget mount");

  // Intake: nothing is saved until the user opens All sections and clicks Save. This writes
  // the title and appends the first immutable version.
  await saveDraft(page, { title: "Adjustable mount for a widget" });
  await screenshot(page, "phase-1-intake");

  // Edit, then save again - a second version (proves saves append, not overwrite).
  await saveDraft(page, { title: "Adjustable mount for a widget, revised" });
  await screenshot(page, "phase-1-save");

  // Version history shows both saves (unlabeled snapshots read as "Untitled save").
  await page.goto(`/projects/${projectId}/versions`);
  await expect(page.getByText("Untitled save")).toHaveCount(2);
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
