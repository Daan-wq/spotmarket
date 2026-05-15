import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Platform } from "@prisma/client";
import { CampaignsClient } from "./_components/campaigns-client";
import {
  evaluateCampaignJoinEligibility,
  formatPlatformList,
} from "@/lib/campaign-eligibility";

export default async function CampaignsPage() {
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  const creatorProfileId = header?.creatorProfile?.id;

  // Pull verified-platform info + total follower count alongside campaigns so
  // the client can render eligibility badges without N additional queries.
  const [
    marketplaceCampaigns,
    myCampaignApplications,
    igConnections,
    fbConnections,
    ytConnections,
    ttConnections,
  ] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        description: true,
        creatorCpv: true,
        totalBudget: true,
        platforms: true,
        status: true,
        contentType: true,
        niche: true,
        bannerUrl: true,
        deadline: true,
        minFollowers: true,
        createdAt: true,
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
                platforms: true,
                status: true,
                contentType: true,
                niche: true,
                bannerUrl: true,
                deadline: true,
                minFollowers: true,
                createdAt: true,
                campaignSubmissions: {
                  select: { earnedAmount: true },
                },
              },
            },
          },
          orderBy: { appliedAt: "desc" },
        })
      : Promise.resolve([]),
    creatorProfileId
      ? prisma.creatorIgConnection.findMany({
          where: { creatorProfileId, isVerified: true },
          select: { followerCount: true },
        })
      : Promise.resolve([]),
    creatorProfileId
      ? prisma.creatorFbConnection.findMany({
          where: { creatorProfileId, isVerified: true },
          select: { followerCount: true },
        })
      : Promise.resolve([]),
    creatorProfileId
      ? prisma.creatorYtConnection.findMany({
          where: { creatorProfileId, isVerified: true },
          select: { subscriberCount: true },
        })
      : Promise.resolve([]),
    creatorProfileId
      ? prisma.creatorTikTokConnection.findMany({
          where: { creatorProfileId, isVerified: true },
          select: { followerCount: true },
        })
      : Promise.resolve([]),
  ]);

  const verifiedConnections = {
    instagram: igConnections.length > 0,
    facebook: fbConnections.length > 0,
    youtube: ytConnections.length > 0,
    tiktok: ttConnections.length > 0,
  };

  const maxFollowers = Math.max(
    0,
    ...igConnections.map((c) => c.followerCount ?? 0),
    ...fbConnections.map((c) => c.followerCount ?? 0),
    ...ytConnections.map((c) => c.subscriberCount ?? 0),
    ...ttConnections.map((c) => c.followerCount ?? 0),
  );

  function buildCampaign<
    T extends {
      id: string;
      name: string;
      description: string | null;
      creatorCpv: { toString(): string } | number;
      totalBudget: { toString(): string } | number;
      platforms: Platform[];
      status: string;
      contentType: string | null;
      niche: string | null;
      bannerUrl: string | null;
      deadline: Date;
      minFollowers: number;
      createdAt: Date;
      campaignSubmissions: { earnedAmount: { toString(): string } | number }[];
    },
  >(c: T, applicationId?: string) {
    const totalPaid = c.campaignSubmissions.reduce(
      (sum, s) => sum + Number(s.earnedAmount),
      0,
    );
    const requiredPlatforms = c.platforms;
    const platformEligibility = evaluateCampaignJoinEligibility(
      requiredPlatforms,
      verifiedConnections,
    );
    const meetsFollowers = maxFollowers >= c.minFollowers;
    const eligibility: {
      status: "eligible" | "ineligible" | "unknown";
      reason?: string;
    } = !creatorProfileId
      ? { status: "unknown" }
      : !platformEligibility.eligible
        ? {
            status: "ineligible",
            reason: `Connect ${formatPlatformList(platformEligibility.missingPlatformLabels)}`,
          }
        : !meetsFollowers
          ? {
              status: "ineligible",
              reason: `Need ${formatFollowers(c.minFollowers)} followers`,
            }
          : { status: "eligible" };

    return {
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      rewardRate: Number(c.creatorCpv) * 1000,
      totalBudget: Number(c.totalBudget),
      totalPaid,
      platforms: requiredPlatforms,
      status: c.status,
      contentType: c.contentType ?? null,
      niche: c.niche ?? null,
      brandName: c.name,
      bannerUrl: c.bannerUrl ?? null,
      deadlineIso: c.deadline.toISOString(),
      createdAtIso: c.createdAt.toISOString(),
      eligibility,
      applicationId,
    };
  }

  const marketplace = marketplaceCampaigns.map((c) => buildCampaign(c));
  const myCampaigns = myCampaignApplications.map((a) =>
    buildCampaign(a.campaign, a.id),
  );

  return <CampaignsClient marketplace={marketplace} myCampaigns={myCampaigns} />;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}
