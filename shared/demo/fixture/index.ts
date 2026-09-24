/**
 * The demo fixture as row arrays keyed by table name: the public Apple container case study
 * (matter.json, generated from case-study.ts by scripts/build-demo-fixture.mjs) and every
 * MPEP section the demo's screens can pin (mpep-sections.json, fetched from uspto.gov by the
 * same script). shared/db/demo/store.ts seeds the in-memory database from it.
 *
 * The JSON is cast to the generated row types here, once: the generator writes every column
 * of every row, and shared/demo/fixture.test.ts holds the rows to the case study text.
 */
import type { Database } from "@/shared/db/database.types";
import matter from "@/shared/demo/fixture/matter.json";
import mpep from "@/shared/demo/fixture/mpep-sections.json";

export type TableName = keyof Database["public"]["Tables"];
export type FixtureRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type FixtureSeed = { [T in TableName]?: FixtureRow<T>[] };

export function loadFixture(): FixtureSeed {
  return {
    ...(matter as unknown as FixtureSeed),
    ...(mpep as unknown as FixtureSeed),
  };
}
