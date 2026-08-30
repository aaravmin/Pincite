import Link from "next/link";
import { requireViewer } from "@/shared/auth/require-viewer";
import { AskClient } from "@/components/ask/ask-client";

export default async function AskPage() {
  await requireViewer();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Projects
          </Link>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Ask the MPEP
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <AskClient />
      </div>
    </div>
  );
}
