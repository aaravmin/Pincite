import { redirect } from "next/navigation";
import { getViewer } from "@/shared/auth/require-viewer";
import { MarketingHome } from "@/components/marketing/marketing-home";

// A signed-in visitor skips the landing and goes straight to their dashboard.
export const dynamic = "force-dynamic";

export default async function Home() {
  if (await getViewer()) redirect("/dashboard");

  return <MarketingHome />;
}
