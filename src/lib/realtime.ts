import { createSupabaseAdminClient } from "./supabase/admin";

export const REALTIME_EVENTS = {
  APPLICATION_APPROVED: "application:approved",
  APPLICATION_REJECTED: "application:rejected",
  NEW_MESSAGE: "message:new",
  FRAUD_ALERT: "fraud:alert",
  CAMPAIGN_COMPLETED: "campaign:completed",
} as const;

export const realtimeChannel = {
  campaign: (campaignId: string) => `campaign-${campaignId}`,
  userNotifications: (supabaseId: string) => `user-notifications-${supabaseId}`,
  adminAlerts: () => "admin-alerts",
};

/**
 * Broadcast an event to a Supabase Realtime channel (server-side).
 * Uses the service-role client — no auth needed for broadcast.
 */
export async function broadcast(
  channel: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const ch = supabase.channel(channel);

  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event, payload }).then(() => {
          supabase.removeChannel(ch);
          resolve();
        });
      }
    });
  });
}
