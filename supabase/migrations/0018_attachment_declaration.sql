-- Allow a signed inventor's declaration (37 CFR 1.63) to be uploaded and kept with the
-- matter, so the operative wet-signed document lives alongside the in-app attestation.
alter type public.attachment_kind add value if not exists 'declaration';

-- PostgREST caches the schema; reload so the new enum value is served immediately.
notify pgrst, 'reload schema';
