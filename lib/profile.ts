/**
 * Profile loader for Server Components. The role/consent TYPES now live in
 * `@/shared/auth/types` (pure); this file keeps only the Supabase read while the
 * request-cached viewer loader (`shared/auth/require-viewer.ts`) is introduced.
 */
import { createClient } from "@/shared/db/server";
import type { ViewerProfile } from "@/shared/auth/types";

export { USER_ROLES } from "@/shared/auth/types";
export type { UserRole, ViewerProfile, Profile } from "@/shared/auth/types";

export async function getProfile(): Promise<ViewerProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, consented_at")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? null;
}
