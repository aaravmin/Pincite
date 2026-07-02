import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LaunchVideo } from "@/components/marketing/launch-video";

/**
 * Calm marketing top nav. A wordmark on the left, a Launch video action, and the
 * primary sign-in path. Responsive: on phones the wordmark shrinks, Launch video
 * collapses to its play icon (label kept for screen readers), and the actions stay
 * on one line so nothing wraps. Server component, no client JS. Copy avoids
 * sanitizer-stripped punctuation.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Pincite home">
          <Logo className="h-8 w-auto sm:h-10" />
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <LaunchVideo>
            <span className="sr-only sm:not-sr-only">Launch video</span>
          </LaunchVideo>
          <Link
            href="/login"
            className="inline-flex items-center whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
          >
            Start a review
          </Link>
        </div>
      </div>
    </header>
  );
}
