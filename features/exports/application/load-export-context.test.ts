import { describe, expect, it } from "vitest";
import { loadExportContext } from "@/features/exports/application/load-export-context";
import type { ProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { SECTION_KEYS, type SectionKey } from "@/lib/projects/sections";
import type { Project } from "@/lib/projects/types";
import type { Attachment, Inventor } from "@/lib/filing/types";
import { emptyDisclosure } from "@/lib/disclosure/types";

const project: Project = {
  id: "p1",
  user_id: "u1",
  name: "Matter",
  patent_type: "utility",
  declared_status: "drafting",
  application_number: null,
  filing_date: null,
  applicant_name: "Analytical Engines: Ltd",
  applicant_is_inventor: false,
  applicant_is_juristic: true,
  entity_status: "large",
  client_name: null,
  matter_no: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const inventor: Inventor = {
  id: "i1",
  project_id: "p1",
  legal_name: "Ada Byron-Lovelace",
  residence: "London: England",
  mailing_address: "1 Analytical Way; London",
  citizenship: "GB",
  ord: 0,
  created_at: "2026-01-01T00:00:00Z",
};

const attachment: Attachment = {
  id: "a1",
  project_id: "p1",
  kind: "drawing",
  view: "front",
  // Storage paths must survive verbatim, punctuation and all.
  storage_path: "p1/fig-01:v2.png",
  filename: "fig-01.png",
  mime: "image/png",
  size_bytes: 10,
  created_at: "2026-01-01T00:00:00Z",
  analysis: null,
  annotations: null,
  page_index: null,
};

const emptySections = Object.fromEntries(
  SECTION_KEYS.map((k) => [k, ""]),
) as Record<SectionKey, string>;

const snapshot: ProjectSnapshot = {
  project,
  sections: {
    ...emptySections,
    title: "Widget: a self-locking mount",
    background: "Existing mounts sag; they also rattle.",
  },
  inventors: [inventor],
  attachments: [attachment],
  disclosure: emptyDisclosure(),
  exports: [],
};

const load = (s: ProjectSnapshot | null) =>
  loadExportContext("p1", { loadSnapshot: async () => s });

describe("loadExportContext", () => {
  it("answers null when the matter is not visible to the viewer", async () => {
    expect(await load(null)).toBeNull();
  });

  it("sanitizes every section before a formatter can see it", async () => {
    const ctx = (await load(snapshot))!;
    expect(ctx.sections.title).toBe("Widget a self locking mount");
    expect(ctx.sections.background).toBe("Existing mounts sag they also rattle.");
  });

  it("exposes the sanitized title separately, empty when unset", async () => {
    expect((await load(snapshot))!.title).toBe("Widget a self locking mount");
    const bare = { ...snapshot, sections: emptySections };
    expect((await load(bare))!.title).toBe("");
  });

  it("sanitizes each inventor field the ADS and the declaration print", async () => {
    const [inv] = (await load(snapshot))!.inventors;
    expect(inv.legal_name).toBe("Ada Byron Lovelace");
    expect(inv.residence).toBe("London England");
    expect(inv.mailing_address).toBe("1 Analytical Way London");
    expect(inv.citizenship).toBe("GB");
    // The identifying columns are untouched.
    expect(inv.id).toBe("i1");
    expect(inv.ord).toBe(0);
  });

  it("leaves the project row and the attachment rows verbatim", async () => {
    const ctx = (await load(snapshot))!;
    // Sanitizing a storage path would make the file unreadable.
    expect(ctx.attachments[0].storage_path).toBe("p1/fig-01:v2.png");
    expect(ctx.project.applicant_name).toBe("Analytical Engines: Ltd");
  });

  it("keeps every section key present, so a formatter never sees undefined", async () => {
    const ctx = (await load(snapshot))!;
    for (const key of SECTION_KEYS) expect(typeof ctx.sections[key]).toBe("string");
  });
});
