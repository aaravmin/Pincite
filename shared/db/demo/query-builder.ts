/**
 * The part of the supabase-js query builder the app actually uses, over the in-memory demo
 * store (store.ts): from, select (with count and head), insert, update, upsert, delete, eq,
 * neq, in, order, limit, single and maybeSingle, and awaiting the builder itself. Nothing
 * else is implemented on purpose; a method the app never calls would only be untested code.
 *
 * It records the request and runs it when awaited, like PostgREST, so the order in which
 * the app chains calls does not matter. Results mirror PostgREST: `{ data, error, count,
 * status, statusText }`, PGRST116 when single() sees no row or several, `data: null` for a
 * mutation with no select, ascending order putting nulls last and descending putting them
 * first unless nullsFirst says otherwise, and enum columns ordered by their declaration
 * order rather than alphabetically (so findings sort violation, attention, pass). Rows are
 * cloned on the way out, as they would be parsed from a response body.
 */
import { Constants } from "@/shared/db/database.types";
import {
  applyPatch,
  deleteRows,
  primaryKeyOf,
  rowsOf,
  withDefaults,
  type AnyRow,
  type DemoStore,
  type TableName,
} from "@/shared/db/demo/store";

export type DemoPostgrestError = {
  message: string;
  details: string;
  hint: string;
  code: string;
};

export type DemoResponse<T = unknown> = {
  data: T;
  error: DemoPostgrestError | null;
  count: number | null;
  status: number;
  statusText: string;
};

type Filter = { column: string; op: "eq" | "neq" | "in"; value: unknown };
type Order = { column: string; ascending: boolean; nullsFirst: boolean | undefined };
type Operation =
  | { kind: "select" }
  | { kind: "insert"; rows: AnyRow[] }
  | { kind: "update"; patch: AnyRow }
  | {
      kind: "upsert";
      rows: AnyRow[];
      onConflict: string[] | null;
      ignoreDuplicates: boolean;
    }
  | { kind: "delete" };

const ENUMS = Constants.public.Enums;

/** Enum-typed columns, so ordering follows the enum's declaration order like Postgres. */
const ENUM_COLUMNS: Partial<Record<TableName, Record<string, readonly string[]>>> = {
  findings: {
    severity: ENUMS.finding_severity,
    kind: ENUMS.finding_kind,
    section_key: ENUMS.section_key,
  },
  match_spans: { user_section_key: ENUMS.section_key, overlap_type: ENUMS.overlap_type },
  prior_art_matches: { source: ENUMS.prior_art_source },
  profiles: { role: ENUMS.user_role },
  project_attachments: { kind: ENUMS.attachment_kind },
  project_sections: { section_key: ENUMS.section_key },
  projects: {
    patent_type: ENUMS.patent_type,
    declared_status: ENUMS.project_status,
    entity_status: ENUMS.entity_status,
  },
};

function ok<T>(data: T, count: number | null = null): DemoResponse<T> {
  return { data, error: null, count, status: 200, statusText: "OK" };
}

function fail(
  code: string,
  message: string,
  status = 400,
  details = "",
): DemoResponse<null> {
  return {
    data: null,
    error: { message, details, hint: "", code },
    count: null,
    status,
    statusText: status === 406 ? "Not Acceptable" : "Bad Request",
  };
}

const NO_ROWS_FOR_SINGLE = fail(
  "PGRST116",
  "JSON object requested, multiple (or no) rows returned",
  406,
);

function toArray(values: AnyRow | AnyRow[]): AnyRow[] {
  return Array.isArray(values) ? values : [values];
}

