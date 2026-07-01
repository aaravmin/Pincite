import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Marketing footer. Carries the standing legal posture and the public policy
 * links. Server component, sanitizer-safe copy.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo className="h-7 w-auto" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              An active patent review workbench. It flags rule violations in your draft, finds
              similar public patents, and pins every rule it cites to real MPEP and CFR text.
            </p>
          </div>
          <nav className="flex flex-col gap-3 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Legal
            </span>
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </nav>
        </div>
        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          A legal research aid, not legal advice. You are responsible for the confidentiality of
          anything you enter. Verify anything time sensitive.
        </p>
      </div>
    </footer>
  );
}
