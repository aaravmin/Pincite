import Link from "next/link";
import { Play } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/**
 * Calm marketing top nav. A larger wordmark on the left, a Launch video action,
 * and the primary sign-in path. Server component, no client JS. Copy avoids
 * sanitizer-stripped punctuation.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Pincite home">
          <Logo className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Launch video - not wired yet; point href at the video when it exists. */}
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Play className="size-4" aria-hidden />
            Launch video
          </a>
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start a review
          </Link>
        </div>
      </div>
    </header>
  );
}
