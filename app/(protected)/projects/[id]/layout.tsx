import type { ReactNode } from "react";
import { requireViewer } from "@/shared/auth/require-viewer";
import { StepRail } from "@/components/workspace/step-rail";
import { getSectionContent } from "@/lib/projects/queries";
import { getInventors, getAttachments } from "@/lib/filing/queries";
import { getDisclosure } from "@/lib/disclosure/queries";
import { SECTION_KEYS, ADVANCED_SECTION_KEYS } from "@/lib/projects/sections";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The (protected) group layout already gated this request; this call is deduped by the
  // React cache and is here for the request-scoped client the step queries need.
  const { supabase } = await requireViewer();

  const [sections, inventors, attachments, disclosure, exportsRes] =
    await Promise.all([
      getSectionContent(id),
      getInventors(id),
      getAttachments(id),
      getDisclosure(id),
      supabase.from("exports").select("id").eq("project_id", id).limit(1),
    ]);
  const required = SECTION_KEYS.filter((k) => !ADVANCED_SECTION_KEYS.has(k));
  const filled = required.filter(
    (k) => (sections[k] ?? "").trim().length > 0,
  ).length;
  const hasSignedDeclaration = attachments.some((a) => a.kind === "declaration");
  const done: Record<string, boolean> = {
    draft: required.length > 0 && filled === required.length,
    disclosure: !!(
      disclosure.problem_solved.trim() &&
      disclosure.how_it_works.trim() &&
      disclosure.components.trim()
    ),
    inventors:
      inventors.length > 0 &&
      inventors.every(
        (i) =>
          i.legal_name.trim() &&
          i.residence.trim() &&
          i.mailing_address.trim(),
      ),
    drawings: attachments.some((a) => a.kind === "drawing"),
    sign: inventors.length > 0 && hasSignedDeclaration,
    submission: (exportsRes.data ?? []).length > 0,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <StepRail projectId={id} done={done} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
