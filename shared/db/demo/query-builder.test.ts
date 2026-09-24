import { describe, expect, it } from "vitest";
import { DemoQueryBuilder } from "@/shared/db/demo/query-builder";
import {
  createDemoStore,
  rowsOf,
  type DemoStore,
  type Row,
  type TableName,
} from "@/shared/db/demo/store";

const USER = "00000000-0000-4000-8000-000000000001";
const P1 = "00000000-0000-4000-8000-000000000010";
const P2 = "00000000-0000-4000-8000-000000000011";
const M1 = "00000000-0000-4000-8000-000000000040";

/** A fixed clock: minutes past 15:00 UTC on the fixture's day. */
const at = (minutes: number) =>
  new Date(Date.UTC(2026, 8, 14, 15, minutes)).toISOString();

type AnyRow = Record<string, unknown>;

function project(id: string, name: string, updatedAt: string): Row<"projects"> {
  return {
    id,
    user_id: USER,
    name,
    patent_type: "utility",
    declared_status: "drafting",
    application_number: null,
    filing_date: null,
    applicant_name: null,
    applicant_is_inventor: true,
    applicant_is_juristic: false,
    entity_status: "large",
    client_name: null,
    matter_no: null,
    created_at: at(0),
    updated_at: updatedAt,
  };
}

function section(
  id: string,
  projectId: string,
  key: Row<"project_sections">["section_key"],
  content: string,
): Row<"project_sections"> {
  return {
    id,
    project_id: projectId,
    section_key: key,
    content,
    word_count: content.split(/\s+/).filter(Boolean).length,
    updated_at: at(1),
  };
}

function finding(
  id: string,
  projectId: string,
  severity: Row<"findings">["severity"],
  title: string,
): Row<"findings"> {
  return {
    id,
    project_id: projectId,
    version_id: null,
    section_key: "claims",
    span_start: 0,
    span_end: 1,
    severity,
    kind: "structural",
    actionable: true,
    title,
    explanation: "x",
    mpep_section: null,
    cfr_ref: null,
    created_at: at(2),
  };
}

function attachment(
  id: string,
  projectId: string,
  createdAt: string,
  pageIndex: number | null,
): Row<"project_attachments"> {
  return {
    id,
    project_id: projectId,
    kind: "drawing",
    view: null,
    storage_path: `${projectId}/${id}.png`,
    filename: `${id}.png`,
    mime: "image/png",
    size_bytes: 1,
    created_at: createdAt,
    page_index: pageIndex,
    analysis: null,
    annotations: null,
    vector_scene_meta: null,
  };
}

function seed(): DemoStore {
  return createDemoStore({
    projects: [project(P1, "First", at(30)), project(P2, "Second", at(10))],
    project_sections: [
      section("s1", P1, "claims", "1. A widget."),
      section("s2", P1, "title", "Widget"),
      section("s3", P2, "claims", "1. A base."),
    ],
    findings: [
      finding("f1", P1, "attention", "Attention one"),
      finding("f2", P1, "violation", "Violation one"),
      finding("f3", P1, "pass", "Pass one"),
    ],
    project_attachments: [
      attachment("a1", P1, at(5), null),
      attachment("a2", P1, at(9), 1),
      attachment("a3", P1, at(9), 0),
      attachment("a4", P1, at(9), null),
    ],
    prior_art_matches: [
      {
        id: M1,
        project_id: P1,
        version_id: null,
        patent_number: "US1",
        title: null,
        source: "google_patents",
        source_url: null,
        overall_score: 0.5,
        created_at: at(3),
      },
    ],
    match_spans: [
      {
        id: "sp1",
        match_id: M1,
        user_section_key: "claims",
        user_span_start: 0,
        user_span_end: 5,
        patent_span_text: "x",
        overlap_type: "lexical",
        element_confidence: 0.5,
        created_at: at(3),
      },
    ],
  });
}

const from = (store: DemoStore, table: TableName) =>
  new DemoQueryBuilder(store, table);

