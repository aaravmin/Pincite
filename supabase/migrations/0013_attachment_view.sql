-- 0013: per-figure orientation/view on attachments, so a patent's multiple views (and an
-- uploaded 3D model) can be labeled. Free text, validated in app code against a known set.
alter table public.project_attachments
  add column if not exists view text;
