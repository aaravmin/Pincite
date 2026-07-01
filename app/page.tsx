import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingMotion } from "@/components/marketing/motion-provider";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { SectionStake } from "@/components/marketing/section-stake";
import { SectionTrace } from "@/components/marketing/section-trace";
import { SectionOnePlace } from "@/components/marketing/section-one-place";
import { SectionWorkflow } from "@/components/marketing/section-workflow";
import { SectionTrust } from "@/components/marketing/section-trust";
import { SectionAudience } from "@/components/marketing/section-audience";

// A signed-in visitor skips the landing and goes straight to their dashboard.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <MarketingNav />
      <MarketingMotion>
        <main className="flex-1">
          <Hero />
          <SectionStake />
          <SectionTrace />
          <SectionOnePlace />
          <SectionWorkflow />
          <SectionTrust />
          <SectionAudience />
        </main>
      </MarketingMotion>
      <MarketingFooter />
    </div>
  );
}
