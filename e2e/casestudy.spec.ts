import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { captureErrors, screenshot, assertClean, createMatter } from "./helpers";
import { loginAsTestUser } from "./auth";

// Generates README screenshots from a real, already-filed example: Apple's molded fiber
// food container, US 2012/0024859 A1 (inventors Francesco Longoni and Mark E. Doutt,
// assigned to Apple Inc.). The draft below is in progress on purpose so the error checks
// have real findings to show. All public information, no confidential text.
const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const CLAIMS =
  "1. A molded fiber container suitable for containing a food item, comprising: a base, the base comprising a plurality of ridges integrated with an interior surface of the base, wherein when the food item is placed on at least some of the plurality of ridges, a gap is formed between the food item and the interior surface of the base, the gap assisting in thermally isolating the food item and allowing moisture expelled from the food item to be transported away from the food item; and a lid, the lid comprising a plurality of openings arranged in accordance with at least some of the plurality of ridges, and a moisture channeling feature integrally formed in the lid, the moisture channeling feature cooperating with at least some of the plurality of openings and the gap to provide a path by which at least some of the moisture is transported out of the container.\n" +
  "2. The container of claim 1, wherein the base and the lid are integrally formed from a single piece of molded fiber connected by a hinge.\n" +
  "3. The container of claim 1, wherein the plurality of ridges are arranged substantially concentrically about a center of the base.\n" +
  "4. The container of claim 6, wherein the plurality of openings comprise a plurality of slots.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid are shaped to nest with a second container.";

