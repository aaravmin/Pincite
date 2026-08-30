import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { exportApplication } from "@/features/exports/application/export-application";
import { parseExportFormat } from "@/features/exports/types";

/**
 * Download (or preview) one export of a matter. Authentication, input validation, and turning
 * the artifact into a response - the documents themselves are built in features/exports.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const format = parseExportFormat(url.searchParams.get("format"));
  if (!format) return new NextResponse("Unknown format", { status: 400 });

  const artifact = await exportApplication({
    projectId: id,
    format,
    preview: url.searchParams.get("preview") === "1",
  });
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
