// Phase 1 DB checks: RLS isolation + append-only immutability for projects,
// project_sections, and project_versions. Creates two ephemeral users, proves one
// can never read or write the other's rows, and proves saved versions cannot be
// updated or deleted from the client. Cleans up after itself.
//
// Run: node --env-file=.env.local scripts/verify-phase1.mjs
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
  { email: `p1-a-${stamp}@example.com`, password: `P1-A-${stamp}!x` },
  { email: `p1-b-${stamp}@example.com`, password: `P1-B-${stamp}!x` },
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
    u.client = anon();
    const { error: e2 } = await u.client.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    if (e2) throw e2;
  }
  const [A, B] = users;

  // A creates a project, a section, and two versions.
  const { data: proj, error: pErr } = await A.client
    .from("projects")
    .insert({ user_id: A.id, name: "A widget" })
    .select("id")
    .single();
  if (pErr) {
    fail(`A create project: ${pErr.message}`);
    throw new Error("stop");
  }
  ok("A created a project");
  const projectId = proj.id;

  {
    const { error } = await A.client.from("project_sections").insert({
      project_id: projectId,
      section_key: "title",
      content: "Hello",
      word_count: 1,
    });
    if (error) fail(`A insert section: ${error.message}`);
    else ok("A added a section");
  }

  const versionIds = [];
  for (const label of ["v1", "v2"]) {
    const { data, error } = await A.client
      .from("project_versions")
      .insert({
        project_id: projectId,
        user_id: A.id,
        label,
        snapshot: { project: {}, sections: { title: "Hello" } },
      })
      .select("id")
      .single();
    if (error) fail(`A save ${label}: ${error.message}`);
    else versionIds.push(data.id);
  }
  if (versionIds.length === 2) ok("A saved two versions");

  // Append-only: versions cannot be updated or deleted from the client.
  {
    const { data, error } = await A.client
      .from("project_versions")
      .update({ label: "tampered" })
      .eq("id", versionIds[0])
      .select();
    if (error) ok(`version update blocked (${error.code ?? "error"})`);
    else if (!data || data.length === 0)
      ok("version update affected 0 rows (blocked)");
    else fail("A updated an immutable version");
  }
  {
    const { data, error } = await A.client
      .from("project_versions")
      .delete()
      .eq("id", versionIds[0])
      .select();
    if (error) ok(`version delete blocked (${error.code ?? "error"})`);
    else if (!data || data.length === 0)
      ok("version delete affected 0 rows (blocked)");
    else fail("A deleted an immutable version");
  }
  {
    const { data } = await admin
      .from("project_versions")
      .select("id")
      .eq("project_id", projectId);
    if ((data ?? []).length === 2) ok("both versions still present (history intact)");
    else fail(`expected 2 versions, found ${(data ?? []).length}`);
  }

  // Cross-user isolation: B can read none of A's rows.
  for (const [table, filter] of [
    ["projects", { id: projectId }],
    ["project_sections", { project_id: projectId }],
    ["project_versions", { project_id: projectId }],
  ]) {
    const q = B.client.from(table).select("*");
    for (const [k, v] of Object.entries(filter)) q.eq(k, v);
    const { data } = await q;
    if ((data ?? []).length === 0) ok(`B cannot read A's ${table}`);
    else fail(`B read ${(data ?? []).length} of A's ${table} rows`);
  }

  // B cannot attach a version to A's project (insert policy checks project ownership).
  {
    const { data, error } = await B.client
      .from("project_versions")
      .insert({ project_id: projectId, user_id: B.id, label: "evil", snapshot: {} })
      .select();
    if (error) ok(`B insert into A's project blocked (${error.code ?? "error"})`);
    else if (!data || data.length === 0)
      ok("B insert affected 0 rows (blocked)");
    else fail("B inserted a version into A's project");
  }

  console.log(
    failed
      ? "\nPHASE 1 DB TEST: FAILED"
      : "\nPHASE 1 DB TEST: PASS — RLS isolation holds and versions are append-only.",
  );
} catch (e) {
  if (e.message !== "stop") fail(`unexpected: ${e.message}`);
} finally {
  for (const id of createdIds) {
    await admin.from("projects").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

process.exit(failed ? 1 : 0);
