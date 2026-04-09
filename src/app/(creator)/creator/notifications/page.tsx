import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationsClient } from "./_components/notifications-client";

export default async function NotificationsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      data: true,
      read: true,
      createdAt: true,
    },
  });

  const items = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    data: n.data as Record<string, string>,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  const unreadCount = items.filter((n) => !n.read).length;

  return <NotificationsClient notifications={items} unreadCount={unreadCount} />;
}
