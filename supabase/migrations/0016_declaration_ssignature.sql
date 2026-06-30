-- The S-signature on an inventor declaration (Feature 3). 37 CFR 1.4(d)(2): an electronically
-- filed paper is signed by inserting the signer's name between forward slashes, e.g.
-- /John A. Smith/. We store that verbatim alongside the printed legal name. Append-only with
-- the rest of the declaration row.

alter table public.project_declarations
  add column if not exists s_signature text;

-- PostgREST caches the schema; reload so the new column is served immediately.
notify pgrst, 'reload schema';
