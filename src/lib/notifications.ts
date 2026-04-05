import { prisma } from "./prisma";
import { NotificationType } from "@prisma/client";

export { NotificationType };

export interface NotificationData {
  CAMPAIGN_LAUNCHED: { campaignId: string; campaignName: string };
  SUBMISSION_APPROVED: { submissionId: string; campaignName: string; earnedAmount?: number };
  SUBMISSION_REJECTED: { submissionId: string; campaignName: string; rejectionNote?: string };
  APPLICATION_APPROVED: { applicationId: string; campaignName: string };
  APPLICATION_REJECTED: { applicationId: string; campaignName: string };
  BIO_VERIFIED: { igUsername: string };
  PAYOUT_SENT: { payoutId: string; amount: number };
}

export async function createNotification<T extends NotificationType>(
  userId: string,
  type: T,
  data: NotificationData[T]
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, data: data as object },
  });
}
