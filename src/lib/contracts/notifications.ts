/**
 * Notification routing contracts.
 *
 * Owner: E. Consumers: A/B/C/D may publish events that E maps to notifications.
 *
 * Existing `NotificationType` (Prisma enum) is the authoritative list of types.
 * This file declares the channel routing types that E uses.
 */

export type NotificationChannel = "IN_APP" | "EMAIL" | "DISCORD";

/**
 * Default channel routing per notification type.
 * E reads this when no `NotificationRule` exists for the user/type pair.
 */
export const DEFAULT_CHANNELS: Record<string, NotificationChannel[]> = {
  // Existing
  CAMPAIGN_LAUNCHED: ["IN_APP", "EMAIL"],
  SUBMISSION_APPROVED: ["IN_APP", "EMAIL"],
  SUBMISSION_REJECTED: ["IN_APP", "EMAIL"],
  APPLICATION_APPROVED: ["IN_APP", "EMAIL"],
  APPLICATION_REJECTED: ["IN_APP", "EMAIL"],
  DEMOGRAPHICS_VERIFIED: ["IN_APP"],
  DEMOGRAPHICS_REJECTED: ["IN_APP"],
  BIO_VERIFIED: ["IN_APP"],
  PAYOUT_SENT: ["IN_APP", "EMAIL"],
  REFERRAL_EARNED: ["IN_APP"],
  EARNINGS_CREDITED: ["IN_APP"],
  WITHDRAWAL_PROCESSED: ["IN_APP", "EMAIL"],
  // New (foundation)
  PERFORMANCE_VIRAL: ["IN_APP", "EMAIL", "DISCORD"],
  PERFORMANCE_UNDERPERFORM: ["IN_APP"],
  EARNINGS_MILESTONE: ["IN_APP"],
  SIGNAL_FLAGGED: ["IN_APP", "DISCORD"], // admin alert
  TOKEN_BROKEN: ["IN_APP", "EMAIL"],
};

export interface NotificationRecipient {
  userId: string;
  email: string;
  discordId: string | null;
}

/** Payload E receives via the bus → maps to a Notification + channel fan-out. */
export interface NotificationDispatchInput {
  recipientUserId: string;
  type: string; // NotificationType enum value
  data: Record<string, unknown>;
}