describe("reads", () => {
  it("filters with eq and returns a copy through maybeSingle", async () => {
    const store = seed();
    const { data, error } = await from(store, "projects")
      .select("*")
      .eq("id", P1)
      .maybeSingle();
    expect(error).toBeNull();
    const row = data as AnyRow;
    expect(row.name).toBe("First");
    row.name = "Mutated";
    expect(rowsOf(store, "projects")[0].name).toBe("First");
  });

  it("answers PGRST116 for single with no row or several rows", async () => {
    const store = seed();
    const none = await from(store, "projects").select("*").eq("id", "nope").single();
    expect(none.data).toBeNull();
    expect(none.error?.code).toBe("PGRST116");
    const many = await from(store, "projects").select("*").eq("user_id", USER).single();
    expect(many.error?.code).toBe("PGRST116");
    const maybeMany = await from(store, "projects")
      .select("*")
      .eq("user_id", USER)
      .maybeSingle();
    expect(maybeMany.error?.code).toBe("PGRST116");
    const maybeNone = await from(store, "projects")
      .select("*")
      .eq("id", "nope")
      .maybeSingle();
    expect(maybeNone).toMatchObject({ data: null, error: null });
  });

  it("resolves when awaited with no terminal call, and inside Promise.all", async () => {
    const store = seed();
    const [sections, projects] = await Promise.all([
      from(store, "project_sections").select("section_key, content").in("project_id", [P1]),
      from(store, "projects").select("*").order("updated_at", { ascending: false }),
    ]);
    expect((sections.data as AnyRow[]).map((r) => r.section_key)).toEqual(["claims", "title"]);
    expect((sections.data as AnyRow[])[0]).toEqual({ section_key: "claims", content: "1. A widget." });
    expect((projects.data as AnyRow[]).map((r) => r.name)).toEqual(["First", "Second"]);
  });

  it("applies neq, limit, and chained orders with the Postgres null placement", async () => {
    const store = seed();
    const { data } = await from(store, "project_attachments")
      .select("id")
      .eq("project_id", P1)
      .neq("id", "a1")
      .order("created_at", { ascending: false })
      .order("page_index", { ascending: true, nullsFirst: true });
    expect((data as AnyRow[]).map((r) => r.id)).toEqual(["a4", "a3", "a2"]);

    const desc = await from(store, "project_attachments")
      .select("id")
      .eq("project_id", P1)
      .order("page_index", { ascending: false })
      .limit(2);
    // Descending puts nulls first by default; the two nulls come before page 1.
    expect((desc.data as AnyRow[]).map((r) => r.id)).toEqual(["a1", "a4"]);
  });

  it("orders an enum column by its declaration order, not alphabetically", async () => {
    const store = seed();
    const { data } = await from(store, "findings")
      .select("severity")
      .eq("project_id", P1)
      .order("severity", { ascending: true });
    expect((data as AnyRow[]).map((r) => r.severity)).toEqual([
      "violation",
      "attention",
      "pass",
    ]);
  });

  it("counts without returning rows for head requests", async () => {
    const store = seed();
    const { data, count, error } = await from(store, "project_attachments")
      .select("id", { count: "exact", head: true })
      .eq("project_id", P1)
      .neq("id", "a1");
    expect(error).toBeNull();
    expect(data).toBeNull();
    expect(count).toBe(3);
  });
});

