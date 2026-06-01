import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";

export interface CreatorPayoutTotals {
  totalEarnings: number;
  totalPaid: number;
  pendingBalance: number;
  profit: number;
  availableBalance: number;
  hasUnpaidBalance: boolean;
}

export const getCreatorPayoutTotals = cache(
  async (userId: string): Promise<CreatorPayoutTotals> => {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      return {
        totalEarnings: 0,
        totalPaid: 0,
        pendingBalance: 0,
        profit: 0,
        availableBalance: 0,
        hasUnpaidBalance: false,
      };
    }

    const summary = await getCreatorPaymentSummary(userId, profile.id);

    return {
      totalEarnings: summary.totalEarned,
      totalPaid: summary.totalPaid,
      pendingBalance: summary.pendingPayout,
      profit: summary.profit,
      availableBalance: summary.availableBalance,
      hasUnpaidBalance: summary.availableBalance > 0,
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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return prisma.campaignApplication.findMany({
    where: {
      creatorProfileId: profileId,
      status: { in: ["pending", "approved", "active"] },
      campaign: {
        status: "active",
        deadline: { gte: startOfToday },
      },
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
          platforms: true,
        },
      },
    },
    orderBy: { appliedAt: "desc" },
    take: 4,
  });
});
