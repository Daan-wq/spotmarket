import { prisma } from "./prisma";
import { createNotification, NotificationData } from "./notifications";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "./realtime";
import { notifyReviewOutcome } from "./discord";
import {
  ApplicationStatus,
  SubmissionStatus,
  VerificationStatus,
} from "@prisma/client";

export type Decision = "APPROVE" | "REJECT";

type ReviewableType = keyof Pick<
  NotificationData,
  | "SUBMISSION_APPROVED"
  | "SUBMISSION_REJECTED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "DEMOGRAPHICS_VERIFIED"
  | "DEMOGRAPHICS_REJECTED"
>;

interface NotifyArgs<T extends ReviewableType = ReviewableType> {
  creatorUserId: string;             // prisma User.id
  creatorSupabaseId: string | null;  // for Realtime channel
  creatorDiscordId: string | null;
  decision: Decision;
  notificationType: T;
  notificationData: NotificationData[T];
  realtimeEvent: string;
  discordLabel: string;
  discordReference?: string;
  earnedAmount?: number;
  rejectionNote?: string;
}

/**
 * Shared notifier — every per-kind reviewer calls this so creators get
 * the same in-app notification + Realtime event + Discord DM regardless
 * of submission type.
 */
async function notifyReviewed<T extends ReviewableType>(args: NotifyArgs<T>): Promise<void> {
  await createNotification(args.creatorUserId, args.notificationType, args.notificationData);

  if (args.creatorSupabaseId) {
    broadcast(
      realtimeChannel.userNotifications(args.creatorSupabaseId),
      args.realtimeEvent,
      { type: args.notificationType, ...(args.notificationData as Record<string, unknown>) }
    ).catch((err) => console.error("[review-notifier realtime]", err));
  }

  notifyReviewOutcome({
    creatorDiscordId: args.creatorDiscordId,
    status: args.decision === "APPROVE" ? "APPROVED" : "REJECTED",
    label: args.discordLabel,
    reference: args.discordReference,
    earnedAmount: args.earnedAmount,
    rejectionNote: args.rejectionNote,
  }).catch((err) => console.error("[review-notifier discord]", err));
}

// ─────────────────────────────────────────
// VIDEO SUBMISSION (CampaignSubmission)
// Note: video approvals also need referral-payout + baseline-views
// math which lives in the API route. This service only fires the
// notification side-effects after the route has done its DB work.
// ─────────────────────────────────────────

export async function notifyVideoSubmissionReviewed(args: {
  submissionId: string;
  creatorUserId: string;
  creatorSupabaseId: string | null;
  creatorDiscordId: string | null;
  campaignName: string;
  decision: Decision;
  earnedAmount?: number;
  rejectionNote?: string;
}): Promise<void> {
  await notifyReviewed({
    creatorUserId: args.creatorUserId,
    creatorSupabaseId: args.creatorSupabaseId,
    creatorDiscordId: args.creatorDiscordId,
    decision: args.decision,
    notificationType: args.decision === "APPROVE" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
    notificationData:
      args.decision === "APPROVE"
        ? {
            submissionId: args.submissionId,
            campaignName: args.campaignName,
            earnedAmount: args.earnedAmount,
          }
        : {
            submissionId: args.submissionId,
            campaignName: args.campaignName,
            rejectionNote: args.rejectionNote,
          },
    realtimeEvent:
      args.decision === "APPROVE"
        ? REALTIME_EVENTS.SUBMISSION_APPROVED
        : REALTIME_EVENTS.SUBMISSION_REJECTED,
    discordLabel: "submission",
    discordReference: args.campaignName,
    earnedAmount: args.earnedAmount,
    rejectionNote: args.rejectionNote,
  });
}

// ─────────────────────────────────────────
// TIKTOK DEMOGRAPHICS REVIEW
// ─────────────────────────────────────────

