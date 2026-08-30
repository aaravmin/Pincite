import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { clientIp } from "@/shared/audit/log";
import { changeRole } from "@/features/account/application/update-role";
import { USER_ROLES } from "@/shared/auth/types";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const { origin } = new URL(request.url);
  if (!viewer) return NextResponse.redirect(`${origin}/login`, { status: 303 });

  const form = await request.formData();
  const submitted = String(form.get("role") ?? "");
  const role = USER_ROLES.find((r) => r === submitted);
  if (!role) {
    return NextResponse.redirect(`${origin}/role`, { status: 303 });
  }

  // A browser form post, so this answers with a redirect. A failed write is not surfaced:
  // the viewer lands on the dashboard, which sends them back to /role while the profile
  // still carries no role.
  await changeRole(viewer, role, { ip: clientIp(request) });

  return NextResponse.redirect(`${origin}/dashboard`, { status: 303 });
}
