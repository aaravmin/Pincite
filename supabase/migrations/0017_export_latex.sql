-- Allow the real-patent-format export: a LaTeX source bundle that typesets the whole
-- application (specification, claims, abstract, drawings) like a published patent.
alter table public.exports drop constraint if exists exports_format_check;
alter table public.exports
  add constraint exports_format_check
  check (format in ('pdf', 'txt', 'docx', 'package', 'latex'));
