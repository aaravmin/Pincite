import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { getAttachmentStream } from "@/features/drawings/application/get-attachment-stream";

// Serve a private attachment. By default redirect to a short-lived signed URL (good for
// <img> previews and downloads). With ?raw=1 stream the bytes from this same-origin route
// instead, so the drawing editor can read the image onto a canvas without tainting it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id: projectId, attachmentId } = await params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getAttachmentStream({
    supabase: viewer.supabase,
    projectId,
    attachmentId,
    raw: new URL(request.url).searchParams.has("raw"),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.kind === "bytes") {
    return new NextResponse(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, max-age=120",
      },
    });
  }
  return NextResponse.redirect(result.url);
}
