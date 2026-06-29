import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER ONLY - bypasses RLS, so every caller MUST verify
 * ownership with the user-scoped client first. Used for Storage operations
 * (upload/sign/remove): the cookie-based SSR server client does not carry the user JWT to
 * Storage requests, so Storage RLS would reject them. Table writes still go through the
 * user client so RLS stays the boundary there.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
