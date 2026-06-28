import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit, clientIp } from "@/lib/audit";

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
  const kind = String(form.get("kind") ?? "drawing") === "supporting"
    ? "supporting"
    : "drawing";

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPEG, GIF, WEBP, or PDF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)." }, { status: 400 });
  }

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
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: row, error: insErr } = await supabase
    .from("project_attachments")
    .insert({
      project_id: projectId,
      kind,
      storage_path: path,
      filename: file.name,
      mime: file.type,
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
    detail: { kind, filename: file.name, mime: file.type },
    ip: clientIp(request),
  });

  return NextResponse.json({ attachment: row });
}
