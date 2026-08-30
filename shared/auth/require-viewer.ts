import "server-only";

/**
 * The one place the app answers "who is asking, and may they see this?".
 *
 * Every protected screen used to repeat the same ten lines: create a client, load the
 * user, redirect to /login, select `consented_at` from `profiles`, redirect to /consent.
 * That is a security surface as much as a duplication problem - a new page that forgets
 * the block silently skips the consent gate. It now lives here.
 *
 * REQUEST CACHING. `getViewer` is wrapped in React `cache()`, which dedupes only within a
 * single RSC render pass or a single server-action / route-handler invocation. It is NOT a
 * cross-request cache: a second request (or a different user) always re-reads the session
 * and the profile row, so one account can never be served another's viewer. Nothing here
 * touches the Next.js data cache.
 *
 * LAYOUTS ARE NOT THE ONLY GATE. `app/(protected)/layout.tsx` calls `requireViewer()`, but
 * Next.js does not re-render a layout on a soft client-side navigation between routes that
 * share it. So the layout guard is defense in depth; each page (and each server action and
 * route handler) still calls `requireViewer()` / `getViewer()` itself. Within one render
 * the extra calls are free, because of the cache above.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/shared/db/server";
import type { TypedSupabaseClient } from "@/shared/db/types";
import type { ViewerProfile } from "@/shared/auth/types";
import { decideViewerAccess } from "@/shared/auth/access";

export type Viewer = {
  user: User;
  profile: ViewerProfile;
  supabase: TypedSupabaseClient;
};

/**
 * The authenticated viewer, or null when signed out. Never redirects - use it in route
 * handlers (which must answer 401, not bounce a fetch to an HTML login page) and on the
 * public screens that merely want to know whether someone is signed in.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, consented_at")
    .eq("id", user.id)
    .maybeSingle();

  // A signup trigger creates the profile row, but a missing row must never crash a screen
  // or silently look like consent: fall back to an unconsented profile, which sends the
  // viewer through the consent flow that would have created the row anyway.
  const profile: ViewerProfile = data ?? {
    id: user.id,
    email: user.email ?? null,
    role: null,
    consented_at: null,
  };

  return { user, profile, supabase };
});

async function gate(options: { requireConsent: boolean }): Promise<Viewer> {
  const viewer = await getViewer();
  const decision = decideViewerAccess(viewer, options);
  // `!viewer` is the same condition as "login"; naming it lets TypeScript narrow.
  if (decision === "login" || !viewer) redirect("/login");
  if (decision === "consent") redirect("/consent");
  return viewer;
}

/**
 * The guard for every protected screen and mutation: signed in AND consented, or the
 * request is redirected away. Returns the user, their profile, and a request-scoped
 * Supabase client so the caller does not create a second one.
 */
export async function requireViewer(): Promise<Viewer> {
  return gate({ requireConsent: true });
}

/**
 * Authentication only, no consent check. For the screens and handlers that run BEFORE
 * consent exists - the consent screen and its accept handler, the role screen, and the
 * login bookkeeping - where requiring consent would be circular.
 */
export async function requireUser(): Promise<Viewer> {
  return gate({ requireConsent: false });
}
