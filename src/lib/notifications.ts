/**
 * Legacy entry point — preserved for backwards compatibility.
 *
 * The real implementation lives in `src/lib/notifications/dispatcher.ts`.
 * This file is kept so existing call sites (`@/lib/notifications`) keep
 * working unchanged. New code should import from
 * `@/lib/notifications/dispatcher` directly.
 */

import { NotificationType } from "@prisma/client";
import { dispatchNotification } from "./notifications/dispatcher";

export { NotificationType };
export {
  dispatchNotification,
  retryFailedDeliveries,
} from "./notifications/dispatcher";

/**
 * Typed wrappers preserved from the previous in-app-only implementation.
 * Keeps existing call sites compiling.
 */
export interface NotificationData {
  CAMPAIGN_LAUNCHED: { campaignId: string; campaignName: string };
  SUBMISSION_APPROVED: { submissionId: string; campaignName: string; earnedAmount?: number };
  SUBMISSION_REJECTED: { submissionId: string; campaignName: string; rejectionNote?: string };
  APPLICATION_APPROVED: { applicationId: string; campaignName: string };
  APPLICATION_REJECTED: { applicationId: string; campaignName: string };
  BIO_VERIFIED: { igUsername: string };
  PAYOUT_SENT: { payoutId: string; amount: number };
}

export async function createNotification<T extends keyof NotificationData>(
  userId: string,
  type: T,
  data: NotificationData[T],
): Promise<void> {
  await dispatchNotification(
    userId,
    type as unknown as NotificationType,
    data as unknown as Record<string, unknown>,
  );
}
