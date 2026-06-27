import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, clientIp } from "@/lib/audit";

/**
 * OAuth PKCE callback. Exchanges the code for a session, records the login in
 * the audit log, and redirects to `next` (defaults to /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) next = "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        await logAudit(supabase, {
          userId: data.user.id,
          action: "login",
          ip: clientIp(request),
          detail: { provider: "google" },
        });
      }
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) return NextResponse.redirect(`${origin}${next}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
