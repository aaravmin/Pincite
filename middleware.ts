import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/shared/db/middleware";
import { isDemoMode } from "@/shared/demo/mode";

export async function middleware(request: NextRequest) {
  // Demo mode: no session to refresh and nothing to protect; every screen is the demo
  // viewer's (shared/demo/mode.ts).
  if (isDemoMode()) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files. Auth API
     * routes and the OAuth callback are handled inside updateSession's allowlist.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
