/**
 * The in-memory database behind demo mode (shared/demo/mode.ts): one row array per table,
 * seeded from the JSON fixture, with the column defaults, unique keys, foreign key actions,
 * identity columns and updated_at triggers of supabase/migrations mirrored, so the
 * repositories behave as they do against Postgres. The query builder (query-builder.ts)
 * reads and writes it; the client (client.ts) wraps both behind the supabase-js surface the
 * app calls.
 *
 * One store per process, held on globalThis so a Turbopack hot reload keeps the demo's
 * edits; a restart returns to the fixture. Pure TypeScript: no Node API and no I/O, so the
 * builder tests drive it directly with inline rows.
 */
import type { Database } from "@/shared/db/database.types";
import {
  loadFixture,
  type FixtureSeed,
  type TableName,
} from "@/shared/demo/fixture/index";

export type { FixtureSeed, TableName } from "@/shared/demo/fixture/index";
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
/** A row as the store handles it: the generated shape, widened for column-by-name access. */
export type AnyRow = Record<string, unknown>;

export type StoredBlob = { bytes: Uint8Array; contentType: string };

export type DemoStore = {
  tables: { [T in TableName]: Row<T>[] };
  /** Storage objects uploaded during this session, by object path. */
  blobs: Map<string, StoredBlob>;
  /** The next value of each identity column (audit_log.id, api_usage.id). */
  identities: Map<TableName, number>;
};

/** Every table in the schema. A table added to the schema is a compile error here. */
const TABLES: Record<TableName, true> = {
  api_usage: true,
  audit_log: true,
  exports: true,
  findings: true,
  match_spans: true,
  mpep_chunks: true,
  mpep_sections: true,
  prior_art_matches: true,
  profiles: true,
  project_attachments: true,
  project_declarations: true,
  project_disclosure: true,
  project_inventors: true,
  project_sections: true,
  project_versions: true,
  projects: true,
};

export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

/** Tables whose primary key is an identity column rather than a uuid. */
const IDENTITY_TABLES: ReadonlySet<TableName> = new Set(["audit_log", "api_usage"]);

/** Tables with a before-update trigger that stamps updated_at (touch_updated_at). */
const TOUCHED_ON_UPDATE: ReadonlySet<TableName> = new Set([
  "projects",
  "project_sections",
]);

/** The columns that identify a row for an upsert that names no conflict target. */
const PRIMARY_KEYS: Record<TableName, string[]> = {
  api_usage: ["id"],
  audit_log: ["id"],
  exports: ["id"],
  findings: ["id"],
  match_spans: ["id"],
  mpep_chunks: ["id"],
  mpep_sections: ["id"],
  prior_art_matches: ["id"],
  profiles: ["id"],
  project_attachments: ["id"],
  project_declarations: ["id"],
  project_disclosure: ["project_id"],
  project_inventors: ["id"],
  project_sections: ["id"],
  project_versions: ["id"],
  projects: ["id"],
};

/**
 * Column defaults from the migrations, for an insert that omits the column. Not-null
 * columns with no default (a project's name, a finding's title) stay absent, as Postgres
 * would reject the row; the callers always supply them.
 */
const DEFAULTS: Record<TableName, (now: string) => AnyRow> = {
  api_usage: (now) => ({ created_at: now }),
  audit_log: (now) => ({
    user_id: null,
    project_id: null,
    version_id: null,
    detail: null,
    ip: null,
    created_at: now,
  }),
  exports: (now) => ({ id: uuid(), version_id: null, created_at: now }),
  findings: (now) => ({
    id: uuid(),
    version_id: null,
    span_start: 0,
    span_end: 0,
    actionable: true,
    mpep_section: null,
    cfr_ref: null,
    created_at: now,
  }),
  match_spans: (now) => ({ id: uuid(), element_confidence: null, created_at: now }),
  mpep_chunks: (now) => ({ id: uuid(), embedding: null, created_at: now }),
  mpep_sections: (now) => ({
    id: uuid(),
    title: null,
    chapter: null,
    revision_tag: null,
    fetched_at: now,
    fts: null,
  }),
  prior_art_matches: (now) => ({
    id: uuid(),
    version_id: null,
    title: null,
    source_url: null,
    overall_score: null,
    created_at: now,
  }),
  profiles: (now) => ({ email: null, consented_at: null, role: null, created_at: now }),
  project_attachments: (now) => ({
    id: uuid(),
    kind: "drawing",
    view: null,
    mime: "",
    size_bytes: 0,
    analysis: null,
    annotations: null,
    page_index: null,
    vector_scene_meta: null,
    created_at: now,
  }),
  project_declarations: (now) => ({
    id: uuid(),
    inventor_id: null,
    s_signature: null,
    statements: {},
    signed_at: now,
  }),
  project_disclosure: (now) => ({
    field_industry: "",
    problem_solved: "",
    how_it_works: "",
    components: "",
    advantages: "",
    alternatives: "",
    known_prior_art: "",
    updated_at: now,
  }),
  project_inventors: (now) => ({
    id: uuid(),
    legal_name: "",
    residence: "",
    mailing_address: "",
    citizenship: "",
    ord: 0,
    created_at: now,
  }),
  project_sections: (now) => ({
    id: uuid(),
    content: "",
    word_count: 0,
    updated_at: now,
  }),
  project_versions: (now) => ({
    id: uuid(),
    label: null,
    parent_version_id: null,
    created_at: now,
  }),
  projects: (now) => ({
    id: uuid(),
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
    created_at: now,
    updated_at: now,
  }),
};

