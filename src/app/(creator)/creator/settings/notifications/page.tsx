import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationChannel } from "@prisma/client";
import { DEFAULT_CHANNELS } from "@/lib/contracts/notifications";
import { NotificationRulesEditor } from "./_components/rules-editor";

export const dynamic = "force-dynamic";

const NOTIFICATION_TYPES = Object.values(NotificationType) as NotificationType[];

export default async function NotificationSettingsPage() {
  const { userId: supabaseId } = await requireAuth("creator");
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true },
  });

  const rules = user
    ? await prisma.notificationRule.findMany({ where: { userId: user.id } })
    : [];
  const ruleMap = new Map(rules.map((r) => [r.type, r]));

  const initial = NOTIFICATION_TYPES.map((type) => {
    const existing = ruleMap.get(type);
    const defaultChannels = (DEFAULT_CHANNELS[type] ?? ["IN_APP"]) as NotificationChannel[];
    return {
      type,
      channels: existing ? (existing.channels as NotificationChannel[]) : defaultChannels,
      enabled: existing?.enabled ?? true,
      isDefault: !existing,
    };
  });

  return (
    <div className="p-6 w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Notifications
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Choose how you want to be notified for each event type
        </p>
      </div>
      <NotificationRulesEditor initialRules={initial} />
    </div>
  );
}
