/**
 * Viewer identity types. A profile carries the confidentiality consent timestamp and the
 * user's chosen role. Role tailors the whole workflow:
 *  - inventor  = pro se filer; gets plain-English guidance and personally signs the
 *                inventor's declaration (37 CFR 1.63 / PTO-AIA-01).
 *  - attorney  = practitioner; gets a denser portfolio across clients/matters, manages
 *                the power of attorney (PTO-AIA-82), and signs the prosecution papers.
 *
 * PURE: types plus the role value list. No Next.js, React, Supabase, or env access, so a
 * client component can import `UserRole` without pulling a server module into its bundle.
 * The role is set via app/role/accept; the profile is loaded by the viewer loader.
 */
import type { Enums } from "@/shared/db/database.types";

/** The `public.user_role` enum. The DB is the source of truth for the value set. */
export type UserRole = Enums<"user_role">;

/** The role values, for runtime validation. `satisfies` keeps this in step with the enum. */
export const USER_ROLES = ["attorney", "inventor"] as const satisfies readonly UserRole[];

/** The subset of `public.profiles` every protected screen needs. */
export type ViewerProfile = {
  id: string;
  email: string | null;
  role: UserRole | null;
  consented_at: string | null;
};
