"use client";

import { useState, useMemo } from "react";

interface NotificationItem {
  id: string;
  type: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

interface NotificationsClientProps {
  notifications: NotificationItem[];
  unreadCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  CAMPAIGN_LAUNCHED: "New campaign available",
  SUBMISSION_APPROVED: "Submission approved",
  SUBMISSION_REJECTED: "Submission rejected",
  APPLICATION_APPROVED: "Join request approved",
  APPLICATION_REJECTED: "Join request rejected",
  DEMOGRAPHICS_VERIFIED: "Demographics verified",
  DEMOGRAPHICS_REJECTED: "Demographics rejected",
  BIO_VERIFIED: "Bio verified",
  PAYOUT_SENT: "Payout sent",
  REFERRAL_EARNED: "Referral earned",
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsClient({ notifications, unreadCount }: NotificationsClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [markedRead, setMarkedRead] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.read && !markedRead.has(n.id));
    }
    return notifications;
  }, [notifications, activeTab, markedRead]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-read", { method: "PATCH" });
      const allIds = new Set(notifications.filter((n) => !n.read).map((n) => n.id));
      setMarkedRead(allIds);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="p-6 w-full">
      {/* Tabs + Mark All Read */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
            style={{
              background: activeTab === "all" ? "var(--primary)" : "transparent",
              color: activeTab === "all" ? "#FFFFFF" : "var(--text-secondary)",
            }}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
            style={{
              background: activeTab === "unread" ? "var(--primary)" : "transparent",
              color: activeTab === "unread" ? "#FFFFFF" : "var(--text-secondary)",
            }}
          >
            Unread
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="p-2 rounded-md transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
            title="Mark all as read"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
            </svg>
          </button>
        )}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <div className="relative inline-block">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>You&apos;re all caught up</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            New campaign updates, approvals, and payouts will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const isUnread = !notification.read && !markedRead.has(notification.id);
            return (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-4 rounded-xl transition-colors"
                style={{
                  background: isUnread ? "var(--accent-bg)" : "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {isUnread && (
                  <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "var(--primary)" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {TYPE_LABELS[notification.type] ?? notification.type}
                  </p>
                  {(notification.data?.campaignName || notification.data?.tiktokHandle) && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {notification.data.campaignName ?? `@${notification.data.tiktokHandle}`}
                    </p>
                  )}
                  {notification.data?.rejectionNote && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>
                      Reason: {notification.data.rejectionNote}
                    </p>
                  )}
                  {notification.data?.message && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {notification.data.message}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {relativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
