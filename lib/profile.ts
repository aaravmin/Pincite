/**
 * Profile helpers. A profile carries the confidentiality consent timestamp and the
 * user's chosen role. Role tailors the whole workflow:
 *  - inventor  = pro se filer; gets plain-English guidance and personally signs the
 *                inventor's declaration (37 CFR 1.63 / PTO-AIA-01).
 *  - attorney  = practitioner; gets a denser portfolio across clients/matters, manages
 *                the power of attorney (PTO-AIA-82), and signs the prosecution papers.
 * Read-only helpers for Server Components; the role is set via app/role/accept.
 */
import { createClient } from "@/lib/supabase/server";

export const USER_ROLES = ["attorney", "inventor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  attorney: "Patent attorney or agent",
  inventor: "Inventor filing pro se",
};

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole | null;
  consented_at: string | null;
};

export async function getProfile(): Promise<Profile | null> {
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
  return (data as Profile) ?? null;
}
