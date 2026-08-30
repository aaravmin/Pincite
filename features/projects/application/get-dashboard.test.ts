import { describe, expect, it, vi } from "vitest";
import { getDashboard } from "@/features/projects/application/get-dashboard";
import { loadDashboardRows } from "@/features/projects/infrastructure/dashboard-repository";
import type { Viewer } from "@/shared/auth/require-viewer";
import type { TypedSupabaseClient } from "@/shared/db/types";

type Rows = Record<string, Record<string, unknown>[]>;

/**
 * A minimal stand-in for the Supabase query builder: every chained call returns itself and
 * awaiting it yields the rows registered for the table. It records which tables were queried,
 * which is the property that actually matters here - the dashboard must stay batched.
 */
function fakeClient(rows: Rows, queried: string[]): TypedSupabaseClient {
  const chain = (table: string) => {
    const result = { data: rows[table] ?? [], error: null };
    const self: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "order", "limit"]) {
      self[method] = () => self;
    }
    self.maybeSingle = async () => result;
    self.then = (
      resolve: (value: typeof result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return self;
  };
  return {
    from: (table: string) => {
      queried.push(table);
      return chain(table);
    },
  } as unknown as TypedSupabaseClient;
}

const project = (id: string) => ({
  id,
  user_id: "u1",
  name: `Matter ${id}`,
  patent_type: "utility",
  declared_status: "drafting",
  application_number: null,
  filing_date: null,
  applicant_name: null,
  applicant_is_inventor: true,
  applicant_is_juristic: false,
  entity_status: "micro",
  client_name: null,
  matter_no: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
});

function run(rows: Rows) {
  const queried: string[] = [];
  const supabase = fakeClient(rows, queried);
  const deps = {
    requireViewer: vi.fn(async () => ({ supabase }) as unknown as Viewer),
    loadDashboardRows,
  };
  return { queried, result: getDashboard(deps) };
}

describe("getDashboard", () => {
  it("queries each table exactly once, however many matters there are", async () => {
    const many = Array.from({ length: 25 }, (_, i) => project(`p${i}`));
    const { queried, result } = run({ projects: many });
    expect(await result).toHaveLength(25);
    // One projects read plus one batched read per child table - never one per project.
    expect(queried).toEqual([
      "projects",
      "project_sections",
      "project_versions",
      "project_disclosure",
      "project_inventors",
      "project_attachments",
    ]);
  });

  it("does not touch the child tables when the viewer has no matters", async () => {
    const { queried, result } = run({ projects: [] });
    expect(await result).toEqual([]);
    expect(queried).toEqual(["projects"]);
  });

  it("attaches each project's own batched rows to its summary", async () => {
    const { result } = run({
      projects: [project("p1"), project("p2")],
      project_sections: [
        { project_id: "p1", section_key: "claims", word_count: 12, content: "1. A mount." },
        { project_id: "p2", section_key: "title", word_count: 2, content: "A mount" },
      ],
      project_versions: [{ project_id: "p1" }, { project_id: "p1" }],
      project_disclosure: [
        { project_id: "p1", problem_solved: "It jams.", how_it_works: "" },
        { project_id: "p2", problem_solved: "", how_it_works: "" },
      ],
      project_inventors: [{ project_id: "p1" }],
      project_attachments: [{ project_id: "p1" }],
    });
    const [p1, p2] = await result;
    expect(p1.versionCount).toBe(2);
    expect(p2.versionCount).toBe(0);
    // p1 has a disclosure, an inventor, and a signed declaration; p2 has none of them.
    expect(p1.completeness).toBeGreaterThan(p2.completeness);
  });
});
