-- Editable vectorized drawing scenes (drawing-editor epic, vector rebuild).
--
-- The traced scene JSON (the drawn geometry turned into movable/resizable/hideable path
-- objects) can be large, so the body lives in Storage at {projectId}/scenes/{attachmentId}.json.
-- This jsonb column is a small pointer the UI ships cheaply with every attachment row
-- (existence, dimensions, object count, and whether the user has edited it yet).
--
-- page_index splits a multi-page PDF into one figure (attachment row) per page, all sharing
-- the original PDF's storage_path; null/0 means a single-page PDF or a raster image.
alter table public.project_attachments
  add column if not exists vector_scene_meta jsonb,
  add column if not exists page_index int;

notify pgrst, 'reload schema';
