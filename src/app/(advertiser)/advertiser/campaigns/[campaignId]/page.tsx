import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignDetailClient } from "./_components/campaign-detail-client";

interface CampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignDetailPage({ params: paramsPromise }: CampaignDetailPageProps) {
  const params = await paramsPromise;
  const { userId } = await requireAuth("advertiser");

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    include: {
      advertiser: true,
      _count: {
        select: { applications: true },
      },
    },
  });

  if (!campaign) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--error)" }}>Campaign not found.</p>
      </div>
    );
  }

  // Verify advertiser ownership
  const advertiser = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { advertiserProfile: { select: { id: true } } },
  });

  if (!advertiser?.advertiserProfile || campaign.advertiserId !== advertiser.advertiserProfile.id) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--error)" }}>Unauthorized</p>
      </div>
    );
  }

  const applications = await prisma.campaignApplication.findMany({
    where: { campaignId: params.campaignId },
    include: {
      creatorProfile: {
        select: {
          displayName: true,
          totalFollowers: true,
          igConnections: {
            select: { igUsername: true },
            where: { isVerified: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  const submissions = await prisma.campaignSubmission.findMany({
    where: { campaignId: params.campaignId },
    include: {
      application: {
        select: {
          creatorProfile: {
            select: { displayName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get spent amount and total views
  const spentResult = await prisma.campaignSubmission.aggregate({
    where: {
      campaignId: params.campaignId,
      status: "APPROVED",
    },
    _sum: { earnedAmount: true },
  });

  const viewsResult = await prisma.campaignSubmission.aggregate({
    where: {
      campaignId: params.campaignId,
      status: "APPROVED",
    },
    _sum: { claimedViews: true },
  });

  const spentAmount = Number(spentResult._sum.earnedAmount ?? 0);
  const totalViews = viewsResult._sum.claimedViews ?? 0;

  // Serialize Prisma Decimal/BigInt types for client component
  const serialized = JSON.parse(JSON.stringify({ campaign, applications, submissions }, (_k, v) =>
    typeof v === "bigint" ? Number(v) : v
  ));

  return (
    <CampaignDetailClient
      campaign={serialized.campaign}
      applications={serialized.applications}
      submissions={serialized.submissions}
      spentAmount={spentAmount}
      totalViews={totalViews}
    />
  );
}
