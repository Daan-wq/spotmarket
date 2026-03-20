import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // Authenticated users get routed to their dashboard
  if (authUser) {
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { role: true },
    });

    const role = user?.role;
    if (role === "admin") redirect("/admin");
    if (role === "business") redirect("/dashboard");
    if (role === "creator") redirect("/dashboard");
    redirect("/onboarding");
  }

  // Unauthenticated users see the public marketplace
  return <MarketplaceShell />;
}
