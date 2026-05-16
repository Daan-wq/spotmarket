import Link from "next/link";
import { KpiCard } from "@/components/admin/kpi-card";
import { DailyViewsChart } from "@/components/stats/DailyViewsChart";
import {
  type CreatorTopStats,
  type CreatorPlatformStats,
  type CreatorConnectionStats,
} from "@/lib/stats/creator";
import { type PlatformSlug, PLATFORM_LABEL } from "@/lib/stats/types";
import { DashboardPlatformGlyph } from "@/lib/stats/platform-icons";
import type { Range } from "@/lib/stats/range";

type DailyPoint = { date: string; views: number; likes: number; comments: number; shares: number };

type ConnectionRow = {
  id: string;
  label: string;
  followerCount: number | null;
  lastSyncedAt: string | null;
  platform: PlatformSlug;
};

interface AllScopeProps {
  kind: "all";
  stats: CreatorTopStats;
  daily: DailyPoint[];
  range: Range;
  connections: ConnectionRow[];
  basePath?: string;
}
interface PlatformScopeProps {
  kind: "platform";
  platform: PlatformSlug;
  stats: CreatorPlatformStats;
  daily: DailyPoint[];
  range: Range;
  basePath?: string;
}
interface AccountScopeProps {
  kind: "account";
  platform: PlatformSlug;
  stats: CreatorConnectionStats;
  daily: DailyPoint[];
  range: Range;
}

export function OverviewSubTab(props: AllScopeProps | PlatformScopeProps | AccountScopeProps) {
  if (props.kind === "all") return <AllScopeView {...props} />;
  if (props.kind === "platform") return <PlatformScopeView {...props} />;
  return <AccountScopeView {...props} />;
}

function AllScopeView({ stats, daily, range, connections, basePath }: AllScopeProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total views"
          value={stats.totalViews.value.toLocaleString()}
          trend={stats.totalViews.delta}
          hint={range.label}
        />
        <KpiCard
          label="Total followers"
          value={stats.totalFollowers.value.toLocaleString()}
          hint="Latest snapshot"
        />
        <KpiCard
          label="Engagement"
          value={stats.totalEngagement.value.toLocaleString()}
          trend={stats.totalEngagement.delta}
          hint="Likes + comments + shares"
        />
        <KpiCard
          label="Earnings"
          value={`$${stats.totalEarnings.value.toFixed(2)}`}
          trend={stats.totalEarnings.delta}
          hint={range.label}
        />
      </div>

      <ConnectionsList connections={connections} rangeKey={range.key} showPlatformTag basePath={basePath} />

      <DailyViewsChart data={daily} />
    </div>
  );
}

function PlatformScopeView({ platform, stats, daily, range, basePath }: PlatformScopeProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Followers" value={stats.followerCount.toLocaleString()} hint="Latest snapshot" />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} trend={stats.viewsDelta} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} trend={stats.engagementDelta} hint="Likes+comments+shares" />
        <KpiCard
          label="Top post"
          value={stats.topPost ? stats.topPost.views.toLocaleString() : "—"}
          hint={stats.topPost ? truncate(stats.topPost.title, 26) : range.label}
        />
      </div>
      <ConnectionsList
        connections={stats.connections.map((c) => ({
          id: c.id,
          label: c.label,
          followerCount: c.followerCount,
          lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
          platform,
        }))}
        rangeKey={range.key}
        basePath={basePath}
      />
      <DailyViewsChart data={daily} />
    </div>
  );
}

function AccountScopeView({ stats, daily, range }: AccountScopeProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Followers"
          value={stats.followerCount?.toLocaleString() ?? "—"}
          hint="Latest snapshot"
        />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} hint="Likes+comments+shares" />
        <KpiCard
          label="Top post"
          value={stats.topPost ? stats.topPost.views.toLocaleString() : "—"}
          hint={stats.topPost ? truncate(stats.topPost.title, 24) : range.label}
        />
      </div>
      <DailyViewsChart data={daily} />
    </div>
  );
}

function ConnectionsList({
  connections,
  rangeKey,
  showPlatformTag = false,
  basePath = "/creator/connections",
}: {
  connections: ConnectionRow[];
  rangeKey: string;
  showPlatformTag?: boolean;
  basePath?: string;
}) {
  if (connections.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No connections yet.
        </p>
      </div>
    );
  }
  const qs = rangeKey !== "30d" ? `&range=${rangeKey}` : "";
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="px-5 py-3 text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
        Connections
      </p>
      <ul style={{ borderTop: "1px solid var(--border)" }}>
        {connections.map((c) => (
          <li
            key={`${c.platform}:${c.id}`}
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`${basePath}?platform=${c.platform}&account=${c.id}${qs}`}
                  className="text-sm font-medium hover:underline truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {c.label}
                </Link>
                {showPlatformTag && (
                  <span
                    aria-label={PLATFORM_LABEL[c.platform]}
                    className="inline-flex shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <DashboardPlatformGlyph platform={c.platform} size={14} />
                  </span>
                )}
              </div>
              {c.lastSyncedAt && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Last synced {new Date(c.lastSyncedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right shrink-0 pl-3">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {c.followerCount?.toLocaleString() ?? "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {c.platform === "yt" ? "subscribers" : "followers"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
