"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  creatorProfileId: string | null;
  displayName: string;
  avatarUrl: string | null;
  userId: string | null;
  totalEarned: number;
  payoutCount: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  period: string;
  stats: {
    totalPaidOut: number;
    totalPayouts: number;
    uniqueEarners: number;
  };
}

interface TopEarnersProps {
  campaignId?: string;
  limit?: number;
  variant?: "sidebar" | "inline" | "compact";
  showPeriodSelector?: boolean;
  defaultPeriod?: "7d" | "30d" | "all";
  title?: string;
}

const TROPHY_ICONS: Record<number, string> = {
  1: "\uD83E\uDD47",
  2: "\uD83E\uDD48",
  3: "\uD83E\uDD49",
};

export function TopEarners({
  campaignId,
  limit = 10,
  variant = "sidebar",
  showPeriodSelector = true,
  defaultPeriod = "7d",
  title,
}: TopEarnersProps) {
  const [period, setPeriod] = useState<string>(defaultPeriod);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period, limit: String(limit) });
    if (campaignId) params.set("campaignId", campaignId);

    fetch(`/api/leaderboard?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [period, limit, campaignId]);

  const periodLabel = period === "7d" ? "Last 7 Days" : period === "30d" ? "Last 30 Days" : "All Time";

  if (variant === "compact") {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <TrophyIcon />
            {title ?? "Top Earners"}
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{periodLabel}</span>
        </div>
        {loading ? (
          <LoadingSkeleton count={3} />
        ) : data?.leaderboard.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {data?.leaderboard.slice(0, 3).map((entry) => (
              <CompactRow key={entry.rank} entry={entry} />
            ))}
            {data && data.stats.uniqueEarners > 3 && (
              <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
                {data.stats.uniqueEarners} creators earned{campaignId ? " from this campaign" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <TrophyIcon />
            {title ?? "Top Earners"}
          </h3>
          {showPeriodSelector && <PeriodSelector period={period} onChange={setPeriod} />}
        </div>
        <div style={{ background: "var(--bg-elevated)" }}>
          {loading ? (
            <div className="p-5"><LoadingSkeleton count={limit} /></div>
          ) : data?.leaderboard.length === 0 ? (
            <div className="p-5"><EmptyState /></div>
          ) : (
            data?.leaderboard.map((entry, i) => (
              <InlineRow key={entry.rank} entry={entry} isLast={i === data.leaderboard.length - 1} />
            ))
          )}
        </div>
        {data && data.stats.totalPaidOut > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)", background: "var(--bg-primary)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {data.stats.uniqueEarners} creators earned
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              ${data.stats.totalPaidOut.toFixed(2)} total
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default: sidebar variant (like MediaMaxxing earnings page)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
          <TrophyIcon />
          {title ?? "Top Earners"}
        </h3>
        {showPeriodSelector ? (
          <PeriodSelector period={period} onChange={setPeriod} />
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{periodLabel}</span>
        )}
      </div>

      <div className="px-3 py-2">
        {loading ? (
          <LoadingSkeleton count={limit} />
        ) : data?.leaderboard.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0.5">
            {data?.leaderboard.map((entry) => (
              <SidebarRow key={entry.rank} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {data && data.stats.totalPaidOut > 0 && (
        <div
          className="px-5 py-3 text-center"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-primary)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--accent)" }}>
              ${data.stats.totalPaidOut.toFixed(2)}
            </span>{" "}
            earned by {data.stats.uniqueEarners} creators
          </p>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warning-text)" }}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-bold"
      style={{
        width: size,
        height: size,
        background: "var(--accent-bg)",
        color: "var(--accent)",
      }}
    >
      {initials}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const trophy = TROPHY_ICONS[rank];
  if (trophy) {
    return <span className="text-base w-6 text-center">{trophy}</span>;
  }
  return (
    <span
      className="text-xs font-bold w-6 text-center"
      style={{ color: "var(--text-muted)" }}
    >
      #{rank}
    </span>
  );
}

function SidebarRow({ entry }: { entry: LeaderboardEntry }) {
  const content = (
    <div
      className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors"
      style={{ cursor: entry.userId ? "pointer" : "default" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <RankBadge rank={entry.rank} />
      <Avatar url={entry.avatarUrl} name={entry.displayName} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {entry.displayName}
        </p>
      </div>
      <p className="text-sm font-semibold shrink-0" style={{ color: "var(--success)" }}>
        ${entry.totalEarned.toFixed(2)}
      </p>
    </div>
  );

  if (entry.userId) {
    return <Link href={`/profile/${entry.userId}`}>{content}</Link>;
  }
  return content;
}

function CompactRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar url={entry.avatarUrl} name={entry.displayName} size={28} />
      <p className="text-sm flex-1 truncate" style={{ color: "var(--text-primary)" }}>
        {entry.displayName}
      </p>
      <p className="text-sm font-semibold shrink-0" style={{ color: "var(--success)" }}>
        ${entry.totalEarned.toFixed(2)}
      </p>
    </div>
  );
}

function InlineRow({ entry, isLast }: { entry: LeaderboardEntry; isLast: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3"
      style={{ borderBottom: isLast ? undefined : "1px solid var(--bg-secondary)" }}
    >
      <RankBadge rank={entry.rank} />
      <Avatar url={entry.avatarUrl} name={entry.displayName} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {entry.displayName}
        </p>
      </div>
      <p className="text-sm font-semibold shrink-0" style={{ color: "var(--success)" }}>
        ${entry.totalEarned.toFixed(2)}
      </p>
    </div>
  );
}

function PeriodSelector({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  return (
    <select
      value={period}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1 rounded-md border-none outline-none cursor-pointer"
      style={{
        background: "var(--bg-secondary)",
        color: "var(--text-secondary)",
      }}
    >
      <option value="7d">Last 7 Days</option>
      <option value="30d">Last 30 Days</option>
      <option value="all">All Time</option>
    </select>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <div className="w-6 h-4 rounded" style={{ background: "var(--bg-secondary)" }} />
          <div className="w-8 h-8 rounded-full" style={{ background: "var(--bg-secondary)" }} />
          <div className="flex-1 h-4 rounded" style={{ background: "var(--bg-secondary)" }} />
          <div className="w-16 h-4 rounded" style={{ background: "var(--bg-secondary)" }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No earners yet</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        Start a campaign to see the leaderboard
      </p>
    </div>
  );
}
