import { MarketingNav } from "@/components/marketing/nav";
import { MarketingMotion } from "@/components/marketing/motion-provider";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { SectionStake } from "@/components/marketing/section-stake";
import { SectionWorkflow } from "@/components/marketing/section-workflow";
import { SectionOnePlace } from "@/components/marketing/section-one-place";
import { SectionTrust } from "@/components/marketing/section-trust";

// The public landing page body. Rendered at `/` for signed-out visitors and at
// `/home` for signed-in users who click the wordmark to revisit the homepage.
export function MarketingHome() {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNav />
      <MarketingMotion>
        <main className="flex-1">
          <Hero />
          <SectionStake />
          <SectionWorkflow />
          <SectionOnePlace />
          <SectionTrust />
        </main>
      </MarketingMotion>
      <MarketingFooter />
    </div>
  );
}
