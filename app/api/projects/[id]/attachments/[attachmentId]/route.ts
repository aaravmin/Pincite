import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Serve a private attachment. By default redirect to a short-lived signed URL (good for
// <img> previews and downloads). With ?raw=1 stream the bytes from this same-origin route
// instead, so the drawing editor can read the image onto a canvas without tainting it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id: projectId, attachmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("project_attachments")
    .select("storage_path, mime")
    .eq("id", attachmentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ownership confirmed via the user client above; read with the admin client.
  const admin = createAdminClient();

  if (new URL(request.url).searchParams.has("raw")) {
    const { data: blob, error } = await admin.storage
      .from("project-files")
      .download(row.storage_path);
    if (error || !blob) {
      return NextResponse.json(
        { error: error?.message ?? "Could not read the file" },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": row.mime || "application/octet-stream",
        "Cache-Control": "private, max-age=120",
      },
    });
  }

  const { data: signed, error } = await admin.storage
    .from("project-files")
    .createSignedUrl(row.storage_path, 120);
  if (error || !signed) {
    return NextResponse.json(
      { error: error?.message ?? "Could not sign URL" },
      { status: 400 },
    );
  }
  return NextResponse.redirect(signed.signedUrl);
}
