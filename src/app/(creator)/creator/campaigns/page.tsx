import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignsClient } from "./_components/campaigns-client";

export default async function CampaignsPage() {
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  const creatorProfileId = header?.creatorProfile?.id;

  // Both queries are independent — fetch in parallel
  const [marketplaceCampaigns, myCampaignApplications] = await Promise.all([
    prisma.campaign.findMany({
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
        campaignSubmissions: {
          select: { earnedAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    creatorProfileId
      ? prisma.campaignApplication.findMany({
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
                campaignSubmissions: {
                  select: { earnedAmount: true },
                },
              },
            },
          },
          orderBy: { appliedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

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
      brandName: c.name,
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
      brandName: c.name,
      bannerUrl: c.bannerUrl ?? null,
      applicationId: a.id,
    };
  });

  return <CampaignsClient marketplace={marketplace} myCampaigns={myCampaigns} />;
}
