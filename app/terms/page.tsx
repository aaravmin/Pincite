import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Terms of Service - Pincite",
  description: "The terms that govern your use of Pincite.",
};

const CONTACT_EMAIL = "aarav.minocha@gmail.com";
const UPDATED = "June 29, 2026";

export default function TermsPage() {
  return (
    <div className="flex flex-1 flex-col bg-background px-6 py-14">
      <main className="mx-auto w-full max-w-2xl">
        <Link href="/" className="inline-block">
          <Logo className="h-9 w-auto" />
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <section className="space-y-3">
            <p>
              These terms govern your use of Pincite. By creating an account or using the service, you
              agree to them. If you do not agree, do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">What Pincite is, and is not</h2>
            <p>
              Pincite is a legal research and review aid that flags potential rule issues in a patent
              draft, surfaces applicable rules, and finds similar public patents, each pinned to a
              source you can verify. It is{" "}
              <span className="font-medium">not legal advice</span>, not a substitute for a licensed
              patent attorney or agent, and not a drafting or filing service. Using Pincite does not
              create an attorney-client relationship. Pincite never files anything with the USPTO on
              your behalf.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Your responsibilities</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                You are responsible for the confidentiality of everything you enter and for having the
                authority to process it. Do not paste matter you are not authorized to handle.
              </li>
              <li>
                You are responsible for verifying every finding, rule, and similarity result against
                its cited source before relying on it. These are research signals, not conclusions
                about validity, patentability, or freedom to operate.
              </li>
              <li>
                You must keep your account secure and use the service lawfully and only as intended.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">No warranty</h2>
            <p>
              The service is provided &quot;as is&quot; and &quot;as available,&quot; without
              warranties of any kind. We do not warrant that findings are complete or error-free, or
              that the service will be uninterrupted. Automated analysis can miss issues and can flag
              issues that are not real.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Pincite and its operator are not liable for any
              indirect, incidental, or consequential damages, or for any loss arising from your
              reliance on the service, including any patent prosecution outcome. Your use of the
              service is at your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Termination and changes</h2>
            <p>
              You may stop using the service and delete your account at any time. We may suspend or end
              access that violates these terms, and we may update these terms, revising the date above
              when we do. Continued use after a change means you accept it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a className="font-medium underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          &middot;{" "}
          <Link href="/" className="underline">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}
