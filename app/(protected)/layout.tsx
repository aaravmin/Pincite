import type { ReactNode } from "react";
import { requireViewer } from "@/shared/auth/require-viewer";

/**
 * The authorization boundary for every signed-in screen. Being inside this route group is
 * what makes a page protected: no URL changes, but the request must carry a session and a
 * recorded confidentiality consent to render anything below it.
 *
 * Defense in depth, not the only gate. Next.js does not re-render a layout on a soft
 * navigation between two routes that share it, so each page still calls `requireViewer()`
 * itself; within one render the call is deduped by the React cache in
 * shared/auth/require-viewer.ts. This layout adds no markup - each screen keeps rendering
 * its own shell.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireViewer();
  return <>{children}</>;
}
