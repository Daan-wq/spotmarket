"use client";

import { useState, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatRelativeTime } from "@/lib/i18n-format";

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

export function NotificationsClient({ notifications, unreadCount }: NotificationsClientProps) {
  const locale = useLocale();
  const t = useTranslations("creator.notifications");
  const sharedT = useTranslations("creator.shared");
  const typeLabels = t.raw("types") as Record<string, string>;
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [markedRead, setMarkedRead] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);

  const filtered = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.read && !markedRead.has(n.id));
    }
    return notifications;
  }, [notifications, activeTab, markedRead]);

  const handleMarkAllRead = async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    const previous = markedRead;
    const allIds = new Set(notifications.filter((n) => !n.read).map((n) => n.id));
    setMarkedRead(new Set([...previous, ...allIds]));

    try {
      const res = await fetch("/api/notifications/mark-read", { method: "PATCH" });
      if (!res.ok) throw new Error("mark-read failed");
    } catch {
      setMarkedRead(previous);
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="w-full md:p-6">
      {/* Tabs + Mark All Read */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
            style={{
              background: activeTab === "all" ? "var(--primary)" : "transparent",
              color: activeTab === "all" ? "#FFFFFF" : "var(--text-secondary)",
            }}
          >
            {sharedT("filters.all")}
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
            style={{
              background: activeTab === "unread" ? "var(--primary)" : "transparent",
              color: activeTab === "unread" ? "#FFFFFF" : "var(--text-secondary)",
            }}
          >
            {t("unread")}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="p-2 rounded-md transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
            title={t("markAllRead")}
            aria-label={t("markAllRead")}
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
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("allCaughtUpTitle")}</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            {t("allCaughtUpDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const isUnread = !notification.read && !markedRead.has(notification.id);
            return (
              <div
                key={notification.id}
                className="flex min-w-0 items-start gap-3 rounded-xl p-4 transition-colors"
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
                    {typeLabels[notification.type] ?? notification.type}
                  </p>
                  {(notification.data?.campaignName || notification.data?.tiktokHandle) && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {notification.data.campaignName ?? `@${notification.data.tiktokHandle}`}
                    </p>
                  )}
                  {notification.data?.rejectionNote && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>
                      {t("rejectionReason", { reason: notification.data.rejectionNote })}
                    </p>
                  )}
                  {notification.data?.message && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {notification.data.message}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {formatRelativeTime(notification.createdAt, locale)}
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
