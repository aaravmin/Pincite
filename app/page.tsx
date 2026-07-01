import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingHome } from "@/components/marketing/marketing-home";

// A signed-in visitor skips the landing and goes straight to their dashboard.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <MarketingHome />;
}
