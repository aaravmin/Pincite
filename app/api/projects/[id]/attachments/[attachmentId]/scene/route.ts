import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VectorSceneMeta } from "@/lib/filing/types";

// Stream a figure's editable vector scene (the traced path objects) same-origin as JSON. The
// scene body lives in Storage; the row only holds a pointer. Ownership is confirmed with the user
// client, then the bytes are read with the admin client (Storage RLS does not see the user JWT).
export async function GET(
  _request: Request,
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
    .select("vector_scene_meta")
    .eq("id", attachmentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meta = row.vector_scene_meta as VectorSceneMeta | null;
  if (!meta?.storagePath) {
    return NextResponse.json({ error: "This figure has no vector scene." }, { status: 404 });
  }

  const { data: blob, error } = await createAdminClient()
    .storage.from("project-files")
    .download(meta.storagePath);
  if (error || !blob) {
    return NextResponse.json(
      { error: error?.message ?? "Could not read the scene." },
      { status: 400 },
    );
  }
  const buf = Buffer.from(await blob.arrayBuffer());
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
