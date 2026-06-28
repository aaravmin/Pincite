-- v3: allow the new export formats (specification DOCX and the filing-package ZIP).
alter table public.exports drop constraint if exists exports_format_check;
alter table public.exports
  add constraint exports_format_check
  check (format in ('pdf', 'txt', 'docx', 'package'));
