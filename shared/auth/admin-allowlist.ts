/**
 * Admin allowlist. Only these accounts can perform admin-only actions such as removing a
 * patent (a destructive, non-reversible operation). Matched case-insensitively on the
 * authenticated user's email. Keep this list short and intentional.
 */
export const ADMIN_EMAILS = ["aarav.minocha@gmail.com"];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
