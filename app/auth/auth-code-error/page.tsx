import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign-in could not be completed
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The authentication link was invalid or expired. Please try signing in
          again.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
