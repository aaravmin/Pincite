import "server-only";

/**
 * The reads behind `ProjectSnapshot`: one function per table, each taking the caller's
 * request-scoped Supabase client so the whole snapshot runs on a single authenticated
 * client and RLS scopes every row to the owner. Rows are mapped into domain objects here
 * (the jsonb columns on `project_attachments` in particular), so nothing above this layer
 * has to know the database shape.
 *
 * These functions do no business calculation and no authorization decision of their own -
 * the application layer authenticates first and decides what a missing row means.
 */
import type { Tables, TypedSupabaseClient } from "@/shared/db/types";
import {
  SECTION_KEYS,
  type SectionKey,
} from "@/features/projects/domain/sections";
import type { Project } from "@/features/projects/domain/types";
import type { Inventor } from "@/features/filing/domain/types";
import type { Attachment, DrawingAnnotations, DrawingReview } from "@/features/drawings/domain/types";
import {
  DISCLOSURE_FIELDS,
  emptyDisclosure,
  type Disclosure,
} from "@/features/disclosure/domain/types";

/** One row of `exports`, as the readiness gates and the submission step need it. */
export type ExportRecord = { id: string; format: string; created_at: string };

/** A `projects` row is column-for-column the domain project; map it explicitly anyway. */
export function toProject(row: Tables<"projects">): Project {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    patent_type: row.patent_type,
    declared_status: row.declared_status,
    application_number: row.application_number,
    filing_date: row.filing_date,
    applicant_name: row.applicant_name,
    applicant_is_inventor: row.applicant_is_inventor,
    applicant_is_juristic: row.applicant_is_juristic,
    entity_status: row.entity_status,
    client_name: row.client_name,
    matter_no: row.matter_no,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toInventor(row: Tables<"project_inventors">): Inventor {
  return {
    id: row.id,
    project_id: row.project_id,
    legal_name: row.legal_name,
    residence: row.residence,
    mailing_address: row.mailing_address,
    citizenship: row.citizenship,
    ord: row.ord,
    created_at: row.created_at,
  };
}

/**
 * `analysis` (the persisted vision drawing review) and `annotations` (the label layer) are
 * jsonb columns, so the database type is `Json`. Only this app writes them, and it writes
 * the shapes below; the cast is explicit and lives in exactly one place.
 */
function toAttachment(row: Tables<"project_attachments">): Attachment {
  return {
    id: row.id,
    project_id: row.project_id,
    kind: row.kind,
    view: row.view,
    storage_path: row.storage_path,
    filename: row.filename,
    mime: row.mime,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
    analysis: (row.analysis as unknown as DrawingReview | null) ?? null,
    annotations: (row.annotations as unknown as DrawingAnnotations | null) ?? null,
    page_index: row.page_index,
  };
}

export async function loadProject(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(`load project: ${error.message}`);
  return data ? toProject(data) : null;
}

/** section_key -> content, with EVERY section key present ("" when the row is missing). */
export async function loadSections(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Record<SectionKey, string>> {
  const { data, error } = await supabase
    .from("project_sections")
    .select("section_key, content")
    .eq("project_id", projectId);
  if (error) throw new Error(`load sections: ${error.message}`);
  const sections = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, ""]),
  ) as Record<SectionKey, string>;
  for (const row of data ?? []) {
    sections[row.section_key as SectionKey] = row.content ?? "";
  }
  return sections;
}

export async function loadInventors(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Inventor[]> {
  const { data, error } = await supabase
    .from("project_inventors")
    .select("*")
    .eq("project_id", projectId)
    .order("ord", { ascending: true });
  if (error) throw new Error(`load inventors: ${error.message}`);
  return (data ?? []).map(toInventor);
}

export async function loadAttachments(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("project_attachments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .order("page_index", { ascending: true, nullsFirst: true });
  if (error) throw new Error(`load attachments: ${error.message}`);
  return (data ?? []).map(toAttachment);
}

/** The disclosure intake; every field defaults to "" when there is no row yet. */
export async function loadDisclosure(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<Disclosure> {
  const { data, error } = await supabase
    .from("project_disclosure")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(`load disclosure: ${error.message}`);
  const disclosure = emptyDisclosure();
  if (data) {
    for (const field of DISCLOSURE_FIELDS) {
      disclosure[field.key] = data[field.key] ?? "";
    }
  }
  return disclosure;
}

/** Every export this matter has produced, newest first. */
export async function loadExports(
  supabase: TypedSupabaseClient,
  projectId: string,
): Promise<ExportRecord[]> {
  const { data, error } = await supabase
    .from("exports")
    .select("id, format, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`load exports: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    format: row.format,
    created_at: row.created_at,
  }));
}
