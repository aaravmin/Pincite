import { createBrowserClient } from "@supabase/ssr";
import type { TypedSupabaseClient } from "@/shared/db/types";

/**
 * Supabase client for browser/client components. The schema is pinned on the return type;
 * see the note in shared/db/server.ts for why it is not passed to createBrowserClient.
 */
export function createClient(): TypedSupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
