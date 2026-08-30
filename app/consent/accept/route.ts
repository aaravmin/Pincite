import { NextResponse } from "next/server";
import { getViewer } from "@/shared/auth/require-viewer";
import { clientIp } from "@/shared/audit/log";
import { acceptConsent } from "@/features/account/application/accept-consent";

export async function POST(request: Request) {
  const viewer = await getViewer();

  const { origin } = new URL(request.url);
  if (!viewer) return NextResponse.redirect(`${origin}/login`, { status: 303 });

  // A browser form post, not a fetch, so this one answers with a redirect rather than a
  // status code. A failed write is not surfaced here: the viewer lands back on /consent
  // because the profile still carries no timestamp.
  await acceptConsent(viewer, { ip: clientIp(request) });

  return NextResponse.redirect(`${origin}/role`, { status: 303 });
}
