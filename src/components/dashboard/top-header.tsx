"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const notificationSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  read: z.boolean(),
  createdAt: z.string().min(1),
});

type NotificationItem = z.infer<typeof notificationSchema>;

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

type TopHeaderProps = {
  title: string;
  displayName?: string;
  followers?: number;
  userId?: string; // supabaseId for realtime
};

const NOTIFICATIONS_KEY = ["notifications"] as const;

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function notifText(n: NotificationItem): string {
  const d = n.data;
  if (n.type === "NEW_FOLLOWER") return `${d.followerName} started following you`;
  if (n.type === "CAMPAIGN_LAUNCHED") return `${d.launcherName} launched a new campaign: ${d.campaignName}`;
  if (n.type === "REVIEW_RECEIVED") {
    const rawRating = Number(d.rating);
    const stars = Number.isFinite(rawRating) ? Math.max(0, Math.min(5, Math.floor(rawRating))) : 0;
    return `${d.reviewerName} left you a ${"★".repeat(stars)} review on ${d.campaignName}`;
  }
  return "New notification";
}

function notifHref(n: NotificationItem): string {
  const d = n.data;
  if (n.type === "NEW_FOLLOWER") return `/profile/${d.followerId}`;
  if (n.type === "CAMPAIGN_LAUNCHED") return `/campaigns/${d.campaignId}`;
  if (n.type === "REVIEW_RECEIVED") return `/campaigns/${d.campaignId}`;
  return "/notifications";
}

export function TopHeader({ title, displayName, followers, userId }: TopHeaderProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async (): Promise<NotificationsResponse> => {
      const r = await fetch("/api/notifications");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as Partial<NotificationsResponse>;
      return {
        notifications: json.notifications ?? [],
        unreadCount: json.unreadCount ?? 0,
      };
    },
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/notifications", { method: "PATCH" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_KEY);
      queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (old) => ({
        notifications: (old?.notifications ?? []).map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, ctx.previous);
    },
  });

  // Subscribe to realtime notifications — push new entries into the cache
  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`user-notifications-${userId}`);
    channel
      .on("broadcast", { event: "notification:new" }, ({ payload }) => {
        const parsed = notificationSchema.safeParse(payload);
        if (!parsed.success) return;
        const incoming = parsed.data;
        queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (old) => ({
          notifications: [incoming, ...(old?.notifications ?? [])].slice(0, 20),
          unreadCount: (old?.unreadCount ?? 0) + 1,
        }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openDropdown() {
    setOpen((wasOpen) => {
      if (!wasOpen && unread > 0) {
        markRead.mutate();
      }
      return !wasOpen;
    });
  }

  return (
    <div
      className="flex items-center justify-between px-6 py-4 shrink-0"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
    >
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          aria-label="Search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Bell with dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={openDropdown}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer relative"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            aria-label="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#ef4444", fontSize: "9px" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 top-10 w-80 rounded-xl shadow-xl z-50 overflow-hidden"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</p>
                <Link href="/notifications" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }} onClick={() => setOpen(false)}>
                  View all
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No notifications yet.</p>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <Link
                      key={n.id}
                      href={notifHref(n)}
                      onClick={() => setOpen(false)}
                      className="flex flex-col gap-0.5 px-4 py-3 hover:opacity-80 transition-opacity"
                      style={{ borderBottom: "1px solid var(--muted)", background: n.read ? undefined : "var(--accent-bg)" }}
                    >
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{notifText(n)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(n.createdAt)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        {displayName && (
          <Link href="/profile" className="flex items-center gap-2.5 pl-2 hover:opacity-80 transition-opacity" style={{ borderLeft: "1px solid var(--border)" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "var(--text-primary)" }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none" style={{ color: "var(--text-primary)" }}>{displayName}</p>
              {followers && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {followers >= 1000 ? `${(followers / 1000).toFixed(0)}K` : followers} followers
                </p>
              )}
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
