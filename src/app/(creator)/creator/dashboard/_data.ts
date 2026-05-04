import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface CreatorPayoutTotals {
  totalEarnings: number;
  totalPaid: number;
  availableBalance: number;
  hasUnpaidBalance: boolean;
}

export const getCreatorPayoutTotals = cache(
  async (userId: string): Promise<CreatorPayoutTotals> => {
    const [earningsResult, paidResult] = await Promise.all([
      prisma.campaignSubmission.aggregate({
        where: { creatorId: userId, status: "APPROVED" },
        _sum: { earnedAmount: true },
      }),
      prisma.payout.aggregate({
        where: {
          creatorProfile: { userId },
          status: { in: ["confirmed", "sent"] },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalEarnings = Number(earningsResult._sum.earnedAmount || 0);
    const totalPaid = Number(paidResult._sum.amount || 0);
    const availableBalance = Math.max(totalEarnings - totalPaid, 0);

    return {
      totalEarnings,
      totalPaid,
      availableBalance,
      hasUnpaidBalance: availableBalance > 0,
    };
  },
);

export const getCreatorPendingCount = cache(async (userId: string) => {
  return prisma.campaignSubmission.count({
    where: { creatorId: userId, status: "PENDING" },
  });
});

export interface PlatformVerification {
  connectedCount: number;
  verifiedCount: number;
  allVerified: boolean;
}

export const getCreatorPlatformVerification = cache(
  async (profileId: string): Promise<PlatformVerification> => {
    const [ig, fb, yt, tt] = await Promise.all([
      prisma.creatorIgConnection.findMany({
        where: { creatorProfileId: profileId },
        select: { isVerified: true },
      }),
      prisma.creatorFbConnection.findMany({
        where: { creatorProfileId: profileId },
        select: { isVerified: true },
      }),
      prisma.creatorYtConnection.findMany({
        where: { creatorProfileId: profileId },
        select: { isVerified: true },
      }),
      prisma.creatorTikTokConnection.findMany({
        where: { creatorProfileId: profileId },
        select: { isVerified: true },
      }),
    ]);

    const platforms = [
      { connected: ig.length > 0, verified: ig.some((c) => c.isVerified) },
      { connected: fb.length > 0, verified: fb.some((c) => c.isVerified) },
      { connected: yt.length > 0, verified: yt.some((c) => c.isVerified) },
      { connected: tt.length > 0, verified: tt.some((c) => c.isVerified) },
    ];
    const connectedCount = platforms.filter((p) => p.connected).length;
    const verifiedCount = platforms.filter((p) => p.verified).length;

    return {
      connectedCount,
      verifiedCount,
      allVerified: connectedCount > 0 && verifiedCount === connectedCount,
    };
  },
);

export const getCreatorActiveCampaigns = cache(async (profileId: string) => {
  return prisma.campaignApplication.findMany({
    where: {
      creatorProfileId: profileId,
      status: { in: ["pending", "approved", "active"] },
    },
    select: {
      id: true,
      status: true,
      campaign: {
        select: {
          id: true,
          name: true,
          deadline: true,
          creatorCpv: true,
          platform: true,
        },
      },
    },
    orderBy: { appliedAt: "desc" },
    take: 4,
  });
});
