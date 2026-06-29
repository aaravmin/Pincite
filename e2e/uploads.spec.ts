import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("phase-v3: inventors/ADS intake + secure drawing upload", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Synthetic gizmo");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const projectId = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  // Inventors & applicant (ADS).
  await page.goto(`/projects/${projectId}/inventors`);
  await page.getByTestId("inventor-name-0").fill("Dana Synthetic");
  await page.getByLabel("Residence (city, state/country)").fill("Austin, TX");
  await page
    .getByLabel("Mailing address")
    .fill("1 Test St, Austin, TX 78701");
  await page.getByTestId("save-filing").click();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(page.getByText("Inventors named")).toBeVisible();
  await screenshot(page, "v3-inventors");

  // Drawings upload, tagged with its orientation/view.
  await page.goto(`/projects/${projectId}/uploads`);
  await page.getByLabel("Drawing orientation").click();
  await page.getByRole("option", { name: "Perspective" }).click();
  await page
    .getByTestId("upload-input")
    .setInputFiles({ name: "fig1.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("fig1.png")).toBeVisible();
  await expect(page.getByText("Drawing", { exact: true })).toBeVisible();
  await expect(page.getByText("Perspective").first()).toBeVisible();
  // A drawing offers vision describe-and-check (the vision call itself is smoke-tested).
  await expect(page.getByTestId("describe-drawing")).toBeVisible();
  await screenshot(page, "v3-uploads");

  assertClean(errs);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: inv } = await admin
    .from("project_inventors")
    .select("legal_name")
    .eq("project_id", projectId);
  expect((inv ?? []).length).toBe(1);

  const { data: att } = await admin
    .from("project_attachments")
    .select("kind, view, storage_path")
    .eq("project_id", projectId);
  expect((att ?? []).length).toBe(1);
  expect(att![0].storage_path.startsWith(`${projectId}/`)).toBe(true);
  expect(att![0].view).toBe("perspective");

  // Bucket is private: an unauthenticated anon client cannot read the object.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: dlErr } = await anon.storage
    .from("project-files")
    .download(att![0].storage_path);
  expect(dlErr, "anon cannot read a private attachment").toBeTruthy();

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list.users.find((u) => u.email === process.env.TEST_USER_EMAIL);
  const { data: audit } = await admin
    .from("audit_log")
    .select("action")
    .eq("user_id", user!.id);
  const actions = (audit ?? []).map((r) => r.action);
  expect(actions).toContain("inventors_saved");
  expect(actions).toContain("attachment_uploaded");
});
