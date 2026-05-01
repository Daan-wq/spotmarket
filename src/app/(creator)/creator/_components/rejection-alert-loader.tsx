import { prisma } from "@/lib/prisma";
import { RejectionAlertDialog } from "./rejection-alert-dialog";

const REJECTION_TYPES = ["SUBMISSION_REJECTED", "APPLICATION_REJECTED", "DEMOGRAPHICS_REJECTED"] as const;

export async function RejectionAlertLoader({ userId }: { userId: string }) {
  const notification = await prisma.notification.findFirst({
    where: {
      userId,
      acknowledged: false,
      type: { in: [...REJECTION_TYPES] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!notification) return null;

  const data = (notification.data ?? {}) as Record<string, string | undefined>;
  const reference = data.campaignName ?? (data.tiktokHandle ? `@${data.tiktokHandle}` : null);

  const supportUrl = process.env.NEXT_PUBLIC_DISCORD_SUPPORT_URL
    ?? "https://discord.gg/clipprofit";

  return (
    <RejectionAlertDialog
      payload={{
        notificationId: notification.id,
        type: notification.type as "SUBMISSION_REJECTED" | "APPLICATION_REJECTED" | "DEMOGRAPHICS_REJECTED",
        rejectionNote: data.rejectionNote ?? "",
        reference,
        supportUrl,
      }}
    />
  );
}
