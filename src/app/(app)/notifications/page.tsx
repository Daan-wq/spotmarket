import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function notifText(type: string, data: Record<string, unknown>): string {
  if (type === "NEW_FOLLOWER") return `${data.followerName} started following you`;
  if (type === "CAMPAIGN_LAUNCHED") return `${data.launcherName} launched a new campaign: ${data.campaignName}`;
  if (type === "REVIEW_RECEIVED") return `${data.reviewerName} left you a ${"★".repeat(Number(data.rating))} review on ${data.campaignName}`;
  return "New notification";
}

function notifHref(type: string, data: Record<string, unknown>): string {
  if (type === "NEW_FOLLOWER") return `/profile/${data.followerId}`;
  if (type === "CAMPAIGN_LAUNCHED") return `/campaigns/${data.campaignId}`;
  if (type === "REVIEW_RECEIVED") return `/campaigns/${data.campaignId}`;
  return "/notifications";
}

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id }, select: { id: true } });
  if (!dbUser) redirect("/sign-in");

  const notifications = await prisma.notification.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Mark all read
  await prisma.notification.updateMany({ where: { userId: dbUser.id, read: false }, data: { read: true } });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Notifications</h1>

      {notifications.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notifications yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {notifications.map((n, i) => (
            <Link
              key={n.id}
              href={notifHref(n.type, n.data as Record<string, unknown>)}
              className="flex flex-col gap-0.5 px-5 py-4 hover:opacity-80 transition-opacity"
              style={{
                borderBottom: i < notifications.length - 1 ? "1px solid var(--border)" : undefined,
                background: n.read ? "var(--bg-elevated)" : "var(--accent-bg)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {notifText(n.type, n.data as Record<string, unknown>)}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(new Date(n.createdAt))}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
