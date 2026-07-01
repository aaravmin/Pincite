import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Calm marketing top nav. Logo left, one anchor set and a single primary action.
 * Server component, no client JS. Copy avoids sanitizer-stripped punctuation.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Pincite home">
          <Logo className="h-7 w-auto" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#trace" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#one-place" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#trust" className="transition-colors hover:text-foreground">
            Trust
          </a>
        </nav>
        <div className="flex items-center gap-2">
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
