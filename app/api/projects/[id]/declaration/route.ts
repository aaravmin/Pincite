import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import {
  buildDeclaration,
  parseFilingDocument,
} from "@/features/exports/application/build-declaration";

/**
 * Serve a filing document as a PDF to print, sign, and upload back. ?doc=poa returns the
 * power of attorney (for attorneys); otherwise the inventor's declaration.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Auth only, no viewer fields needed: the loader below is RLS-scoped to the owner.
  const viewer = await getViewer();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });

  const doc = parseFilingDocument(new URL(request.url).searchParams.get("doc"));
  const artifact = await buildDeclaration({ projectId: id, doc });
  if (!artifact) return new NextResponse("Not found", { status: 404 });

  const body =
    typeof artifact.body === "string" ? artifact.body : new Uint8Array(artifact.body);
  return new NextResponse(body, {
    headers: {
      "Content-Type": artifact.contentType,
      "Content-Disposition": `${artifact.disposition}; filename="${artifact.filename}"`,
    },
  });
}
