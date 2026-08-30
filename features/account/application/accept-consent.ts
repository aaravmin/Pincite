import "server-only";

/**
 * Record the confidentiality consent. Consent is the gate every protected
 * screen checks, so the timestamp on the profile row IS the record; the audit entry is the
 * append-only evidence of when it was given.
 *
 * A failed write deliberately does not log a consent entry - the log must never claim a
 * consent the profile does not carry. The caller redirects either way, and an unconsented
 * profile simply lands back on this screen.
 */
import { logAudit } from "@/shared/audit/log";
import type { Viewer } from "@/shared/auth/require-viewer";
import { markProfileConsented } from "@/features/account/infrastructure/profile-repository";

export async function acceptConsent(
  viewer: Viewer,
  options: { ip?: string | null } = {},
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = viewer;
  const { error } = await markProfileConsented(supabase, user.id);
  if (error) return { error };

  await logAudit(supabase, {
    userId: user.id,
    action: "consent_granted",
    ip: options.ip,
  });
  return { ok: true };
}
