import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { clientIp } from "@/shared/audit/log";
import { uploadAttachment } from "@/features/drawings/application/upload-attachment";

// Upload a drawing or supporting document into the private US-region Storage bucket
// under `{projectId}/...`. RLS enforces ownership; we also fail clearly on bad input.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, user } = viewer;

  const form = await request.formData();
  const result = await uploadAttachment({
    supabase,
    userId: user.id,
    projectId,
    file: form.get("file") as File | null,
    kind: String(form.get("kind") ?? "drawing"),
    view: String(form.get("view") ?? ""),
    ip: clientIp(request),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ attachment: result.attachment });
}
