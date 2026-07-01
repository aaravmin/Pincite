import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Privacy Policy - Pincite",
  description: "How Pincite collects, uses, and protects your information.",
};

const CONTACT_EMAIL = "aaravmin@pincite.net";
const UPDATED = "June 29, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col bg-background px-6 py-14">
      <main className="mx-auto w-full max-w-2xl">
        <Link href="/" className="inline-block">
          <Logo className="h-9 w-auto" />
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <section className="space-y-3">
            <p>
              Pincite is an active patent review dashboard. It catches rule violations in a draft,
              surfaces applicable rules, and finds similar public patents, each pinned to its source.
              This policy explains what we collect, why, and how we protect it. Pincite is a research
              and review aid, not legal advice and not a filing service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Account information.</span> When you sign in with Google
                or with email and password, we receive your email address and basic profile
                information to create and secure your account.
              </li>
              <li>
                <span className="font-medium">Content you enter.</span> The patent text, application
                details, inventor and applicant information, and any documents or drawings you upload
                so the dashboard can review them.
              </li>
              <li>
                <span className="font-medium">Usage and audit records.</span> Timestamps, the actions
                you take, and request metadata such as IP address, kept as an append-only audit log so
                changes to your work are traceable.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">How we use your information</h2>
            <p>
              We use your information only to provide and operate the service: to authenticate you, to
              run rule checks and prior-art searches on the content you submit, to save versioned and
              exportable sessions, to keep an audit trail, and to maintain security. We do not sell
              your information, and we do not use your content for advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Service providers</h2>
            <p>
              We share information with a small set of processors strictly to deliver the service:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Supabase</span> for database, authentication, and file
                storage, hosted in a United States region with encryption in transit and at rest and
                per-user isolation.
              </li>
              <li>
                <span className="font-medium">Google</span> for sign-in, and for prior-art lookups
                against the public Google Patents and BigQuery public patent datasets.
              </li>
              <li>
                <span className="font-medium">AI providers (xAI and Voyage AI)</span> to analyze and
                index the text you submit for rule checks and semantic search. We configure
                United-States processing and pursue zero-data-retention with these vendors. You remain
                responsible for the confidentiality of anything you enter, and you should not submit
                matter you are not authorized to process.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Data location, security, and retention</h2>
            <p>
              Your data is stored in the United States, encrypted in transit and at rest, and isolated
              per user through row-level security so no account can read another account&apos;s data.
              We keep your content and account data until you delete it or ask us to delete it, except
              for append-only audit records retained for integrity. Uploaded files live in a private,
              access-controlled store and are never made public.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Your choices and rights</h2>
            <p>
              You can access, correct, export, or delete your projects from within the app, and you can
              request deletion of your account and associated data by contacting us. Authentication
              cookies are used only to keep you signed in; we do not use third-party advertising or
              tracking cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Children</h2>
            <p>
              Pincite is intended for professional use and is not directed to children under 16, and we
              do not knowingly collect their information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Changes and contact</h2>
            <p>
              We may update this policy and will revise the date above when we do. Questions or requests
              about your data can be sent to{" "}
              <a className="font-medium underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          <Link href="/terms" className="underline">
            Terms of Service
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
