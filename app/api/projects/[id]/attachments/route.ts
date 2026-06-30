import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit, clientIp } from "@/lib/audit";
import { ATTACHMENT_VIEWS } from "@/lib/filing/types";

const ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_BYTES = 26214400; // 25 MB, matches the bucket limit

// Upload a drawing or supporting document into the private US-region Storage bucket
// under `{projectId}/...`. RLS enforces ownership; we also fail clearly on bad input.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const kindRaw = String(form.get("kind") ?? "drawing");
  const kind =
    kindRaw === "supporting" || kindRaw === "declaration" ? kindRaw : "drawing";
  const viewRaw = String(form.get("view") ?? "");
  const view =
    viewRaw && (ATTACHMENT_VIEWS as readonly string[]).includes(viewRaw)
      ? viewRaw
      : null;

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const lname = file.name.toLowerCase();
  const is3d = lname.endsWith(".glb") || lname.endsWith(".gltf");
  if (!ALLOWED.includes(file.type) && !is3d) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Use PNG, JPEG, GIF, WEBP, PDF, or a 3D model (GLB/GLTF).",
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)." }, { status: 400 });
  }
  // 3D files often arrive with an empty or generic mime; normalize so the viewer can detect it.
  const mime = is3d
    ? lname.endsWith(".glb")
      ? "model/gltf-binary"
      : "model/gltf+json"
    : file.type;

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
  const path = `${projectId}/${crypto.randomUUID()}-${safe}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  // Ownership verified above via the user client; do the Storage write with the admin
  // client (the SSR client doesn't carry the JWT to Storage). Path is namespaced by id.
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("project-files")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: row, error: insErr } = await supabase
    .from("project_attachments")
    .insert({
      project_id: projectId,
      kind,
      view,
      storage_path: path,
      filename: file.name,
      mime,
      size_bytes: file.size,
    })
    .select("*")
    .single();
  if (insErr || !row) {
    await admin.storage.from("project-files").remove([path]);
    return NextResponse.json(
      { error: insErr?.message ?? "Could not record attachment." },
      { status: 400 },
    );
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "attachment_uploaded",
    projectId,
    detail: { kind, view, filename: file.name, mime },
    ip: clientIp(request),
  });

  return NextResponse.json({ attachment: row });
}