function compareValues(
  a: unknown,
  b: unknown,
  enumOrder: readonly string[] | undefined,
): number {
  if (enumOrder && typeof a === "string" && typeof b === "string") {
    return enumOrder.indexOf(a) - enumOrder.indexOf(b);
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** The named columns of a row, or the whole row for "*", as fresh copies. */
function project(row: AnyRow, columns: string): AnyRow {
  const names = columns
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0 || names.includes("*")) return structuredClone(row);
  const out: AnyRow = {};
  for (const name of names) {
    if (name in row) out[name] = structuredClone(row[name]);
  }
  return out;
}

export class DemoQueryBuilder implements PromiseLike<DemoResponse> {
  private operation: Operation = { kind: "select" };
  /** The select list, or null when the request returns no rows (a bare mutation). */
  private columns: string | null = null;
  private countRows = false;
  private headOnly = false;
  private readonly filters: Filter[] = [];
  private readonly orders: Order[] = [];
  private rowLimit: number | null = null;
  private shape: "single" | "maybeSingle" | null = null;

  constructor(
    private readonly store: DemoStore,
    private readonly table: TableName,
  ) {}

  select(
    columns = "*",
    options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ): this {
    this.columns = columns;
    if (options?.count) this.countRows = true;
    if (options?.head) this.headOnly = true;
    return this;
  }

  insert(values: AnyRow | AnyRow[]): this {
    this.operation = { kind: "insert", rows: toArray(values) };
    return this;
  }

  update(patch: AnyRow): this {
    this.operation = { kind: "update", patch };
    return this;
  }

  upsert(
    values: AnyRow | AnyRow[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.operation = {
      kind: "upsert",
      rows: toArray(values),
      onConflict: options?.onConflict
        ? options.onConflict.split(",").map((name) => name.trim())
        : null,
      ignoreDuplicates: options?.ignoreDuplicates ?? false,
    };
    return this;
  }

  delete(): this {
    this.operation = { kind: "delete" };
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, op: "neq", value });
    return this;
  }

  in(column: string, values: readonly unknown[]): this {
    this.filters.push({ column, op: "in", value: [...values] });
    return this;
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ): this {
    this.orders.push({
      column,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst,
    });
    return this;
  }

  limit(count: number): this {
    this.rowLimit = count;
    return this;
  }

  single(): this {
    this.shape = "single";
    return this;
  }

  maybeSingle(): this {
    this.shape = "maybeSingle";
    return this;
  }

  then<TResult1 = DemoResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: DemoResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }

  private matches(row: AnyRow): boolean {
    return this.filters.every((filter) => {
      const value = row[filter.column];
      switch (filter.op) {
        case "eq":
          return value === filter.value;
        case "neq":
          return value !== filter.value;
        case "in":
          return (filter.value as unknown[]).includes(value);
      }
    });
  }

  private sorted(rows: AnyRow[]): AnyRow[] {
    if (this.orders.length === 0) return rows;
    const enums = ENUM_COLUMNS[this.table] ?? {};
    return [...rows].sort((a, b) => {
      for (const order of this.orders) {
        const av = a[order.column];
        const bv = b[order.column];
        const aNull = av === null || av === undefined;
        const bNull = bv === null || bv === undefined;
        if (aNull && bNull) continue;
        const nullsFirst = order.nullsFirst ?? !order.ascending;
        if (aNull) return nullsFirst ? -1 : 1;
        if (bNull) return nullsFirst ? 1 : -1;
        const cmp = compareValues(av, bv, enums[order.column]);
        if (cmp !== 0) return order.ascending ? cmp : -cmp;
      }
      return 0;
    });
  }

  /** The rows a request touched, in the store's own objects. */
  private affected(): AnyRow[] | DemoResponse<null> {
    const rows = rowsOf(this.store, this.table);
    const now = new Date().toISOString();
    const op = this.operation;
    switch (op.kind) {
      case "select":
        return rows.filter((row) => this.matches(row));
      case "insert": {
        const inserted = op.rows.map((row) =>
          withDefaults(this.store, this.table, row, now),
        );
        rows.push(...inserted);
        return inserted;
      }
      case "update": {
        if (this.filters.length === 0) {
          return fail("PINCITE_DEMO_UNFILTERED", "Refusing an unfiltered update");
        }
        const targets = rows.filter((row) => this.matches(row));
        for (const row of targets) applyPatch(this.table, row, op.patch, now);
        return targets;
      }
      case "upsert": {
        const keys = op.onConflict ?? primaryKeyOf(this.table);
        const touched: AnyRow[] = [];
        for (const incoming of op.rows) {
          const existing = rows.find((row) =>
            keys.every((key) => key in incoming && row[key] === incoming[key]),
          );
          if (existing) {
            if (!op.ignoreDuplicates) applyPatch(this.table, existing, incoming, now);
            touched.push(existing);
          } else {
            const inserted = withDefaults(this.store, this.table, incoming, now);
            rows.push(inserted);
            touched.push(inserted);
          }
        }
        return touched;
      }
      case "delete": {
        if (this.filters.length === 0) {
          return fail("PINCITE_DEMO_UNFILTERED", "Refusing an unfiltered delete");
        }
        const targets = rows.filter((row) => this.matches(row));
        const copies = targets.map((row) => structuredClone(row));
        deleteRows(this.store, this.table, targets);
        return copies;
      }
    }
  }

  private execute(): DemoResponse {
    const affected = this.affected();
    if (!Array.isArray(affected)) return affected;

    // A mutation with no select returns no rows, only the outcome.
    if (this.columns === null) return ok(null);

    const count = this.countRows ? affected.length : null;
    if (this.headOnly) return ok(null, count);

    let rows = this.sorted(affected);
    if (this.rowLimit !== null) rows = rows.slice(0, this.rowLimit);
    const data = rows.map((row) => project(row, this.columns ?? "*"));

    if (this.shape === "single") {
      return data.length === 1 ? ok(data[0], count) : NO_ROWS_FOR_SINGLE;
    }
    if (this.shape === "maybeSingle") {
      if (data.length > 1) return NO_ROWS_FOR_SINGLE;
      return ok(data[0] ?? null, count);
    }
    return ok(data, count);
  }
}
