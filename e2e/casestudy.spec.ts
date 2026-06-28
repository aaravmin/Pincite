import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean } from "./helpers";
import { loginAsTestUser } from "./auth";

// Generates the README case study screenshots using a public, non-confidential example
// (Apple's circular pizza box, design patent USD670491). Content here is synthetic.
const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

test("case study: Apple circular pizza box screenshots", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel("Name").fill("Circular pizza box");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL("**/projects/**");
  const id = page.url().split("/projects/")[1].split(/[/?#]/)[0];

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const sections: Record<string, string> = {
    title: "Circular container for a pizza",
    background:
      "Pizza is usually delivered in square corrugated boxes. Those boxes trap steam and waste material around a round pizza.",
    summary:
      "A circular container with a vented lid and a central support post reduces sogginess and material use.",
    detailed_description:
      "The circular container has a round base sized to hold a pizza. A vented lid is coupled to the round base. The vented lid has a plurality of raised vents that let steam escape. A central support post extends upward from the round base and holds the vented lid above the food.",
    abstract:
      "A circular food container has a round base and a vented lid. Raised vents in the lid release steam. A central support post holds the lid above the food to reduce sogginess.",
    claims:
      "1. A circular container for food comprising a round base and a vented lid coupled to the round base.\n" +
      "2. The container of claim 1, wherein the vented lid comprises a plurality of raised vents.\n" +
      "3. The container of claim 5, wherein a central support post extends from the round base and holds the vented lid above the food.\n" +
      "4. The container of claims 1 and 2, wherein the round base is corrugated.",
  };
  await admin.from("project_sections").insert(
    Object.entries(sections).map(([section_key, content]) => ({
      project_id: id,
      section_key,
      content,
      word_count: wc(content),
    })),
  );
  await admin.from("project_disclosure").upsert(
    {
      project_id: id,
      field_industry: "Food packaging and containers.",
      problem_solved:
        "Square pizza boxes trap steam and make the pizza soggy. They also waste material around a round pizza.",
      how_it_works:
        "A round container holds the pizza. The lid has raised vents that let steam escape. A central support post keeps the lid off the food.",
      components: "round base\nvented lid\ncentral support post\nside latch",
      advantages: "Less soggy pizza. Less wasted material. The containers stack.",
      alternatives:
        "The vents can be slots or holes. The support can be one post or several ribs.",
      known_prior_art:
        "Square corrugated pizza boxes. The plastic pizza saver tripod.",
    },
    { onConflict: "project_id" },
  );

  // Dashboard with the example project.
  await page.goto("/dashboard");
  await expect(page.getByText("Circular pizza box")).toBeVisible();
  await screenshot(page, "case-dashboard");

  // Invention intake with the cross-reference flag (side latch not described).
  await page.goto(`/projects/${id}/disclosure`);
  await expect(
    page.getByText(/Component "side latch" .* is not claimed or described/i).first(),
  ).toBeVisible();
  await screenshot(page, "case-disclosure");

  // Error checking, grouped by area.
  await page.goto(`/projects/${id}/review`);
  await page.getByTestId("run-check").click();
  await expect(
    page.getByText(/refers to claim 5, which does not exist/i).first(),
  ).toBeVisible();
  await screenshot(page, "case-review");

  // MPEP evidence pane.
  await page.goto("/ask");
  await page
    .getByTestId("ask-input")
    .fill("2111.03 transitional phrases comprising consisting");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByTestId("evidence")).toContainText("Transitional Phrases");
  await screenshot(page, "case-evidence");

  // Similar patents, pinpoint overlaps against a public example.
  await page.goto(`/projects/${id}/prior-art`);
  await page.getByTestId("cmp-number").fill("USD670491");
  await page
    .getByTestId("cmp-text")
    .fill(
      "A round container for a pizza comprising a base and a vented cover. The vented cover has openings that release steam. A central support holds the cover above the food.",
    );
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByText("USD670491").first()).toBeVisible();
  await expect(page.getByTestId("overlap-detail")).toBeVisible();
  await screenshot(page, "case-prior-art");

  assertClean(errs);
});