test("case study: Apple molded fiber food container screenshots", async ({ page }) => {
  const errs = captureErrors(page);
  await loginAsTestUser(page);
  await page.goto("/consent");
  await page.getByRole("button", { name: /i understand, continue/i }).click();
  await page.waitForURL("**/dashboard");

  const id = await createMatter(page, "Apple molded fiber food container");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Applicant is Apple (a company), so the ownership checks apply.
  await admin
    .from("projects")
    .update({
      applicant_is_inventor: false,
      applicant_is_juristic: true,
      applicant_name: "Apple Inc.",
      entity_status: "large",
    })
    .eq("id", id);
  await admin.from("project_inventors").insert([
    {
      project_id: id,
      legal_name: "Francesco Longoni",
      residence: "Cupertino, CA",
      mailing_address: "1 Apple Park Way, Cupertino, CA 95014",
      citizenship: "",
      ord: 0,
    },
    {
      project_id: id,
      legal_name: "Mark E. Doutt",
      residence: "Cupertino, CA",
      mailing_address: "1 Apple Park Way, Cupertino, CA 95014",
      citizenship: "",
      ord: 1,
    },
  ]);

  const sections: Record<string, string> = {
    title: "Container",
    background:
      "Food is often delivered in closed containers that trap steam and make the food soggy. These containers also take up storage space when they are empty.",
    summary:
      "A single piece molded fiber container has a ridged base and a vented lid that carry steam away from the food, and the containers nest to save space.",
    detailed_description:
      "The container is formed from a single piece of molded fiber. The base has a plurality of ridges on its interior surface. When food is placed on the ridges a gap forms between the food and the base. The lid has a plurality of openings and a moisture channeling feature. The openings and the channel carry moisture out of the container through the gap. The base and the lid are joined by a hinge. The sidewalls taper so that one container nests inside another.",
    abstract:
      "A container is constructed in a preformed manner so no assembly is required. A lid is coupled to the base through a hinge so the container is made from a single piece of material. The base and lid nest with a second container to save storage space. The container can be made from molded fiber. Ridges in the base lift the food and a vented lid carries moisture away to keep the food from getting soggy.",
    claims: CLAIMS,
  };
  // Upsert (idempotent) so seeding works whether or not the matter already has section rows.
  await admin.from("project_sections").upsert(
    Object.entries(sections).map(([section_key, content]) => ({
      project_id: id,
      section_key,
      content,
      word_count: wc(content),
    })),
    { onConflict: "project_id,section_key" },
  );
  await admin.from("project_disclosure").upsert(
    {
      project_id: id,
      field_industry: "Food packaging and containers.",
      problem_solved:
        "Hot food in a closed container traps steam and gets soggy. Empty boxes also waste storage space.",
      how_it_works:
        "A single piece of molded fiber forms a ridged base and a hinged lid. The ridges lift the food and create a gap. Openings and a moisture channeling feature in the lid carry the steam out.",
      components:
        "molded fiber base\nintegrated ridges\nhinged lid\nlid openings\nmoisture channeling feature\ncarrying handle",
      advantages:
        "Less soggy food. Nesting saves storage space. Made from recycled molded fiber.",
      alternatives:
        "The ridges can be concentric or radial. The openings can be holes or slots.",
      known_prior_art:
        "Square corrugated pizza boxes. Vented plastic clamshell containers.",
    },
    { onConflict: "project_id" },
  );

  // Dashboard.
  await page.goto("/dashboard");
  await expect(page.getByText("Apple molded fiber food container")).toBeVisible();
  await screenshot(page, "case-dashboard");

  // Invention intake with the cross-reference flag (stacking tab not described). The
  // consistency check lives in the "All fields" view.
  await page.goto(`/projects/${id}/disclosure`);
  await page.getByRole("button", { name: "All fields", exact: true }).click();
  await expect(
    page.getByText(/Component "carrying handle" .* is not claimed or described/i).first(),
  ).toBeVisible();
  await screenshot(page, "case-disclosure");

  // Error checking, grouped by area.
  await page.goto(`/projects/${id}/review`);
  await page.getByTestId("run-check").click();
  await expect(
    page.getByText(/refers to claim 6, which does not exist/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/must be in the alternative/i).first()).toBeVisible();
  await screenshot(page, "case-review");

  // Click the finding to land on the reasoning and its pinned rule in the evidence pane.
  await page
    .getByRole("button", { name: /refers to claim 6, which does not exist/i })
    .click();
  await expect(page.getByTestId("rule-pane")).toContainText(/608\.01/);
  await screenshot(page, "case-evidence");

  // Similar patents: pinpoint overlaps against a real molded-fiber container patent, then
  // expand it to load the actual patent (its abstract and its own drawing).
  await page.goto(`/projects/${id}/prior-art`);
  // The compare form is hidden until "Compare a patent" is clicked.
  await page.getByRole("button", { name: "Compare a patent", exact: true }).click();
  await page.getByTestId("cmp-number").fill("US20060213916A1");
  await page
    .getByTestId("cmp-text")
    .fill(
      "A container lid formed of molded cellulose fiber for mating with a base container to hold food items. The lid includes a body with a main portion and a perimeter, and a skirt extending substantially around the perimeter to engage the base.",
    );
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByText("US20060213916A1").first()).toBeVisible();
  await expect(page.getByTestId("overlap-detail")).toBeVisible();
  await page.getByRole("button", { name: "View the actual patent" }).click();
  await page
    .getByText(/Molded fiber lid/i)
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => {});
  await page.getByTestId("toggle-claims").click();
  await screenshot(page, "case-prior-art");

  // Inventors and the ADS, with Apple Inc. as the juristic applicant.
  await page.goto(`/projects/${id}/inventors`);
  await expect(page.getByTestId("inventor-name-0")).toHaveValue("Francesco Longoni");
  await screenshot(page, "case-inventors");

  // Rules that apply now and conditionally.
  await page.goto(`/projects/${id}/rules`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await screenshot(page, "case-rules");

  // Stage detection and what to do now.
  await page.goto(`/projects/${id}/stage`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await screenshot(page, "case-stage");

  // The inventor's declaration to sign.
  await page.goto(`/projects/${id}/sign`);
  await expect(page.getByText(/original inventor/i).first()).toBeVisible();
  await screenshot(page, "case-sign");

  // The filing-ready report and export.
  await page.goto(`/projects/${id}/report`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await screenshot(page, "case-report");

  // The audit trail.
  await page.goto(`/projects/${id}/audit`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await screenshot(page, "case-audit");

  assertClean(errs);
});
