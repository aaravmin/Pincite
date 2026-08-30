import { MarketingHome } from "@/components/marketing/marketing-home";

// The homepage, reachable by signed-in users via the wordmark. Unlike `/`, it
// never redirects to the dashboard, so clicking Pincite always lands here.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <MarketingHome />;
}
