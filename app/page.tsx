import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="w-full max-w-xl text-center">
        <Logo className="mx-auto h-14 w-auto" />
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          An active patent review workbench. Paste your draft, see the rules that
          apply, and verify every finding against the real MPEP text in one click.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Sign in to start
          </Link>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          A legal research aid, not legal advice. You are responsible for the
          confidentiality of anything you enter. Verify anything time sensitive.
        </p>
      </main>
    </div>
  );
}
