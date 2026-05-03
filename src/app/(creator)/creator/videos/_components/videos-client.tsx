"use client";

import { Fragment, useState, useMemo } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { EmptyState } from "@/components/ui/empty-state";

interface UnderperformInfo {
  weakDimensions: string[];
  reason: string | null;
}

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
  underperform?: UnderperformInfo | null;
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

type SortKey = "newest" | "most-views" | "highest-earned";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "most-views", label: "Most views" },
  { key: "highest-earned", label: "Highest earned" },
];

export function VideosClient({ videos, statusCounts }: VideosClientProps) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    const base = activeTab === "ALL" ? videos : videos.filter((v) => v.status === activeTab);
    const sorted = [...base];
    if (sort === "most-views") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "highest-earned") sorted.sort((a, b) => b.earned - a.earned);
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [videos, activeTab, sort]);

  return (
    <div className="p-6 w-full">
      {/* Status Tabs + Sort */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
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
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 rounded-md text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        videos.length === 0 ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            }
            title="No clips yet"
            description="Submit your first clip from a campaign you've joined to start earning."
            primaryCta={{ label: "Browse campaigns", href: "/creator/campaigns" }}
            secondaryCta={{ label: "Connect an account", href: "/creator/connections" }}
          />
        ) : (
          <EmptyState
            title={`No ${activeTab.toLowerCase()} clips`}
            description="Try a different status tab or sort."
          />
        )
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
                <th className="text-right py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((video) => (
                <Fragment key={video.id}>
                <tr
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: video.underperform ? undefined : "1px solid var(--border-default)" }}
                >
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block" style={{ color: "var(--text-secondary)" }}>
                      {relativeTime(video.createdAt)}
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <Link href={`/creator/videos/${video.id}`} className="block">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-1"
                        style={{ background: "rgba(99,102,241,0.12)", color: "var(--primary)" }}
                      >
                        {video.campaignName}
                      </span>
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
                  <td className="py-3 px-2 text-right">
                    {video.postUrl ? (
                      <a
                        href={video.postUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                        style={{ color: "var(--accent-foreground)" }}
                        title="Open post in new tab"
                      >
                        Open
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : null}
                  </td>
                </tr>
                {video.underperform && (
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <td colSpan={7} className="py-2 px-2">
                      <UnderperformNotice info={video.underperform} />
                    </td>
                  </tr>
                )}
                </Fragment>
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

const DIMENSION_LABEL: Record<string, string> = {
  views: "Low view velocity",
  likeRatio: "Low like ratio",
  commentRatio: "Low comment ratio",
  watchTime: "Short watch time",
};

const DIMENSION_HINT: Record<string, string> = {
  views: "Try a stronger hook in the first 2 seconds.",
  likeRatio: "Hook the emotion — surprise, awe, controversy.",
  commentRatio: "End with a question or a take that invites replies.",
  watchTime: "Tighten the edit, drop the slow opening.",
};

function UnderperformNotice({ info }: { info: UnderperformInfo }) {
  const dims = info.weakDimensions.length > 0 ? info.weakDimensions : ["views"];
  return (
    <div
      className="flex gap-3 px-3 py-2.5 rounded-lg"
      style={{
        background: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div className="flex-1">
        <p className="text-xs font-semibold mb-1" style={{ color: "#b45309" }}>
          Why it&apos;s flopping
        </p>
        <div className="flex flex-wrap gap-1.5 mb-1">
          {dims.map((d) => (
            <span
              key={d}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(245, 158, 11, 0.15)", color: "#b45309" }}
            >
              {DIMENSION_LABEL[d] ?? d}
            </span>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {info.reason ??
            dims
              .map((d) => DIMENSION_HINT[d])
              .filter(Boolean)
              .join(" ")}
        </p>
      </div>
    </div>
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
