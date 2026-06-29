/**
 * Reset a Pincite account to a clean slate so onboarding replays, without deleting the login.
 *
 * Clears consent and role (so the next sign-in goes consent -> role -> empty dashboard),
 * deletes the account's projects (cascades to sections, versions, findings, prior-art,
 * attachments, declarations, disclosure) and their uploaded files in Storage, and clears the
 * audit log and rate-limit usage. The auth user (the Google/email login) is preserved.
 *
 * Usage:
 *   node --env-file=.env.local scripts/reset-account.mjs <email>
 *   pnpm reset:account <email>
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (provided by --env-file=.env.local). Service role bypasses RLS, so run it locally only.
 */
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || "").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/reset-account.mjs <email>");
  process.exit(1);
}
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local",
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await admin.auth.admin.listUsers({
  perPage: 1000,
});
if (listErr) {
  console.error("Could not list users:", listErr.message);
  process.exit(1);
}
const user = list.users.find((u) => (u.email || "").toLowerCase() === email);
if (!user) {
  console.log(`No account found for ${email} (it may never have signed in). Nothing to reset.`);
  process.exit(0);
}

const { data: prof } = await admin
  .from("profiles")
  .select("consented_at, role")
  .eq("id", user.id)
  .maybeSingle();
const { data: projs } = await admin
  .from("projects")
  .select("id")
  .eq("user_id", user.id);
const ids = (projs ?? []).map((p) => p.id);
console.log(`Account: ${email}  id=${user.id}`);
console.log(
  `Before: consent=${prof?.consented_at ? "yes" : "no"} role=${prof?.role ?? "none"} projects=${ids.length}`,
);

// Remove uploaded files for those projects, then delete the projects (DB cascades children).
let removedFiles = 0;
if (ids.length) {
  const { data: atts } = await admin
    .from("project_attachments")
    .select("storage_path")
    .in("project_id", ids);
  const paths = (atts ?? []).map((a) => a.storage_path).filter(Boolean);
  if (paths.length) {
    const { error } = await admin.storage.from("project-files").remove(paths);
    if (error) console.warn("storage remove warning:", error.message);
    else removedFiles = paths.length;
  }
  await admin.from("projects").delete().eq("user_id", user.id);
}

// Replay onboarding, and clear history + rate limits.
await admin
  .from("profiles")
  .update({ consented_at: null, role: null })
  .eq("id", user.id);
const { count: auditCount } = await admin
  .from("audit_log")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id);
await admin.from("audit_log").delete().eq("user_id", user.id);
await admin.from("api_usage").delete().eq("user_id", user.id);

const { data: prof2 } = await admin
  .from("profiles")
  .select("consented_at, role")
  .eq("id", user.id)
  .maybeSingle();
console.log(
  `RESET DONE. projects deleted=${ids.length}, files removed=${removedFiles}, audit cleared=${auditCount ?? 0}`,
);
console.log(
  `After: consent=${prof2?.consented_at ? "yes" : "no"} role=${prof2?.role ?? "none"} projects=0. Login preserved.`,
);
