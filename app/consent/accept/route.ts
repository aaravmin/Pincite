import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { logAudit, clientIp } from "@/shared/audit/log";

export async function POST(request: Request) {
  const viewer = await getViewer();

  const { origin } = new URL(request.url);
  if (!viewer) return NextResponse.redirect(`${origin}/login`, { status: 303 });
  const { supabase, user } = viewer;

  const { error } = await supabase
    .from("profiles")
    .update({ consented_at: new Date().toISOString() })
    .eq("id", user.id);

  if (!error) {
    await logAudit(supabase, {
      userId: user.id,
      action: "consent_granted",
      ip: clientIp(request),
    });
  }

  return NextResponse.redirect(`${origin}/role`, { status: 303 });
}