describe("writes", () => {
  it("inserts with the migration defaults and returns the requested columns", async () => {
    const store = seed();
    const { data, error } = await from(store, "projects")
      .insert({ user_id: USER, name: "Third" })
      .select("id")
      .single();
    expect(error).toBeNull();
    const id = (data as AnyRow).id as string;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const stored = rowsOf(store, "projects").find((r) => r.id === id);
    expect(stored).toMatchObject({
      patent_type: "utility",
      declared_status: "drafting",
      entity_status: "large",
      applicant_is_inventor: true,
      applicant_is_juristic: false,
      client_name: null,
    });
    expect(typeof stored?.created_at).toBe("string");
  });

  it("returns null data for a mutation with no select, and every row for select(*)", async () => {
    const store = seed();
    const bare = await from(store, "project_inventors").insert({
      project_id: P1,
      legal_name: "Ada",
    });
    expect(bare).toMatchObject({ data: null, error: null });

    const { data } = await from(store, "project_inventors")
      .insert([
        { project_id: P1, legal_name: "Bea", ord: 1 },
        { project_id: P1, legal_name: "Cy", ord: 2 },
      ])
      .select("*");
    expect((data as AnyRow[]).map((r) => r.legal_name)).toEqual(["Bea", "Cy"]);
    expect((data as AnyRow[])[0]).toMatchObject({ residence: "", citizenship: "" });
  });

  it("numbers identity rows like audit_log from one", async () => {
    const store = seed();
    const first = await from(store, "audit_log")
      .insert({ user_id: USER, action: "login" })
      .select("id")
      .single();
    const second = await from(store, "audit_log")
      .insert({ user_id: USER, action: "logout" })
      .select("id")
      .single();
    expect((first.data as AnyRow).id).toBe(1);
    expect((second.data as AnyRow).id).toBe(2);
    expect(rowsOf(store, "audit_log")[0]).toMatchObject({ detail: null, ip: null });
  });

  it("updates the filtered rows and stamps updated_at like the trigger", async () => {
    const store = seed();
    const before = rowsOf(store, "projects")[0].updated_at;
    const { error } = await from(store, "projects")
      .update({ name: "Renamed" })
      .eq("id", P1);
    expect(error).toBeNull();
    const rows = rowsOf(store, "projects");
    expect(rows[0]).toMatchObject({ id: P1, name: "Renamed" });
    expect(rows[0].updated_at).not.toBe(before);
    expect(rows[1].name).toBe("Second");
  });

  it("refuses an update or delete with no filter", async () => {
    const store = seed();
    const update = await from(store, "projects").update({ name: "x" });
    expect(update.error?.code).toBe("PINCITE_DEMO_UNFILTERED");
    const del = await from(store, "projects").delete();
    expect(del.error?.code).toBe("PINCITE_DEMO_UNFILTERED");
    expect(rowsOf(store, "projects")).toHaveLength(2);
  });

  it("upserts on the named conflict target", async () => {
    const store = seed();
    const { error } = await from(store, "project_sections").upsert(
      [
        { project_id: P1, section_key: "claims", content: "1. A gadget.", word_count: 3 },
        { project_id: P1, section_key: "abstract", content: "An abstract.", word_count: 2 },
      ],
      { onConflict: "project_id,section_key" },
    );
    expect(error).toBeNull();
    const rows = rowsOf(store, "project_sections").filter((r) => r.project_id === P1);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.section_key === "claims")).toMatchObject({
      id: "s1",
      content: "1. A gadget.",
    });
    expect(rows.find((r) => r.section_key === "abstract")?.word_count).toBe(2);
  });

  it("upserts on the primary key when no conflict target is named", async () => {
    const store = seed();
    await from(store, "project_disclosure").upsert(
      { project_id: P1, problem_solved: "Soggy food." },
      { onConflict: "project_id" },
    );
    await from(store, "project_disclosure").upsert({
      project_id: P1,
      how_it_works: "Ridges.",
    });
    const rows = rowsOf(store, "project_disclosure");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      problem_solved: "Soggy food.",
      how_it_works: "Ridges.",
      field_industry: "",
    });
  });

  it("deletes with the migrations' cascades", async () => {
    const store = seed();
    const { error } = await from(store, "projects").delete().eq("id", P1);
    expect(error).toBeNull();
    expect(rowsOf(store, "projects").map((r) => r.id)).toEqual([P2]);
    expect(rowsOf(store, "project_sections").map((r) => r.id)).toEqual(["s3"]);
    expect(rowsOf(store, "findings")).toHaveLength(0);
    expect(rowsOf(store, "project_attachments")).toHaveLength(0);
    expect(rowsOf(store, "prior_art_matches")).toHaveLength(0);
    expect(rowsOf(store, "match_spans")).toHaveLength(0);
  });

  it("nulls a child reference where the migration says set null", async () => {
    const store = seed();
    await from(store, "project_versions").insert([
      { id: "v1", project_id: P1, user_id: USER, snapshot: {} },
      { id: "v2", project_id: P1, user_id: USER, snapshot: {}, parent_version_id: "v1" },
    ]);
    await from(store, "project_versions").delete().eq("id", "v1");
    const rows = rowsOf(store, "project_versions");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "v2", parent_version_id: null });
  });
});
