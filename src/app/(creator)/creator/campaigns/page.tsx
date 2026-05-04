import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Platform } from "@prisma/client";
import { CampaignsClient } from "./_components/campaigns-client";

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
        platform: true,
        platforms: true,
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
                platform: true,
                platforms: true,
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

  const verifiedPlatforms = new Set<Platform>();
  if (igConnections.length > 0) verifiedPlatforms.add("INSTAGRAM");
  if (fbConnections.length > 0) verifiedPlatforms.add("FACEBOOK");
  if (ytConnections.length > 0) verifiedPlatforms.add("YOUTUBE_SHORTS");
  if (ttConnections.length > 0) verifiedPlatforms.add("TIKTOK");

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
      platform: Platform;
      platforms: Platform[];
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
    const requiredPlatforms =
      c.platforms.length > 0 ? c.platforms : [c.platform];
    const hasPlatform = requiredPlatforms.some((p) =>
      verifiedPlatforms.has(p),
    );
    const meetsFollowers = maxFollowers >= c.minFollowers;
    const eligibility: {
      status: "eligible" | "ineligible" | "unknown";
      reason?: string;
    } = !creatorProfileId
      ? { status: "unknown" }
      : !hasPlatform
        ? {
            status: "ineligible",
            reason: `Connect ${requiredPlatforms.map(platformLabel).join(" or ")}`,
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
      platform: c.platform,
      platforms: requiredPlatforms,
      contentType: c.contentType ?? "UGC",
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

function platformLabel(p: Platform): string {
  switch (p) {
    case "INSTAGRAM":
      return "Instagram";
    case "TIKTOK":
      return "TikTok";
    case "YOUTUBE_SHORTS":
      return "YouTube";
    case "FACEBOOK":
      return "Facebook";
    case "X":
      return "X";
    case "BOTH":
      return "any platform";
    default:
      return p;
  }
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}
