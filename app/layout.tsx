import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Baloo_2 } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";
import { OutputSanitizer } from "@/components/output-sanitizer";
import { Toaster } from "@/components/ui/sonner";
import { isDemoMode } from "@/shared/demo/mode";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif display face (kept for the app's big numbers).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// Rounded display face for the marketing headlines, matching the Pincite wordmark
// and the demo video (Baloo 2).
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pincite",
  description: "Cited answers to patent procedure questions from the real MPEP text.",
  // Google Search Console domain verification (for OAuth consent screen ownership).
  verification: {
    google: "gsyHMXdf2b_FY2DV_N07n2cGykh4ZwTFHoV2bJ464HY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Demo mode (no Supabase configured): a persistent banner, and a data-demo marker that
  // lets app/globals.css shift full-height screens and sticky rails below it.
  const demo = isDemoMode();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${baloo.variable} h-full antialiased`}
      data-demo={demo ? "" : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {demo && <DemoBanner />}
        {/* Apply the saved (or system) theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('pincite-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');}}catch(e){}})();",
          }}
        />
        <OutputSanitizer />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