export async function reviewDemographicsSubmission(args: {
  submissionId: string;
  decision: Decision;
  reason?: string;
  reviewerSupabaseId: string;
}): Promise<void> {
  if (args.decision === "REJECT" && !args.reason?.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const submission = await prisma.tikTokDemographicSubmission.findUnique({
    where: { id: args.submissionId },
    include: {
      connection: {
        select: {
          username: true,
          creatorProfile: {
            select: {
              user: { select: { id: true, supabaseId: true, discordId: true } },
            },
          },
        },
      },
    },
  });

  if (!submission) throw new Error("Submission not found");
  if (submission.status !== "PENDING") {
    throw new Error(`Submission already ${submission.status.toLowerCase()}`);
  }

  const tiktokHandle = submission.connection.username;
  const creator = submission.connection.creatorProfile.user;

  await prisma.tikTokDemographicSubmission.update({
    where: { id: args.submissionId },
    data: {
      status: args.decision === "APPROVE" ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
      reviewNotes: args.decision === "REJECT" ? args.reason!.trim() : null,
      reviewedBy: args.reviewerSupabaseId,
      reviewedAt: new Date(),
    },
  });

  await notifyReviewed({
    creatorUserId: creator.id,
    creatorSupabaseId: creator.supabaseId,
    creatorDiscordId: creator.discordId,
    decision: args.decision,
    notificationType: args.decision === "APPROVE" ? "DEMOGRAPHICS_VERIFIED" : "DEMOGRAPHICS_REJECTED",
    notificationData:
      args.decision === "APPROVE"
        ? { submissionId: args.submissionId, tiktokHandle }
        : { submissionId: args.submissionId, tiktokHandle, rejectionNote: args.reason },
    realtimeEvent:
      args.decision === "APPROVE"
        ? REALTIME_EVENTS.DEMOGRAPHICS_VERIFIED
        : REALTIME_EVENTS.DEMOGRAPHICS_REJECTED,
    discordLabel: "TikTok demographics",
    discordReference: `@${tiktokHandle}`,
    rejectionNote: args.reason,
  });
}

// ─────────────────────────────────────────
// CAMPAIGN APPLICATION (join request) REVIEW
// ─────────────────────────────────────────

export async function reviewCampaignApplication(args: {
  applicationId: string;
  decision: Decision;
  reason?: string;
  reviewerSupabaseId: string;
}): Promise<void> {
  if (args.decision === "REJECT" && !args.reason?.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const application = await prisma.campaignApplication.findUnique({
    where: { id: args.applicationId },
    include: {
      campaign: { select: { name: true } },
      creatorProfile: {
        select: {
          user: { select: { id: true, supabaseId: true, discordId: true } },
        },
      },
    },
  });

  if (!application) throw new Error("Application not found");
  if (application.status !== ApplicationStatus.pending) {
    throw new Error(`Application already ${application.status}`);
  }
  if (!application.creatorProfile) {
    throw new Error("Application has no creator profile attached");
  }

  const creator = application.creatorProfile.user;
  const campaignName = application.campaign.name;

  await prisma.campaignApplication.update({
    where: { id: args.applicationId },
    data: {
      status: args.decision === "APPROVE" ? ApplicationStatus.approved : ApplicationStatus.rejected,
      reviewNotes: args.decision === "REJECT" ? args.reason!.trim() : null,
      reviewedBy: args.reviewerSupabaseId,
      reviewedAt: new Date(),
    },
  });

  await notifyReviewed({
    creatorUserId: creator.id,
    creatorSupabaseId: creator.supabaseId,
    creatorDiscordId: creator.discordId,
    decision: args.decision,
    notificationType: args.decision === "APPROVE" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
    notificationData:
      args.decision === "APPROVE"
        ? { applicationId: args.applicationId, campaignName }
        : { applicationId: args.applicationId, campaignName, rejectionNote: args.reason },
    realtimeEvent:
      args.decision === "APPROVE"
        ? REALTIME_EVENTS.APPLICATION_APPROVED
        : REALTIME_EVENTS.APPLICATION_REJECTED,
    discordLabel: "campaign join request",
    discordReference: campaignName,
    rejectionNote: args.reason,
  });
}

// Re-export for callers that just want the notifier directly (e.g. existing
// video review route which already does its own DB writes).
export { notifyReviewed };
export type { SubmissionStatus };