type ForeignKey = {
  child: TableName;
  column: string;
  onDelete: "cascade" | "set null";
};

/** What happens to the child rows when a parent row is deleted (supabase/migrations). */
const FOREIGN_KEYS: Partial<Record<TableName, ForeignKey[]>> = {
  projects: [
    { child: "project_sections", column: "project_id", onDelete: "cascade" },
    { child: "project_versions", column: "project_id", onDelete: "cascade" },
    { child: "project_disclosure", column: "project_id", onDelete: "cascade" },
    { child: "project_inventors", column: "project_id", onDelete: "cascade" },
    { child: "project_declarations", column: "project_id", onDelete: "cascade" },
    { child: "project_attachments", column: "project_id", onDelete: "cascade" },
    { child: "findings", column: "project_id", onDelete: "cascade" },
    { child: "prior_art_matches", column: "project_id", onDelete: "cascade" },
    { child: "exports", column: "project_id", onDelete: "cascade" },
  ],
  project_versions: [
    { child: "project_versions", column: "parent_version_id", onDelete: "set null" },
  ],
  project_inventors: [
    { child: "project_declarations", column: "inventor_id", onDelete: "set null" },
  ],
  prior_art_matches: [{ child: "match_spans", column: "match_id", onDelete: "cascade" }],
  mpep_sections: [{ child: "mpep_chunks", column: "section_id", onDelete: "cascade" }],
};

function uuid(): string {
  return crypto.randomUUID();
}

/** supabase-js sends rows as JSON, which drops undefined values; so does the store. */
function withoutUndefined(row: AnyRow): AnyRow {
  const out: AnyRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function createDemoStore(seed: FixtureSeed): DemoStore {
  const tables = {} as Record<TableName, AnyRow[]>;
  for (const table of TABLE_NAMES) {
    tables[table] = structuredClone((seed[table] ?? []) as AnyRow[]);
  }
  const identities = new Map<TableName, number>();
  for (const table of IDENTITY_TABLES) {
    const max = tables[table].reduce(
      (acc, row) => Math.max(acc, Number(row.id ?? 0)),
      0,
    );
    identities.set(table, max + 1);
  }
  return {
    tables: tables as DemoStore["tables"],
    blobs: new Map(),
    identities,
  };
}

const GLOBAL_KEY = "__pincite_demo_store__";
type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: DemoStore };

/** The process-wide store, seeded from the fixture on first use. */
export function getDemoStore(): DemoStore {
  const g = globalThis as GlobalWithStore;
  g[GLOBAL_KEY] ??= createDemoStore(loadFixture());
  return g[GLOBAL_KEY];
}

/** Tests only: forget the process-wide store so the next access reseeds it. */
export function resetDemoStore(): void {
  delete (globalThis as GlobalWithStore)[GLOBAL_KEY];
}

export function rowsOf(store: DemoStore, table: TableName): AnyRow[] {
  return store.tables[table] as AnyRow[];
}

export function primaryKeyOf(table: TableName): string[] {
  return PRIMARY_KEYS[table];
}

/** A row ready to insert: the migration defaults, the caller's columns, an identity id. */
export function withDefaults(
  store: DemoStore,
  table: TableName,
  row: AnyRow,
  now: string = new Date().toISOString(),
): AnyRow {
  const out = { ...DEFAULTS[table](now), ...withoutUndefined(row) };
  if (IDENTITY_TABLES.has(table) && out.id == null) {
    const next = store.identities.get(table) ?? 1;
    out.id = next;
    store.identities.set(table, next + 1);
  }
  return out;
}

/** Apply an update patch in place, stamping updated_at where a trigger would. */
export function applyPatch(
  table: TableName,
  row: AnyRow,
  patch: AnyRow,
  now: string = new Date().toISOString(),
): void {
  Object.assign(row, withoutUndefined(patch));
  if (TOUCHED_ON_UPDATE.has(table)) row.updated_at = now;
}

/** Remove the given rows and apply the foreign key actions to their children. */
export function deleteRows(
  store: DemoStore,
  table: TableName,
  victims: readonly AnyRow[],
): void {
  if (victims.length === 0) return;
  const gone = new Set(victims);
  (store.tables as Record<TableName, AnyRow[]>)[table] = rowsOf(store, table).filter(
    (row) => !gone.has(row),
  );
  // Every referenced parent key in the schema is the parent's `id` column.
  const ids = new Set(victims.map((row) => row.id));
  for (const fk of FOREIGN_KEYS[table] ?? []) {
    const children = rowsOf(store, fk.child).filter((child) =>
      ids.has(child[fk.column]),
    );
    if (children.length === 0) continue;
    if (fk.onDelete === "cascade") {
      deleteRows(store, fk.child, children);
    } else {
      for (const child of children) child[fk.column] = null;
    }
  }
}
