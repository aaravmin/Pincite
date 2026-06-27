import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Ensure a confirmed email/password test user exists, with consent reset and a
 * clean audit trail, so the protected-screen gate is deterministic each run.
 */
async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
}

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!url || !serviceKey || !email || !password) {
    throw new Error(
      "global-setup: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / TEST_USER_EMAIL / TEST_USER_PASSWORD",
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = await findUserByEmail(admin, email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  } else {
    // Ensure the password is the known test value.
    await admin.auth.admin.updateUserById(user.id, { password });
  }

  // Reset state so the consent screen reliably appears and audit asserts are precise.
  await admin.from("profiles").update({ consented_at: null }).eq("id", user.id);
  await admin.from("audit_log").delete().eq("user_id", user.id);
  // Phase 1: clear the test user's projects (cascades sections + versions) so the
  // dashboard starts empty and version/audit assertions are deterministic. No-op if
  // the Phase 1 tables don't exist yet.
  await admin.from("projects").delete().eq("user_id", user.id);
}
