/**
 * Create the private US-region `project-files` Storage bucket and per-owner RLS on
 * storage.objects. Files are stored under `{projectId}/...`; a user may touch an object
 * only when they own the project named by the first path segment. Run once:
 *   node --env-file=.env.local scripts/setup-storage.mjs
 */
import pg from "pg";

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();

await c.query(`
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('project-files', 'project-files', false, 26214400,
    array['image/png','image/jpeg','image/gif','image/webp','application/pdf'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
`);

const own = `bucket_id = 'project-files' and exists (
  select 1 from public.projects p
  where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid())`;

const defs = [
  ["project_files_select", `for select to authenticated using (${own})`],
  ["project_files_insert", `for insert to authenticated with check (${own})`],
  ["project_files_update", `for update to authenticated using (${own}) with check (${own})`],
  ["project_files_delete", `for delete to authenticated using (${own})`],
];
for (const [name, body] of defs) {
  await c.query(`drop policy if exists "${name}" on storage.objects`);
  await c.query(`create policy "${name}" on storage.objects ${body}`);
}

const { rows } = await c.query(
  `select id, public, file_size_limit from storage.buckets where id='project-files'`,
);
console.log("bucket:", JSON.stringify(rows[0]));
console.log("policies: project_files_{select,insert,update,delete} on storage.objects");
await c.end();
