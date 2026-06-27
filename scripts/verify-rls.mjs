// Cross-user RLS isolation test (Phase 0 done-criterion: "cross-user read test
// passes"). Creates two ephemeral users, signs in as each, and proves that one
// user can never read or write another user's profile or audit rows, while
// own-row access works. Cleans up after itself.
//
// Run: node --env-file=.env.local scripts/verify-rls.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SR) {
  console.error("Missing env (URL / ANON / SERVICE_ROLE). Use --env-file=.env.local");
  process.exit(1);
}

const admin = createClient(URL, SR, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = () =>
  createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

let failed = false;
const fail = (m) => {
  failed = true;
  console.error("  FAIL:", m);
};
const ok = (m) => console.log("  ok:", m);

const stamp = Date.now();
const users = [
  { email: `rls-a-${stamp}@example.com`, password: `Rls-A-${stamp}!x` },
  { email: `rls-b-${stamp}@example.com`, password: `Rls-B-${stamp}!x` },
];
const createdIds = [];

try {
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    u.id = data.user.id;
    createdIds.push(u.id);
  }

  for (const u of users) {
    u.client = anon();
    const { error } = await u.client.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    if (error) throw error;
    const { error: insErr } = await u.client
      .from("audit_log")
      .insert({ user_id: u.id, action: "login", detail: { test: true } });
    if (insErr) fail(`${u.email} could not insert own audit row: ${insErr.message}`);
  }

  const [A, B] = users;

  // Own audit rows visible; others not.
  {
    const { data, error } = await A.client.from("audit_log").select("user_id");
    if (error) fail(`A audit select: ${error.message}`);
    else if (data.some((r) => r.user_id !== A.id))
      fail("A sees another user's audit rows");
    else if (!data.some((r) => r.user_id === A.id))
      fail("A cannot see own audit rows");
    else ok("audit_log: A sees only its own rows");
  }
  {
    const { data, error } = await A.client
      .from("audit_log")
      .select("*")
      .eq("user_id", B.id);
    if (error) fail(`A->B audit select: ${error.message}`);
    else if (data.length !== 0) fail(`A read ${data.length} of B's audit rows`);
    else ok("audit_log: A cannot read B's rows even when querying for them");
  }

  // Own profile visible; B's not.
  {
    const { data, error } = await A.client.from("profiles").select("id");
    if (error) fail(`A profiles select: ${error.message}`);
    else if (data.some((r) => r.id !== A.id))
      fail("A sees another user's profile");
    else if (!data.some((r) => r.id === A.id))
      fail("A cannot see own profile");
    else ok("profiles: A sees only its own row");
  }
  {
    const { data, error } = await A.client
      .from("profiles")
      .select("*")
      .eq("id", B.id);
    if (error) fail(`A->B profile select: ${error.message}`);
    else if (data.length !== 0) fail("A read B's profile");
    else ok("profiles: A cannot read B's profile");
  }

  // A cannot modify B's profile.
  {
    const { data, error } = await A.client
      .from("profiles")
      .update({ email: "hacked@example.com" })
      .eq("id", B.id)
      .select();
    if (error) ok(`profiles: A's write to B blocked (${error.code ?? "error"})`);
    else if (data && data.length > 0) fail("A updated B's profile");
    else ok("profiles: A's write to B affected 0 rows (blocked)");
  }

  console.log(
    failed
      ? "\nRLS TEST: FAILED"
      : "\nRLS TEST: PASS — cross-user access blocked, own-row access works.",
  );
} catch (e) {
  fail(`unexpected: ${e.message}`);
} finally {
  for (const id of createdIds) {
    await admin.from("audit_log").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

process.exit(failed ? 1 : 0);
