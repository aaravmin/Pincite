import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// File-output preview: on the Submission step each export previews in a half-screen pane that
// shows the application typeset as a real PDF (what the LaTeX looks like compiled), not code.
// Sections are seeded directly so the check does not depend on the draft-entry UI.
test("export preview: half-screen rendered-PDF preview of the patent", async ({
  page,
}) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.goto("/dashboard");
  const id = await createMatter(page, "Preview demo");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const sections: Record<string, string> = {
    title: "A molded fiber container",
    background:
      "Food is often delivered in closed containers that trap steam and make the food soggy. These containers also waste storage space when empty.",
    summary:
      "A single piece molded fiber container has a ridged base and a vented lid that carry steam away from the food, and the containers nest to save space.",
    detailed_description:
      "The container is formed from a single piece of molded fiber. The base has a plurality of ridges on its interior surface. When food is placed on the ridges a gap forms between the food and the base. The lid has a plurality of openings and a moisture channeling feature that carry moisture out of the container through the gap.",
    claims:
      "1. A container comprising a base and a lid coupled by a hinge.\n2. The container of claim 1, wherein the base has a plurality of ridges.\n3. The container of claim 1, wherein the lid has a plurality of vent openings.",
    abstract:
      "A container is constructed in a preformed manner so no assembly is required. A lid couples to the base through a hinge so the container is made from a single piece of material. Ridges elevate the food and a vented lid carries moisture away.",
  };
  await admin.from("project_sections").upsert(
    Object.entries(sections).map(([section_key, content]) => ({
      project_id: id,
      section_key,
      content,
      word_count: content.split(/\s+/).length,
    })),
    { onConflict: "project_id,section_key" },
  );

  await page.goto(`/projects/${id}/report`);

  // The PDF export is a real, typeset PDF document.
  const pdf = await page.request.get(`/api/projects/${id}/export?format=pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");

  // Preview opens a half-screen pane with an iframe pointed at the rendered PDF (not text/code).
  await page.getByTestId("preview-pdf").click();
  const pane = page.getByTestId("export-preview-pane");
  await expect(pane).toBeVisible();
  const frame = page.getByTestId("export-preview-frame");
  await expect(frame).toHaveAttribute("src", /format=pdf&preview=1/);
  await expect(page.getByTestId("preview-download")).toBeVisible();
  // No code, no files-list clutter.
  await expect(pane.getByText("Files in this download")).toHaveCount(0);

  // The preview endpoint streams an inline PDF.
  const prev = await page.request.get(
    `/api/projects/${id}/export?format=pdf&preview=1`,
  );
  expect(prev.status()).toBe(200);
  expect(prev.headers()["content-type"]).toContain("application/pdf");
  await screenshot(page, "export-preview-pdf");

  // Switching to the LaTeX export keeps the pane and re-points the same rendered preview.
  await page.getByTestId("preview-latex").click();
  await expect(frame).toHaveAttribute("src", /format=latex&preview=1/);

  // Close hides the pane.
  await page.getByTestId("preview-close").click();
  await expect(pane).toHaveCount(0);

  assertClean(errs);
});
