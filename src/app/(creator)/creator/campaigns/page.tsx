import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CampaignsClient } from "./_components/campaigns-client";

export default async function CampaignsPage() {
  const { userId } = await requireAuth("creator");

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser!.id },
    select: { creatorProfile: { select: { id: true } } },
  });

  const creatorProfileId = user?.creatorProfile?.id;

  // Fetch marketplace campaigns
  const marketplaceCampaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      description: true,
      creatorCpv: true,
      totalBudget: true,
      platform: true,
      contentType: true,
      niche: true,
      bannerUrl: true,
      advertiser: {
        select: { brandName: true },
      },
      campaignSubmissions: {
        select: { earnedAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch "my campaigns" — campaigns the creator has applied to
  const myCampaignApplications = creatorProfileId
    ? await prisma.campaignApplication.findMany({
        where: { creatorProfileId },
        select: {
          id: true,
          status: true,
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              creatorCpv: true,
              totalBudget: true,
              platform: true,
              contentType: true,
              niche: true,
              bannerUrl: true,
              advertiser: {
                select: { brandName: true },
              },
              campaignSubmissions: {
                select: { earnedAmount: true },
              },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      })
    : [];

  // Transform data for client
  const marketplace = marketplaceCampaigns.map((c) => {
    const totalPaid = c.campaignSubmissions.reduce(
      (sum, s) => sum + Number(s.earnedAmount),
      0
    );
    return {
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      rewardRate: Number(c.creatorCpv) * 1000,
      totalBudget: Number(c.totalBudget),
      totalPaid,
      platform: c.platform,
      contentType: c.contentType ?? "UGC",
      niche: c.niche ?? null,
      brandName: c.advertiser?.brandName ?? "Unknown",
      bannerUrl: c.bannerUrl ?? null,
    };
  });

  const myCampaigns = myCampaignApplications.map((a) => {
    const c = a.campaign;
    const totalPaid = c.campaignSubmissions.reduce(
      (sum, s) => sum + Number(s.earnedAmount),
      0
    );
    return {
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      rewardRate: Number(c.creatorCpv) * 1000,
      totalBudget: Number(c.totalBudget),
      totalPaid,
      platform: c.platform,
      contentType: c.contentType ?? "UGC",
      niche: c.niche ?? null,
      brandName: c.advertiser?.brandName ?? "Unknown",
      bannerUrl: c.bannerUrl ?? null,
      applicationId: a.id,
    };
  });

  return <CampaignsClient marketplace={marketplace} myCampaigns={myCampaigns} />;
}
