import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type ActivationStep =
  | "profileComplete"
  | "accountConnected"
  | "paymentMethodAdded"
  | "firstClipSubmitted"
  | "firstApproval";

export interface ActivationStatus {
  profileComplete: boolean;
  accountConnected: boolean;
  paymentMethodAdded: boolean;
  firstClipSubmitted: boolean;
  firstApproval: boolean;
  /** Steps still incomplete, in recommended order. */
  pending: ActivationStep[];
  /** Number of steps completed (0..5). */
  completedCount: number;
  totalSteps: number;
  /** True when every step is complete. */
  fullyActivated: boolean;
  /** The single step the user should do next, or null if fully activated. */
  nextStep: ActivationStep | null;
}

const STEP_ORDER: ActivationStep[] = [
  "profileComplete",
  "accountConnected",
  "paymentMethodAdded",
  "firstClipSubmitted",
  "firstApproval",
];

/**
 * Per-request cached activation status for a user (by internal User.id).
 * Reads CreatorProfile, OAuth connections, and submissions in parallel.
 */
export const getActivationStatus = cache(
  async (userId: string): Promise<ActivationStatus> => {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        displayName: true,
        walletAddress: true,
        tronsAddress: true,
        stripeAccountId: true,
      },
    });

    if (!profile) {
      return buildStatus({
        profileComplete: false,
        accountConnected: false,
        paymentMethodAdded: false,
        firstClipSubmitted: false,
        firstApproval: false,
      });
    }

    const [igCount, fbCount, ytCount, ttCount, submissionCount, approvedCount] =
      await Promise.all([
        prisma.creatorIgConnection.count({
          where: { creatorProfileId: profile.id, isVerified: true },
        }),
        prisma.creatorFbConnection.count({
          where: { creatorProfileId: profile.id, isVerified: true },
        }),
        prisma.creatorYtConnection.count({
          where: { creatorProfileId: profile.id, isVerified: true },
        }),
        prisma.creatorTikTokConnection.count({
          where: { creatorProfileId: profile.id, isVerified: true },
        }),
        prisma.campaignSubmission.count({ where: { creatorId: userId } }),
        prisma.campaignSubmission.count({
          where: { creatorId: userId, status: "APPROVED" },
        }),
      ]);

    const profileComplete = Boolean(profile.displayName?.trim());
    const accountConnected = igCount + fbCount + ytCount + ttCount > 0;
    const paymentMethodAdded = Boolean(
      profile.walletAddress || profile.tronsAddress || profile.stripeAccountId,
    );
    const firstClipSubmitted = submissionCount > 0;
    const firstApproval = approvedCount > 0;

    return buildStatus({
      profileComplete,
      accountConnected,
      paymentMethodAdded,
      firstClipSubmitted,
      firstApproval,
    });
  },
);

function buildStatus(flags: {
  profileComplete: boolean;
  accountConnected: boolean;
  paymentMethodAdded: boolean;
  firstClipSubmitted: boolean;
  firstApproval: boolean;
}): ActivationStatus {
  const pending = STEP_ORDER.filter((step) => !flags[step]);
  const completedCount = STEP_ORDER.length - pending.length;
  return {
    ...flags,
    pending,
    completedCount,
    totalSteps: STEP_ORDER.length,
    fullyActivated: pending.length === 0,
    nextStep: pending[0] ?? null,
  };
}
