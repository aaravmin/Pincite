/**
 * The drift guard for the demo fixture: the generated rows must equal what the app's own
 * pure code computes over the case study text, and every MPEP pin the demo can show must
 * resolve inside the fixture corpus. When this fails, rerun `pnpm demo:fixture`.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toDisclosure } from "@/features/disclosure/domain/types";
import { applyResolvedPins, collectPins } from "@/features/mpep/domain/citations";
import { extractLimitations } from "@/features/prior-art/domain/extract";
import { matchCandidate } from "@/features/prior-art/domain/match";
import { lifecycleActions } from "@/features/projects/domain/lifecycle";
import {
  PATENT_TYPES,
  PROJECT_STATUSES,
  SECTION_KEYS,
  wordCount,
  type SectionKey,
} from "@/features/projects/domain/sections";
import { runCrossRefChecks } from "@/features/review/domain/cross-reference";
import { runFilingChecks } from "@/features/review/domain/filing-checks";
import { runDeterministicValidators } from "@/features/review/domain/run-validators";
import { surfaceRules } from "@/features/rules/domain/surface";
import {
  CASE_STUDY_CLAIMS,
  CASE_STUDY_COMPARISON,
  CASE_STUDY_PROJECT_NAME,
  CASE_STUDY_SECTIONS,
} from "@/shared/demo/fixture/case-study";
import {
  DEMO_ATTACHMENT_ID,
  DEMO_FIGURE_STORAGE_PATH,
  DEMO_MATCH_ID,
  DEMO_PROJECT_ID,
  DEMO_USER_ID,
  DEMO_VERSION_ID,
} from "@/shared/demo/fixture/ids";
import { loadFixture } from "@/shared/demo/fixture/index";

const fixture = loadFixture();
const corpus = new Set((fixture.mpep_sections ?? []).map((s) => s.section_number));
const project = (fixture.projects ?? [])[0];
const inventors = fixture.project_inventors ?? [];
const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, ""])) as Record<
  SectionKey,
  string
>;
for (const row of fixture.project_sections ?? []) sections[row.section_key] = row.content;

/** The pins of `items` that are missing from the fixture corpus. */
function unresolved(items: { mpep_section: string | null }[]): string[] {
  return collectPins(items).filter((pin) => !corpus.has(pin));
}

