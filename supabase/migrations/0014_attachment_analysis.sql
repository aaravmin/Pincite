-- Persist the vision drawing review per attachment so the issues flagged on a figure
-- survive a page leave: re-opening the saved project shows them without re-running the
-- vision model. The review JSON holds { summary, figureLabel, components, findings }.
-- Written by the server (ownership verified there, admin client), read with the attachment.

alter table public.project_attachments
  add column if not exists analysis jsonb;

-- PostgREST caches the schema; reload so the new column is served immediately.
notify pgrst, 'reload schema';
