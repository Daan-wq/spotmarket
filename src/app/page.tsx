import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import type { CampaignCardData } from "@/types/campaign-card";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { role: true },
    });
    const role = user?.role;
    if (role === "admin") redirect("/admin");
    if (role === "creator") redirect("/dashboard");
    if (role === "network") redirect("/network/dashboard");
    redirect("/onboarding");
  }

  const campaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const campaignCards: CampaignCardData[] = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    company: "Campaign",
    companyInitial: c.name.slice(0, 2).toUpperCase(),
    description: c.description ?? "",
    totalBudget: Number(c.totalBudget),
    currency: "€",
    cpvLabel: `~$${(Number(c.creatorCpv) * 1_000_000).toFixed(0)}/1M views`,
    geo: c.targetGeo,
    daysLeft: Math.max(0, Math.ceil((c.deadline.getTime() - Date.now()) / 86400000)),
    applicants: c._count.applications,
    maxApplicants: c.maxSlots ?? 100,
    minFollowers: c.minFollowers,
  }));

  return <MarketplaceShell campaigns={campaignCards} />;
}
