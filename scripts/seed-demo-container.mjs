/**
 * Seed the Apple "Container" demo matter (docs/demo-pizza-box-fields.md) into an account,
 * filled through every step up to and including the drawings, ready to record the demo.
 *
 * What it creates for the target account (role/consent are left as-is):
 *   - a Utility project "Container" (client Apple Inc., matter APPL-CONTAINER-2026-001)
 *   - all eleven 1.77 draft sections (with the three planted claim defects intact)
 *   - the invention disclosure (seven fields)
 *   - two inventors + the juristic applicant (Apple Inc., large entity)
 *   - one saved version snapshot
 *   - twelve figures uploaded to the private Storage bucket, tagged by view
 *
 * Drawings: the patent drew most sheets sideways. This rotates every sideways figure
 * upright (90 deg clockwise, baked into the stored PNG, exactly like the in-app rotate
 * control) EXCEPT fig02, which is left sideways on purpose so the rotate control can be
 * demonstrated live. fig04, fig09, fig12 are already upright and are left untouched.
 *
 * Re-runnable: it first removes any existing project with the same matter number for the
 * account (and that project's Storage files), then seeds a fresh one.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-demo-container.mjs [email]
 *   pnpm seed:demo [email]            (defaults to aarav.minocha@gmail.com)
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from --env-file).
 * Service role bypasses RLS, so run it locally only. Rotation uses macOS `sips`.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID as cryptoUUID } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, "..", "e2e", "fixtures");

const email = (process.argv[2] || "aarav.minocha@gmail.com").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const MATTER_NO = "APPL-CONTAINER-2026-001";

// ---------------------------------------------------------------------------
// Draft content (verbatim from docs/demo-pizza-box-fields.md, defects intact).
// ---------------------------------------------------------------------------
const CLAIMS = [
  `1. A molded fiber container suitable for containing a food item, comprising: a base, the base comprising: a plurality of ridges integrated with an interior surface of the base, wherein when the food item is placed on at least some of the plurality of ridges, a gap is formed between the food item and the interior surface of the base, the gap assisting in thermally isolating the food item and allowing moisture expelled from the food item to be transported away from the food item; and a lid, the lid comprising: a plurality of openings arranged in accordance with at least some of the plurality of ridges, and a moisture channeling feature integrally formed in the lid, the moisture channeling feature cooperating with at least some of the plurality of openings and the gap to provide a path by which at least some of the moisture expelled from the food item is transported out of the container and into an external environment.`,
  `2. The molded fiber food container as recited in claim 1, further comprising: a hinge assembly integrally formed with the molded fiber container, the hinge assembly pivotally connecting the base and the lid.`,
  `3. The molded fiber food container as recited in claim 2, wherein in a food server configuration, the lid is rotated about the hinge assembly to an inverted position and about 360° rotation relative to the base such that at least a portion of an exterior surface of the lid is in direct contact with at least a portion of an exterior surface of the base, the lid providing full support for the base and the food item.`,
  `4. The molded fiber food container as recited in claim 3, wherein in the food server configuration, the inverted lid is placed on a supporting surface, the inverted lid supporting the base.`,
  `5. The molded fiber food container as recited in claim 3, wherein in the food server configuration, the food item is fully presented and accessible.`,
  `6. The molded fiber food container as recited in claim 4, wherein in the food server configuration, the food container is a reduced footprint food serving apparatus.`,
  `7. The molded fiber container as recited in claim 1, wherein at least some of the plurality of ridges are concentric and circular`,
  `8. A container, comprising: a base portion, the base portion comprising: a bottom surface, the bottom surface including concentric ridges, the concentric ridges providing structural support and elevating an item placed on at least some of the ridges, and a sidewall integrally formed with the bottom surface, the sidewall including an integrated sidewall feature, the integrated sidewall feature arranged to provide structural support for the container; a lid portion comprising a top surface, the top surface comprising: a first integrated top feature co-operating with the integrated bottom feature and the integrated side feature to provide structural support for the container, and a second integrated top feature that includes a plurality of apertures that allow for the outflow of air from within the container; a hinge assembly integrally formed with a first section of the sidewall for pivotally connecting the base portion and the lid portion, the hinge assembly comprising: a first hinge portion integrally formed with the base portion, a second hinge portion integrally formed with the lid portion, and a flexure between the first and second hinge portions, the flexure allowing for the pivoting of the second hinge portion about the first hinge portion; and a locking mechanism comprising: a first portion integrally formed with a second section of the sidewall different from the first section, and a second portion integrally formed with a section of the lid portion, wherein the first and second portions of the locking mechanism are co-operatively shaped so that they interlock, wherein in a locking configuration the locking mechanism secures the lid and the base portion.`,
  `9. The container as recited in claim 8, wherein the container is used to contain a food item and the lid portion is held closed by a means for latching.`,
  `10. The container as recited in claim 8, wherein the container is fabricated from a molded fiber.`,
  `11. The container as recited in claim 8, wherein the container is fabricated from environmentally friendly materials including bamboo, Begrass, rice hull, and PLA.`,
  `12. The container as recited in claim 8, wherein in a second open configuration, the second hinge portion is pivoted with respect to the first hinge portion, such that a portion of the exterior surface of the lid makes contact with a portion of the exterior surface of the base.`,
  `13. The container as recited in claim 8, wherein in a first open configuration, the second hinge portion is pivoted with respect to the first hinge portion, such that the angle between the first and second hinge portions is substantially 180°.`,
  `14. The container as recited in claim 8, wherein in a closed configuration, the second hinge portion is pivoted with respect to the first hinge portion, such that the lid portion makes contact with the sidewalls of the base portion.`,
  `15. The container as recited in claim 12, wherein the container is used in the second open configuration to display a contained item in a manner with a reduced footprint.`,
  `16. The container as recited in claim 30, further including at least a second container, wherein at least the first and second containers are stacked together in a nested configuration.`,
  `17. A method of forming a molded fiber container suitable for containing a food item, comprising: providing a fiber slurry; providing a mold having a shape in the form of the container; conformally applying the fiber slurry to the mold, wherein the conformally applied fiber slurry takes on essentially the shape of the container; curing the fiber slurry; and obtaining the molded fiber container by separating the mold and the cured fiber slurry, wherein the molded fiber container comprises: a base portion having a bottom surface with concentric ridges that provide structural support and elevate an item placed on at least some of the ridges, and a sidewall integrally formed with the bottom surface and including an integrated sidewall feature; and a lid comprising a plurality of openings arranged in accordance with at least some of the ridges and a moisture channeling feature integrally formed in the lid, the moisture channeling feature cooperating with at least some of the openings and the gap to provide a path by which moisture expelled from the food item is transported out of the container.`,
  `18. The method as recited in claim 17, wherein the molded fiber container further comprises a hinge assembly integrally formed with the molded fiber container, the hinge assembly pivotally connecting the base and the lid.`,
  `19. The method as recited in claim 18, wherein in a food server configuration, the lid is rotated about the hinge assembly to an inverted position and about 360° rotation relative to the base such that at least a portion of an exterior surface of the lid is in direct contact with at least a portion of an exterior surface of the base, the lid providing full support for the base and the food item.`,
  `20. The method as recited in claim 19, wherein in the food server configuration, the inverted lid is placed on a supporting surface, the inverted lid supporting the base.`,
  `21. The method as recited in claim 20, wherein in the food server configuration, the food item is fully presented and accessible.`,
  `22. The method as recited in claim 21, wherein in the food server configuration, the food container is a reduced footprint food serving apparatus.`,
  `23. The method as recited in claims 17 and 18, wherein at least some of the plurality of ridges are concentric and circular.`,
];

const SECTIONS = {
  title: `Container`,
  cross_reference: `Not applicable.`,
  gov_interest: `Not applicable.`,
  background: `Containers store and transport items in many sizes and shapes.
Traditional containers use plastics for structural support while staying cheap.
Environmental concerns have driven demand for containers made from sustainable materials.
What is needed is a container that adapts to a wide variety of uses while staying structurally stable and environmentally friendly.`,
  summary: `A molded fiber container for a food item has a base with a plurality of ridges integrated with an interior surface.
When a food item rests on the ridges, a gap forms between the food item and the interior surface of the base, which thermally isolates the food and carries moisture away from it.
The container has a lid with a plurality of openings arranged in accordance with the ridges and a moisture channeling feature formed in the lid, which works with the openings and the gap to carry expelled moisture to the outside.
A hinge assembly connects the base and lid and allows pivotal movement, and a locking mechanism with cooperatively shaped first and second portions secures the lid and the base when closed.
The base and lid are shaped so several containers nest in a stack to save storage space.`,
  brief_description_drawings: `FIG. 1 shows a representative container 10 in a first open configuration.
FIG. 2 is a perspective view of the container 10 in the first open configuration.
FIG. 3 is a cross-sectional view of the container 10 in a closed configuration showing airflow.
FIG. 4 is a perspective view of the exterior of the base portion 12.
FIG. 5 is a top view of the exterior of the lid portion 24.
FIG. 6 is a flipped view showing the lid exterior surface 202 and the base exterior surface 204.
FIG. 7 is a profile view of the container 10 in a closed configuration.
FIG. 8 shows a first container 702 and a second container 704 in a nested stack.
FIG. 9 shows the locking mechanism 46 in close-up.
FIG. 10 is a detail of the hinge assembly 38.
FIG. 11 is a perspective view of the container 10 showing indicia 80.
FIG. 12 is a flowchart of a process for forming the molded fiber container.`,
  detailed_description: `FIG. 1 shows a representative container 10 in a first open configuration.
The container 10 holds hot food, in particular pizza, which can be assembled in a kitchen, placed in the container 10, and then placed in an oven.

The container 10 has a base portion 12 with a bottom surface 14.
The bottom surface 14 carries concentric ridges 18 that each rise above the bottom surface 14.
The ridges 18 give the container 10 structural support by spreading an applied load and resisting bending, and they lift the pizza so an air gap forms below it.
That air gap lets excess moisture escape and acts as a thermal barrier that slows heat loss from the pizza.
The base portion 12 also has sidewalls 20 formed with the bottom surface 14, and the sidewalls 20 carry an integrated sidewall feature 22 recessed into them with a shape that resists flexing of the base.

The container 10 has a lid portion 24 sized and shaped to match the base portion 12, and together they form an enclosed space for the pizza when closed.
The lid portion 24 has a top surface 26 with a second top feature 30.
The second top feature 30 has a raised shape that adds support and forms a channel 34, which works with a central platform 36 to create a chimney effect that pulls moisture from the pizza toward the vents 32 for release to the outside.
The ridges 18, the second top feature 30, and the vents 32 work together to hold a sensible moisture level inside the container 10 so the pizza does not turn soggy.

A hinge assembly 38 is formed with both the lid portion 24 and the base portion 12 and has a first hinge portion 40 on the base and a second hinge portion 42 on the lid.
A flexure 44 connects them, where the first and second hinge portions 40 and 42 are stiff molded fiber and the flexure 44 is bendable molded fiber, so the flexure 44 folds when the container closes and unfolds when it opens.
A locking mechanism 46 has a first portion 48 on the base portion 12 and a second portion 50 on the lid portion 24.
The locking mechanism 46 holds the base and lid together when closed with enough force to keep them from separating.
A lip 52 on the second portion 50 is reached by a finger in a recess of the first portion 48, so a simple lift on the lip 52 releases the lock.
As FIG. 9 shows, the lock is a press fit where the second portion 50 has a protrusion 802 and the first portion 48 has a cavity 804 that receives the protrusion 802 to generate the holding force.

In the first open configuration the lid portion 24 and the base portion 12 sit about 180 degrees apart so the pizza is easy to see and reach.
In a second open configuration they rotate about 360 degrees so the lid exterior surface 202 and the base exterior surface 204 touch, and the lid acts as a pedestal.

As FIG. 3 shows, the ridges 18 lift the contained pizza 82 above the bottom surface 14 and create gaps 88 between the pizza 82 and the bottom surface 14.
A bottom airflow 84 carries hot air from under the pizza 82 and forms a convective airflow 86 that rises and becomes a top surface airflow 90 along the top surface 26.
The second top feature 30 raises the outside surface area of the lid and lowers the outside pressure, which drives the chimney effect, so the top surface airflow 90 moves along the top surface 26 and leaves through the vents 32.
The vents 32 sit in an annular pattern around the center of the lid so the most hot air can leave, which keeps the pizza 82 from reabsorbing moisture.

As FIG. 4 and FIG. 5 show, the base exterior surface 204 has concentric recesses 302 that match the concentric ridges 18 and sidewall feature protrusions 304 that match the integrated sidewall feature 22, and these add stability and limit torsional flex of the base.
A flipped view shows the lid exterior surface 202, the base exterior surface 204, a first hinge exterior surface 502, a second hinge exterior surface 504, a base lip 602, and a lid lip 604.

As FIG. 8 shows, the sidewalls 20 are tapered so they are wider at the top than the bottom, so one base portion 12 receives the base portion 12 of a second container 704, and the lid and lock of a second container 704 fit within those of a first container 702 to form a nested stack.
Indicia 80 can appear on the top surface 26 of the lid portion 24.
Molded fiber comes from recycled paper, is sustainable, forms into any shape, and resists moisture, so the container 10 keeps its structural integrity.`,
  claims: CLAIMS.join("\n\n"),
  abstract: `The embodiments herein describe a container constructed in a preformed manner, such that no assembly of the container is required before use.
The container includes a lid portion that is coupled to the base portion through a hinged connection such that the entire container is singularly constructed from a single piece of material.
A nested configuration is achieved such that the base and lid portions are shaped to receive the corresponding base and lid portions of a second container.
Such nested configuration allows for multiple containers to be stored in a nested stack, thereby minimizing storage space.
The container can be fabricated from various types of re-used material along the lines of molded fiber.
The base further includes a plurality of concentric ridges that elevate a food item above the bottom surface so that a gap is formed beneath the food item, and the gap thermally isolates the food item and allows moisture to be carried away from the food item during transport.
The lid further includes a plurality of vents and a channel that cooperate with a central platform to create a chimney effect, whereby moisture rising from the food item is drawn upward and expelled from the container into the surrounding environment so that the food item, such as a pizza, stays crisp and does not become soggy while it is stored or carried from one place to another.`,
  drawings_meta: `Twelve figures on the drawing sheets.
FIG. 1 through FIG. 12 as described in the brief description of the drawings.`,
  office_action: `Not applicable.`,
};

const DISCLOSURE = {
  field_industry: `Containers, and more specifically a portable, nestable, environmentally friendly food container, such as one for transporting hot pizza.`,
  problem_solved: `A flat bottomed box traps steam between the pizza and the bottom, so the crust reabsorbs the moisture and turns soggy.
A square box also wastes material and space around a round pizza, and a multi piece box adds cost and assembly.`,
  how_it_works: `The container is molded as a single piece of fiber with the lid joined to the base by an integral hinge, so no assembly is needed.
Concentric ridges on the inside of the base lift the pizza and form a gap beneath it, which keeps the food off the floor and lets moisture move away.
A second top feature forms a channel that works with a central platform to create a chimney effect, drawing moisture up and out through vents in the lid.
A press fit lock holds the container closed, and the base and lid are tapered so several containers nest for storage.`,
  components: `A base portion with a bottom surface and concentric ridges, sidewalls with an integrated sidewall feature, a lid portion with a top surface and a channel and a central platform and vents, a hinge assembly with a flexure, a locking mechanism with a lip and a recess, and a tamper evident band around the rim.`,
  advantages: `It keeps the crust crisp by moving moisture away from the food through the gap, the channel, the chimney effect, and the vents.
The single piece molded build is cheap and needs no assembly.
Molded fiber is recycled, sustainable, easy to form, and resistant to moisture, so the container holds its shape.
The round, low profile shape nests and ships compactly.`,
  alternatives: `The container can be molded fiber, bamboo, Begrass, rice hull, or PLA.
The ridges can be concentric and circular or another pattern.
The lid can rotate roughly 360 degrees into a food server position where the inverted lid supports the base as a pedestal.`,
  known_prior_art: `Square corrugated pizza boxes, boxes with a top vent or a central plastic tripod (a pizza saver), and multi piece molded fiber clamshells.`,
};

const INVENTORS = [
  {
    legal_name: "Francesco Longoni",
    residence: "Cupertino, California, USA",
    mailing_address: "c/o Apple Inc., 1 Infinite Loop, Cupertino, CA 95014, USA",
    citizenship: "Italy",
  },
  {
    legal_name: "Mark E. Doutt",
    residence: "Cupertino, California, USA",
    mailing_address: "c/o Apple Inc., 1 Infinite Loop, Cupertino, CA 95014, USA",
    citizenship: "United States",
  },
];

// Figure -> standard drawing view (docs/demo-pizza-box-fields.md step 5; fig08-12 are
// reasonable defaults the doc leaves open; the flowchart fig12 has no standard view).
const FIG_VIEW = {
  1: "perspective", 2: "perspective", 3: "section", 4: "bottom",
  5: "top", 6: "perspective", 7: "front", 8: "perspective",
  9: "perspective", 10: "perspective", 11: "perspective", 12: "",
};

// Sideways sheets that get rotated 90 deg clockwise to upright. fig02 is deliberately
// left sideways for the live rotate demo; fig04/09/12 are already upright.
const ROTATE_CW = new Set([1, 3, 5, 6, 7, 8, 10, 11]);
const LEAVE_SIDEWAYS = 2;

const fig2 = (n) => String(n).padStart(2, "0");
const wordCount = (t) => { const s = (t || "").trim(); return s ? s.split(/\s+/).length : 0; };

async function main() {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const user = list.users.find((u) => (u.email || "").toLowerCase() === email);
  if (!user) {
    console.error(`No account for ${email}. It must sign in once (Google) before seeding.`);
    process.exit(1);
  }
  console.log(`Account: ${email}  id=${user.id}`);

  // Re-runnable: drop any prior copy of this demo matter (and its Storage files) first.
  const { data: prior } = await admin
    .from("projects").select("id").eq("user_id", user.id).eq("matter_no", MATTER_NO);
  for (const p of prior ?? []) {
    const { data: atts } = await admin
      .from("project_attachments").select("storage_path").eq("project_id", p.id);
    const paths = (atts ?? []).map((a) => a.storage_path).filter(Boolean);
    if (paths.length) await admin.storage.from("project-files").remove(paths);
  }
  if ((prior ?? []).length) {
    await admin.from("projects").delete().eq("user_id", user.id).eq("matter_no", MATTER_NO);
    console.log(`Removed ${prior.length} prior "${MATTER_NO}" matter(s).`);
  }

  // 1. Project (Application details).
  const { data: proj, error: projErr } = await admin
    .from("projects")
    .insert({
      user_id: user.id,
      name: "Container",
      patent_type: "utility",
      client_name: "Apple Inc.",
      matter_no: MATTER_NO,
      applicant_name: "Apple Inc.",
      applicant_is_inventor: false,
      applicant_is_juristic: true,
      entity_status: "large",
    })
    .select("id")
    .single();
  if (projErr || !proj) throw new Error(`create project: ${projErr?.message}`);
  const projectId = proj.id;
  console.log(`Project created: ${projectId}`);
  await admin.from("audit_log").insert({
    user_id: user.id, action: "project_created", project_id: projectId,
    detail: { name: "Container", patent_type: "utility", client_name: "Apple Inc.", matter_no: MATTER_NO },
  });
  await admin.from("audit_log").insert({
    user_id: user.id, action: "applicant_saved", project_id: projectId,
    detail: { entity_status: "large", juristic: true },
  });

  // 2. Draft sections.
  const now = new Date().toISOString();
  const sectionRows = Object.entries(SECTIONS).map(([section_key, content]) => ({
    project_id: projectId, section_key, content, word_count: wordCount(content), updated_at: now,
  }));
  {
    const { error } = await admin
      .from("project_sections").upsert(sectionRows, { onConflict: "project_id,section_key" });
    if (error) throw new Error(`sections: ${error.message}`);
  }
  console.log(`Sections saved: ${sectionRows.length}`);

  // 3. Disclosure.
  {
    const { error } = await admin
      .from("project_disclosure")
      .upsert({ project_id: projectId, ...DISCLOSURE, updated_at: now }, { onConflict: "project_id" });
    if (error) throw new Error(`disclosure: ${error.message}`);
    await admin.from("audit_log").insert({ user_id: user.id, action: "disclosure_saved", project_id: projectId });
  }
  console.log("Disclosure saved.");

  // 4. Inventors.
  {
    const rows = INVENTORS.map((i, idx) => ({ ...i, project_id: projectId, ord: idx }));
    const { error } = await admin.from("project_inventors").insert(rows);
    if (error) throw new Error(`inventors: ${error.message}`);
    await admin.from("audit_log").insert({
      user_id: user.id, action: "inventors_saved", project_id: projectId, detail: { count: rows.length },
    });
  }
  console.log(`Inventors saved: ${INVENTORS.length}`);

  // 5. Save one immutable version snapshot (mirrors saveVersion/buildSnapshot).
  {
    const snapshot = {
      project: {
        name: "Container", patent_type: "utility", declared_status: "drafting",
        application_number: null, filing_date: null,
      },
      sections: Object.fromEntries(Object.entries(SECTIONS)),
    };
    const { data: ver, error } = await admin
      .from("project_versions")
      .insert({ project_id: projectId, user_id: user.id, label: "Full draft", snapshot, parent_version_id: null })
      .select("id").single();
    if (error || !ver) throw new Error(`version: ${error?.message}`);
    await admin.from("audit_log").insert({
      user_id: user.id, action: "version_saved", project_id: projectId, version_id: ver.id, detail: { label: "Full draft" },
    });
    console.log(`Version saved: ${ver.id}`);
  }

  // 6. Figures: rotate sideways sheets upright (except fig02), upload, record. Insert in
  // order so fig01 carries the latest created_at and sorts first (getAttachments is desc).
  const work = mkdtempSync(join(tmpdir(), "pincite-figs-"));
  const base = Date.now();
  let uploaded = 0;
  try {
    for (let n = 1; n <= 12; n++) {
      const name = `apple-container-fig${fig2(n)}.png`;
      const src = join(FIXTURES, name);
      let bytesPath = src;
      let rotated = false;
      if (ROTATE_CW.has(n) && n !== LEAVE_SIDEWAYS) {
        const tmp = join(work, name);
        copyFileSync(src, tmp);
        execFileSync("sips", ["-r", "90", tmp], { stdio: "ignore" });
        bytesPath = tmp;
        rotated = true;
      }
      const bytes = readFileSync(bytesPath);
      const storagePath = `${projectId}/${cryptoUUID()}-${name}`;
      const { error: upErr } = await admin.storage
        .from("project-files").upload(storagePath, bytes, { contentType: "image/png", upsert: false });
      if (upErr) throw new Error(`upload ${name}: ${upErr.message}`);

      const createdAt = new Date(base - n * 1000).toISOString();
      const { error: insErr } = await admin.from("project_attachments").insert({
        project_id: projectId,
        kind: "drawing",
        view: FIG_VIEW[n] || null,
        storage_path: storagePath,
        filename: name,
        mime: "image/png",
        size_bytes: bytes.length,
        created_at: createdAt,
      });
      if (insErr) throw new Error(`attachment ${name}: ${insErr.message}`);
      await admin.from("audit_log").insert({
        user_id: user.id, action: "attachment_uploaded", project_id: projectId,
        detail: { kind: "drawing", view: FIG_VIEW[n] || null, filename: name, mime: "image/png" },
      });
      uploaded++;
      const tag = n === LEAVE_SIDEWAYS ? "left SIDEWAYS (demo)" : rotated ? "rotated 90 cw" : "upright as-is";
      console.log(`  fig${fig2(n)}  view=${FIG_VIEW[n] || "(none)"}  ${tag}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  console.log(`Figures uploaded: ${uploaded}/12 (fig${fig2(LEAVE_SIDEWAYS)} left sideways for the live rotate demo).`);
  console.log("DONE.");
}

main().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
