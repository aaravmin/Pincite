/**
 * The protected-route access decision, as a pure function.
 *
 * PURE: no Next.js, React, Supabase, cookies, or redirects, so the rule that decides
 * whether a request may see a screen is unit-testable without a request context. The
 * caller (`shared/auth/require-viewer.ts`) turns the decision into a redirect.
 *
 * Two gates, in order:
 *  1. Signed in at all -> otherwise "login".
 *  2. Confidentiality consent recorded -> otherwise "consent". Consent is a legal
 *     precondition for putting matter into Pincite (see docs/business-context.md), so
 *     every screen that can hold invention text requires it. The consent and role
 *     screens themselves pass `requireConsent: false`, since demanding consent to reach
 *     the consent screen would loop.
 */

/** What the caller must do with the request. */
export type ViewerAccess = "ok" | "login" | "consent";

/**
 * The part of a viewer this decision reads. `Viewer` from require-viewer.ts satisfies it
 * structurally, so callers pass the whole viewer and tests pass a bare profile.
 */
export type ViewerConsentState = {
  profile: { consented_at: string | null };
};

export function decideViewerAccess(
  viewer: ViewerConsentState | null,
  options: { requireConsent: boolean },
): ViewerAccess {
  if (!viewer) return "login";
  if (options.requireConsent && !viewer.profile.consented_at) return "consent";
  return "ok";
}
