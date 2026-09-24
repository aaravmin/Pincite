import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createDemoClient } from "@/shared/db/demo/client";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { isDemoMode } from "@/shared/demo/mode";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Uses the request cookie store (async in Next.js 15).
 *
 * The schema is pinned on the RETURN type rather than as a type argument to
 * createServerClient: @supabase/ssr 0.5.2 declares its return as
 * SupabaseClient<Database, SchemaName, Schema>, but @supabase/supabase-js 2.10x changed that
 * third type parameter to SchemaName, so passing <Database> through ssr resolves every row to
 * `never`. The runtime client is identical either way. Drop the annotation and pass <Database>
 * directly once @supabase/ssr is upgraded to a line that matches supabase-js 2.10x.
 */
export async function createClient(): Promise<TypedSupabaseClient> {
  // Demo mode: no Supabase project, so the in-memory case study store answers instead.
  if (isDemoMode()) return createDemoClient();

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Never cache a user-scoped query in the Next data cache; each request must hit the DB
      // with the current user's session so one account never sees another's data.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component - safe to ignore because the
            // middleware (shared/db/middleware.ts) refreshes the session.
          }
        },
      },
    },
  );
}
