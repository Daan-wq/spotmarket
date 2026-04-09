"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";

interface VideoData {
  id: string;
  postUrl: string | null;
  status: string;
  earned: number;
  views: number;
  createdAt: string;
  campaignName: string;
  brandName: string;
  platform: string;
}

interface VideosClientProps {
  videos: VideoData[];
  statusCounts: Record<string, number>;
}

const STATUS_TABS = [
  { key: "PENDING", label: "Pending", icon: "clock", color: "#F59E0B" },
  { key: "FLAGGED", label: "Flagged", icon: "flag", color: "#8B5CF6" },
  { key: "REJECTED", label: "Rejected", icon: "x", color: "#EF4444" },
  { key: "APPROVED", label: "Approved", icon: "check", color: "#22C55E" },
  { key: "ALL", label: "All", icon: "list", color: "#6366F1" },
] as const;


function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "less than a minute ago";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function VideosClient({ videos, statusCounts }: VideosClientProps) {
  const [activeTab, setActiveTab] = useState("ALL");

  const filtered = useMemo(() => {
    if (activeTab === "ALL") return videos;
    return videos.filter((v) => v.status === activeTab);
  }, [videos, activeTab]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = statusCounts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                background: active ? tab.color : "transparent",
                color: active ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              <StatusIcon type={tab.icon} />
              {tab.label}
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: active ? "rgba(255,255,255,0.2)" : "var(--bg-card)",
                  color: active ? "#FFFFFF" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No submissions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Date submitted</th>
                <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Campaign</th>
                <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Money earned</th>
                <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Views</th>
                <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Platform</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((video) => (
                <tr
                  key={video.id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: "1px solid var(--border-default)" }}
                >
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block" style={{ color: "var(--text-secondary)" }}>
                      {relativeTime(video.createdAt)}
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block">
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>{video.campaignName}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>by {video.brandName}</div>
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block">
                      <StatusBadge status={video.status} />
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block" style={{ color: "var(--text-primary)" }}>
                      <span className="flex items-center gap-1">
                        <span style={{ color: "var(--text-muted)" }}>$</span>
                        ${video.earned.toFixed(2)}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
                      </svg>
                      {video.views.toLocaleString()}
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block">
                      <PlatformIcon platform={video.platform} size={28} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pending" },
    FLAGGED: { bg: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", label: "Flagged" },
    REJECTED: { bg: "var(--error-bg)", color: "var(--error-text)", label: "Rejected" },
    APPROVED: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Approved" },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StatusIcon({ type }: { type: string }) {
  const props = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "clock": return <svg {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
    case "flag": return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
    case "x": return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>;
    case "check": return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>;
    case "list": return <svg {...props}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
    default: return null;
  }
}
