import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, getSectionContent } from "@/lib/projects/queries";
import { getInventors } from "@/lib/filing/queries";
import { buildDeclarationPdf, buildPoaPdf } from "@/lib/export/declaration-pdf";
import { sanitizeOutputFilename, sanitizeOutputText } from "@/lib/text/sanitize";

// Serve a filing document as a PDF to print, sign, and upload back. ?doc=poa returns the
// power of attorney (for attorneys); otherwise the inventor's declaration (one page per
// inventor). RLS scopes the reads to the owner.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const project = await getProject(id);
  if (!project) return new NextResponse("Not found", { status: 404 });
  const [inventors, sections] = await Promise.all([
    getInventors(id),
    getSectionContent(id),
  ]);
  const title = sections["title"] ?? "";
  const doc = new URL(request.url).searchParams.get("doc");
  const safeId = sanitizeOutputFilename(id);

  if (doc === "poa") {
    const pdf = await buildPoaPdf({
      title: sanitizeOutputText(title),
      applicant: sanitizeOutputText(project.applicant_name || project.client_name || ""),
      practitioner: "",
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="power_of_attorney_${safeId}.pdf"`,
      },
    });
  }

  const pdf = await buildDeclarationPdf({
    title: sanitizeOutputText(title),
    inventors: inventors.map((i) => ({
      legal_name: sanitizeOutputText(i.legal_name),
    })),
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="declaration_${safeId}.pdf"`,
    },
  });
}