describe("the demo matter", () => {
  it("carries the fixed ids and the case study text", () => {
    expect(project?.id).toBe(DEMO_PROJECT_ID);
    expect(project?.user_id).toBe(DEMO_USER_ID);
    expect(project?.name).toBe(CASE_STUDY_PROJECT_NAME);
    expect((fixture.profiles ?? [])[0]?.id).toBe(DEMO_USER_ID);
    expect((fixture.project_versions ?? [])[0]?.id).toBe(DEMO_VERSION_ID);
    expect((fixture.project_attachments ?? [])[0]?.id).toBe(DEMO_ATTACHMENT_ID);
    expect((fixture.prior_art_matches ?? [])[0]?.id).toBe(DEMO_MATCH_ID);

    const rows = fixture.project_sections ?? [];
    expect(rows.map((r) => r.section_key).sort()).toEqual(
      Object.keys(CASE_STUDY_SECTIONS).sort(),
    );
    for (const row of rows) {
      expect(row.project_id).toBe(DEMO_PROJECT_ID);
      expect(row.content).toBe(CASE_STUDY_SECTIONS[row.section_key]);
      expect(row.word_count).toBe(wordCount(row.content));
    }
    expect(sections.claims).toBe(CASE_STUDY_CLAIMS);
  });

  it("stores exactly the findings the validators compute, with resolved pins", () => {
    const expected = applyResolvedPins(
      runDeterministicValidators(sections, project?.patent_type ?? "utility"),
      corpus,
    );
    const stored = (fixture.findings ?? []).map(
      ({ id, project_id, version_id, created_at, ...finding }) => {
        expect(id).toMatch(/^[0-9a-f-]{36}$/);
        expect(project_id).toBe(DEMO_PROJECT_ID);
        expect(version_id).toBeNull();
        expect(typeof created_at).toBe("string");
        return finding;
      },
    );
    expect(stored).toEqual(expected);
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.map((f) => f.title)).toContain(
      "Claim 4 refers to claim 6, which does not exist",
    );
    // Every pin the validators produced survived: nothing was dropped for a missing section.
    expect(unresolved(runDeterministicValidators(sections))).toEqual([]);
    for (const f of stored) expect(f.mpep_section).not.toBeNull();
  });

  it("stores the matcher's overlaps for the compared patent", () => {
    const match = matchCandidate(
      extractLimitations(CASE_STUDY_CLAIMS),
      CASE_STUDY_COMPARISON.text,
    );
    const row = (fixture.prior_art_matches ?? [])[0];
    expect(row).toMatchObject({
      project_id: DEMO_PROJECT_ID,
      patent_number: CASE_STUDY_COMPARISON.patentNumber,
      source: "google_patents",
      source_url: CASE_STUDY_COMPARISON.sourceUrl,
      overall_score: match.overallScore,
    });
    const spans = (fixture.match_spans ?? []).map((s) => ({
      userSpanStart: s.user_span_start,
      userSpanEnd: s.user_span_end,
      patentSpanText: s.patent_span_text,
      overlapType: s.overlap_type,
      confidence: s.element_confidence,
    }));
    expect(spans).toEqual(match.spans);
    for (const s of fixture.match_spans ?? []) {
      expect(s.match_id).toBe(DEMO_MATCH_ID);
      expect(s.user_section_key).toBe("claims");
    }
  });

  it("ships the figure it points at", () => {
    const attachment = (fixture.project_attachments ?? [])[0];
    expect(attachment?.storage_path).toBe(DEMO_FIGURE_STORAGE_PATH);
    const file = path.join(process.cwd(), "public", DEMO_FIGURE_STORAGE_PATH);
    expect(existsSync(file)).toBe(true);
    expect(attachment?.size_bytes).toBe(statSync(file).size);
    expect(attachment?.mime).toBe("image/png");
  });
});

describe("the demo corpus", () => {
  it("holds real section text from the USPTO", () => {
    const rows = fixture.mpep_sections ?? [];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.full_text.length).toBeGreaterThanOrEqual(30);
      expect(row.edition).toBe("Ninth Edition, Revision 01.2024");
      expect(row.source_url).toMatch(/^https:\/\/www\.uspto\.gov\//);
    }
    expect(new Set(rows.map((r) => r.section_number)).size).toBe(rows.length);
  });

  it("resolves every pin the demo's screens can show", () => {
    expect(project).toBeDefined();
    const filing = runFilingChecks({
      project: project!,
      inventors,
      hasSignedDeclaration: false,
      role: "inventor",
      title: sections.title,
    });
    const consistency = runCrossRefChecks(
      toDisclosure((fixture.project_disclosure ?? [])[0]),
      sections,
    );
    const filled = SECTION_KEYS.filter((k) => sections[k].trim().length > 0);
    const rules = surfaceRules({
      patentType: project!.patent_type,
      filled,
      sections,
      declared_status: project!.declared_status,
    });
    const lifecycle = PROJECT_STATUSES.flatMap((status) =>
      PATENT_TYPES.flatMap((type) => lifecycleActions(status, type)),
    );
    const literals = ["608.02", "1503.02", "608.01(g)", "2106"].map((mpep_section) => ({
      mpep_section,
    }));

    expect(unresolved(filing)).toEqual([]);
    expect(unresolved(consistency)).toEqual([]);
    expect(unresolved([...rules.appliesNow, ...rules.conditional])).toEqual([]);
    expect(unresolved(lifecycle)).toEqual([]);
    expect(unresolved(literals)).toEqual([]);
  });
});
