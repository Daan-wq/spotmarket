import { prisma } from "./prisma";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "./realtime";
import { NotificationType } from "@prisma/client";

export { NotificationType };

export interface NotificationData {
  CAMPAIGN_LAUNCHED: { campaignId: string; campaignName: string; launcherName: string; launcherUserId: string };
  NEW_FOLLOWER: { followerId: string; followerName: string; followerAvatarUrl: string | null };
  REVIEW_RECEIVED: { reviewerId: string; reviewerName: string; campaignId: string; campaignName: string; rating: number };
  AUTOPOST_PUBLISHED: { scheduledPostId: string; campaignName: string; igPermalink: string };
  AUTOPOST_FAILED: { scheduledPostId: string; campaignName: string; errorMessage: string };
  SUBMISSION_APPROVED: { submissionId: string; campaignName: string };
  SUBMISSION_FLAGGED: { submissionId: string; campaignName: string };
  BUFFER_EMPTY: { igAccountId: string; accountUsername: string; contentType: string };
  BUFFER_LOW: { igAccountId: string; accountUsername: string; contentType: string; remaining: number };
  SCHEDULE_SKIPPED: { scheduleId: string; reason: string; contentType: string };
  TOKEN_EXPIRED_PAUSED: { igAccountId: string; accountUsername: string };
}

export async function createNotification<T extends NotificationType>(
  userId: string,
  type: T,
  data: NotificationData[T]
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, type, data: data as object },
    include: { user: { select: { supabaseId: true } } },
  });

  await broadcast(
    realtimeChannel.userNotifications(notification.user.supabaseId),
    "notification:new",
    { id: notification.id, type, data, createdAt: notification.createdAt }
  );
}
