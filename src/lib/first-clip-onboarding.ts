import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type FirstClipStep =
  | "discord"
  | "connect_account"
  | "join_campaign"
  | "submit_clip"
  | "done";

export interface FirstClipOnboardingStatus {
  discordConnected: boolean;
  accountConnected: boolean;
  hasJoinedCampaign: boolean;
  firstClipSubmitted: boolean;
  joinedApplicationId: string | null;
  nextStep: FirstClipStep;
  nextHref: string;
}

export interface FirstClipOnboardingStatusInput {
  discordConnected: boolean;
  accountConnected: boolean;
  joinedApplicationId: string | null;
  firstClipSubmitted: boolean;
}

export function buildFirstClipOnboardingStatus({
  discordConnected,
  accountConnected,
  joinedApplicationId,
  firstClipSubmitted,
}: FirstClipOnboardingStatusInput): FirstClipOnboardingStatus {
  const hasJoinedCampaign = Boolean(joinedApplicationId);

  if (firstClipSubmitted) {
    return {
      discordConnected,
      accountConnected,
      hasJoinedCampaign,
      firstClipSubmitted,
      joinedApplicationId,
      nextStep: "done",
      nextHref: "/creator/videos",
    };
  }

  if (!discordConnected) {
    return {
      discordConnected,
      accountConnected,
      hasJoinedCampaign,
      firstClipSubmitted,
      joinedApplicationId,
      nextStep: "discord",
      nextHref: `/api/auth/discord?return_to=${encodeURIComponent("/creator/campaigns?firstClip=1")}`,
    };
  }

  if (!accountConnected) {
    return {
      discordConnected,
      accountConnected,
      hasJoinedCampaign,
      firstClipSubmitted,
      joinedApplicationId,
      nextStep: "connect_account",
      nextHref: "/creator/connections?firstClip=1",
    };
  }

  if (!hasJoinedCampaign) {
    return {
      discordConnected,
      accountConnected,
      hasJoinedCampaign,
      firstClipSubmitted,
      joinedApplicationId,
      nextStep: "join_campaign",
      nextHref: "/creator/campaigns?firstClip=1",
    };
  }

  return {
    discordConnected,
    accountConnected,
    hasJoinedCampaign,
    firstClipSubmitted,
    joinedApplicationId,
    nextStep: "submit_clip",
    nextHref: `/creator/applications/${joinedApplicationId}/submit?firstClip=1`,
  };
}

export const getFirstClipOnboardingStatus = cache(
  async (userId: string, now = new Date()): Promise<FirstClipOnboardingStatus> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        discordId: true,
        creatorProfile: { select: { id: true } },
      },
    });
    const creatorProfileId = user?.creatorProfile?.id ?? null;

    if (!user || !creatorProfileId) {
      return buildFirstClipOnboardingStatus({
        discordConnected: false,
        accountConnected: false,
        joinedApplicationId: null,
        firstClipSubmitted: false,
      });
    }

    const [igCount, fbCount, ytCount, ttCount, firstClipCount, joinedApplication] =
      await Promise.all([
        prisma.creatorIgConnection.count({
          where: { creatorProfileId, isVerified: true },
        }),
        prisma.creatorFbConnection.count({
          where: { creatorProfileId, isVerified: true },
        }),
        prisma.creatorYtConnection.count({
          where: { creatorProfileId, isVerified: true },
        }),
        prisma.creatorTikTokConnection.count({
          where: { creatorProfileId, isVerified: true },
        }),
        prisma.campaignSubmission.count({
          where: { creatorId: userId },
        }),
        prisma.campaignApplication.findFirst({
          where: {
            creatorProfileId,
            campaign: {
              status: "active",
              deadline: { gte: startOfDay(now) },
            },
          },
          select: { id: true },
          orderBy: { appliedAt: "desc" },
        }),
      ]);

    return buildFirstClipOnboardingStatus({
      discordConnected: Boolean(user.discordId),
      accountConnected: igCount + fbCount + ytCount + ttCount > 0,
      joinedApplicationId: joinedApplication?.id ?? null,
      firstClipSubmitted: firstClipCount > 0,
    });
  },
);

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
