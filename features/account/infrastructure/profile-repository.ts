import "server-only";

/**
 * Persistence for the signed-in user's own profile row. RLS restricts `profiles` to the
 * owner, and every write here is additionally keyed by the authenticated user id, so one
 * account can never change another's consent or role.
 */
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { UserRole } from "@/shared/auth/types";

/** `{ error }` mirrors the Supabase result so callers can decide what to do with a failure. */
type WriteResult = { error: string | null };

export async function updateProfileRole(
  supabase: TypedSupabaseClient,
  userId: string,
  role: UserRole,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  return { error: error?.message ?? null };
}

/** Stamp the confidentiality consent. The timestamp is the record that it was given. */
export async function markProfileConsented(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("profiles")
    .update({ consented_at: new Date().toISOString() })
    .eq("id", userId);
  return { error: error?.message ?? null };
}
