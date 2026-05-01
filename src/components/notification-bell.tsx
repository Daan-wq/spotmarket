"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannel } from "@/lib/realtime";

interface NotificationItem {
  id: string;
  type: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
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

interface Props {
  /** Supabase auth UID — used to subscribe to the user's Realtime channel. */
  supabaseId: string | null;
}

export function NotificationBell({ supabaseId }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems((data.notifications ?? []).slice(0, 8));
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!supabaseId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(realtimeChannel.userNotifications(supabaseId))
      .on("broadcast", { event: "*" }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isOnNotificationsPage = pathname.startsWith("/creator/notifications");

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-read", { method: "PATCH" });
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="flex items-center justify-center rounded-lg transition-colors cursor-pointer relative"
        style={{
          width: 36,
          height: 36,
          color: open || isOnNotificationsPage ? "var(--sidebar-active-text)" : "var(--text-muted)",
          background: open || isOnNotificationsPage ? "var(--sidebar-active-bg)" : "transparent",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "var(--error-text)", color: "#FFFFFF" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border z-50"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-default)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium cursor-pointer"
                style={{ color: "var(--primary)" }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
                You&apos;re all caught up.
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b last:border-b-0 flex items-start gap-2"
                  style={{
                    borderColor: "var(--border-default)",
                    background: n.read ? "transparent" : "var(--accent-bg)",
                  }}
                >
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--primary)" }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </p>
                    {(n.data?.campaignName || n.data?.tiktokHandle) && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                        {n.data.campaignName ?? `@${n.data.tiktokHandle}`}
                      </p>
                    )}
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            href="/creator/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium py-3 border-t"
            style={{ borderColor: "var(--border-default)", color: "var(--primary)" }}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
