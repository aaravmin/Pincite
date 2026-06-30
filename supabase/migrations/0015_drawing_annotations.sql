-- The editable drawing annotation layer (drawing-editor epic, Feature 2). Holds the movable
-- reference-numeral labels + lead lines and the figure label for a figure, separate from the
-- read-only vision `analysis`. Seeded from the vision numerals on first check, then edited in
-- the drawing editor and exported. Shape: { labels: [{id,text,x,y,lead:{x,y}|null}], figureLabel: {text,x,y}|null }.
-- Written by the server (ownership verified, admin client), read with the attachment.

alter table public.project_attachments
  add column if not exists annotations jsonb;

-- PostgREST caches the schema; reload so the new column is served immediately.
notify pgrst, 'reload schema';
