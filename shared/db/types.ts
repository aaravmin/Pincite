/**
 * The typed database boundary. Every Supabase client in the app is created with
 * `<Database>` (see server.ts / admin.ts / client.ts / middleware.ts), so a query result is
 * typed from the schema instead of being cast at the call site.
 *
 * Use `TypedSupabaseClient` for any function that accepts a client, and the `Tables<>` /
 * `TablesInsert<>` / `TablesUpdate<>` / `Enums<>` helpers to name row shapes without
 * re-declaring them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/db/database.types";

export type { Database, Json } from "@/shared/db/database.types";
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "@/shared/db/database.types";
export { Constants } from "@/shared/db/database.types";

/** A Supabase client bound to the Pincite schema. */
export type TypedSupabaseClient = SupabaseClient<Database>;
